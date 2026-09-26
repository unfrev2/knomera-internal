import {
  HIGH_MATCH_CONFIDENCE,
  MATCHING_LIMITS,
  MAX_INPUT_LENGTH,
  isOpenAiConfigured,
} from "@/lib/ai/config";
import {
  reasoningExtraction,
  structuredExtraction,
} from "@/lib/ai/capabilities";
import { recordAiUsageEvent } from "@/lib/ai/usage";
import type { EvidenceClaimMatch } from "@/lib/ai/schemas/evidence-match";
import {
  findSimilarAssumptions,
  isDominantSingleMatch,
  searchAssumptionCandidates,
  type RankedAssumptionCandidate,
} from "@/lib/db/assumption-candidates";
import { addUsage, createUsageAccumulator } from "@/lib/research/usage";

const isDev = process.env.NODE_ENV === "development";

export type MatchingLatencyBreakdown = {
  candidateRetrievalMs: number;
  fastModelMs: number | null;
  reasoningFallbackMs: number | null;
  totalMs: number;
  handler: "deterministic" | "fast" | "reasoning";
};

export type MatchingDebugInfo = {
  inputLength: number;
  inputPreview: string;
  forceReasoning: boolean;
  openaiConfigured: boolean;
  thresholds: {
    maxCandidates: number;
    highMatchConfidence: number;
    dominantCandidateMargin: number;
    simpleClaimMaxLength: number;
    maxInputLength: number;
  };
  candidates: Array<{
    id: string;
    statement: string;
    category: string;
    score: number;
  }>;
  dominantCandidate: {
    id: string;
    statement: string;
    score: number;
  } | null;
  usedDeterministicPath: boolean;
  skippedAiBecause?: string;
  latency?: MatchingLatencyBreakdown;
  fastModel?: {
    model: string;
    role: string;
    reasoningEffort: string;
    latencyMs: number;
    claimCount: number;
    triggeredReasoningFallback: boolean;
  };
  reasoningModel?: {
    model: string;
    role: string;
    reasoningEffort: string;
    latencyMs: number;
    claimCount: number;
  };
  aiClaims?: EvidenceClaimMatch[];
  newAssumptionSecondPass?: Array<{
    proposedStatement: string;
    redirectedToExisting: string | null;
  }>;
  finalPath?: "deterministic" | "fast" | "reasoning";
  error?: string;
};

export type ProposedEvidenceItem = {
  claim: string;
  suggestedTitle: string;
  assumptionId: string | null;
  assumptionStatement: string | null;
  direction: "supports" | "challenges" | "neutral";
  matchConfidence: "high" | "medium" | "low";
  reason: string;
  suggestedStrength: number;
  noMeaningfulMatch: boolean;
  newAssumptionSuggestion: {
    statement: string;
    category: string;
    importance: string;
    confidence: string;
    nextAction: string;
    reasonDistinct: string;
  } | null;
  included: boolean;
};

export type MatchingCandidateOption = {
  id: string;
  statement: string;
  category: string;
  score: number;
};

export type EvidenceMatchingResult = {
  ok: true;
  path: "deterministic" | "fast" | "reasoning";
  analysedDeeper: boolean;
  analysedDeeperReason: string | null;
  candidatesConsidered: number;
  /** Ranked shortlist shown in the review UI for one-click selection. */
  candidateAssumptions: MatchingCandidateOption[];
  proposals: ProposedEvidenceItem[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    aiCalls: number;
  };
  latency: MatchingLatencyBreakdown;
  /** Present only in development — for browser/server console inspection. */
  debug?: MatchingDebugInfo;
};

export type EvidenceMatchingFailure = {
  ok: false;
  error: string;
  preserveInput: true;
  latency?: MatchingLatencyBreakdown;
  debug?: MatchingDebugInfo;
};

function clipReason(reason: string): string {
  const trimmed = reason.trim();
  if (trimmed.length <= MATCHING_LIMITS.maxReasonChars) return trimmed;
  return `${trimmed.slice(0, MATCHING_LIMITS.maxReasonChars - 1)}…`;
}

function debugBase(
  rawText: string,
  forceReasoning: boolean,
  candidates: RankedAssumptionCandidate[],
  dominant: RankedAssumptionCandidate | null,
): MatchingDebugInfo {
  return {
    inputLength: rawText.length,
    inputPreview:
      rawText.length > 200 ? `${rawText.slice(0, 200)}…` : rawText,
    forceReasoning,
    openaiConfigured: isOpenAiConfigured(),
    thresholds: {
      maxCandidates: MATCHING_LIMITS.maxAssumptionCandidates,
      highMatchConfidence: HIGH_MATCH_CONFIDENCE,
      dominantCandidateMargin: MATCHING_LIMITS.dominantCandidateMargin,
      simpleClaimMaxLength: MATCHING_LIMITS.simpleClaimMaxLength,
      maxInputLength: MAX_INPUT_LENGTH,
    },
    candidates: candidates.map((c) => ({
      id: c.id,
      statement: c.statement,
      category: c.category,
      score: Number(c.score.toFixed(4)),
    })),
    dominantCandidate: dominant
      ? {
          id: dominant.id,
          statement: dominant.statement,
          score: Number(dominant.score.toFixed(4)),
        }
      : null,
    usedDeterministicPath: false,
  };
}

function logMatchingDebug(debug: MatchingDebugInfo) {
  if (!isDev) return;
  console.info("[evidence-matching]", debug);
}

function toCandidateOptions(
  candidates: RankedAssumptionCandidate[],
): MatchingCandidateOption[] {
  return candidates.map((c) => ({
    id: c.id,
    statement: c.statement,
    category: c.category,
    score: Number(c.score.toFixed(4)),
  }));
}

function toProposal(
  claim: EvidenceClaimMatch,
  candidates: RankedAssumptionCandidate[],
): ProposedEvidenceItem {
  const matched = claim.candidate_assumption_id
    ? candidates.find((c) => c.id === claim.candidate_assumption_id)
    : null;
  const noMatch =
    claim.no_meaningful_match || !claim.candidate_assumption_id || !matched;

  return {
    claim: claim.claim.trim(),
    suggestedTitle: claim.suggested_title.trim().slice(0, 120),
    assumptionId: noMatch ? null : matched!.id,
    assumptionStatement: noMatch ? null : matched!.statement,
    direction: claim.direction,
    matchConfidence: claim.match_confidence,
    reason: clipReason(claim.reason),
    suggestedStrength: claim.suggested_strength,
    noMeaningfulMatch: noMatch,
    newAssumptionSuggestion: claim.new_assumption_suggestion
      ? {
          statement: claim.new_assumption_suggestion.statement,
          category: claim.new_assumption_suggestion.category,
          importance: claim.new_assumption_suggestion.importance,
          confidence: claim.new_assumption_suggestion.confidence,
          nextAction: claim.new_assumption_suggestion.next_action,
          reasonDistinct: claim.new_assumption_suggestion.reason_distinct,
        }
      : null,
    included: !noMatch || Boolean(claim.new_assumption_suggestion),
  };
}

/**
 * Escalate to Sol only when Luna result is genuinely ambiguous —
 * not for every new-assumption suggestion.
 */
function needsReasoningFallback(claims: EvidenceClaimMatch[]): boolean {
  return claims.some(
    (c) =>
      c.needs_reasoning_fallback ||
      (c.match_confidence === "low" &&
        (c.no_meaningful_match || !c.candidate_assumption_id)),
  );
}

/**
 * Evidence matching pipeline:
 * DB/text search → optional deterministic path → fast AI → reasoning fallback.
 * Luna and Sol are never called in parallel.
 */
export async function matchEvidenceToAssumptions(options: {
  workspaceId: string;
  rawText: string;
  forceReasoning?: boolean;
}): Promise<EvidenceMatchingResult | EvidenceMatchingFailure> {
  const pipelineStarted = Date.now();
  const rawText = options.rawText.trim();
  const forceReasoning = options.forceReasoning ?? false;

  if (!rawText) {
    const failure: EvidenceMatchingFailure = {
      ok: false,
      error: "Enter what you learned before finding matching assumptions.",
      preserveInput: true,
    };
    if (isDev) {
      failure.debug = {
        inputLength: 0,
        inputPreview: "",
        forceReasoning,
        openaiConfigured: isOpenAiConfigured(),
        thresholds: {
          maxCandidates: MATCHING_LIMITS.maxAssumptionCandidates,
          highMatchConfidence: HIGH_MATCH_CONFIDENCE,
          dominantCandidateMargin: MATCHING_LIMITS.dominantCandidateMargin,
          simpleClaimMaxLength: MATCHING_LIMITS.simpleClaimMaxLength,
          maxInputLength: MAX_INPUT_LENGTH,
        },
        candidates: [],
        dominantCandidate: null,
        usedDeterministicPath: false,
        error: failure.error,
      };
      logMatchingDebug(failure.debug);
    }
    return failure;
  }
  if (rawText.length > MAX_INPUT_LENGTH) {
    const failure: EvidenceMatchingFailure = {
      ok: false,
      error: `This text is too long for evidence matching (max ${MAX_INPUT_LENGTH} characters). Paste only the relevant section.`,
      preserveInput: true,
    };
    if (isDev) {
      failure.debug = {
        ...debugBase(rawText, forceReasoning, [], null),
        error: failure.error,
      };
      logMatchingDebug(failure.debug);
    }
    return failure;
  }

  const candidateStarted = Date.now();
  const candidates = await searchAssumptionCandidates(
    options.workspaceId,
    rawText,
  );
  const candidateRetrievalMs = Date.now() - candidateStarted;

  const dominant = isDominantSingleMatch(candidates, rawText);
  const debug = isDev
    ? debugBase(rawText, forceReasoning, candidates, dominant)
    : null;

  if (dominant && !forceReasoning) {
    const latency: MatchingLatencyBreakdown = {
      candidateRetrievalMs,
      fastModelMs: null,
      reasoningFallbackMs: null,
      totalMs: Date.now() - pipelineStarted,
      handler: "deterministic",
    };

    await recordAiUsageEvent({
      workspaceId: options.workspaceId,
      feature: "evidence_matching",
      provider: "deterministic",
      modelRole: "deterministic",
      success: true,
      fallbackUsed: false,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: latency.totalMs,
      handlerPath: "deterministic",
      latencyCandidateMs: candidateRetrievalMs,
      latencyFastMs: null,
      latencyReasoningMs: null,
    });

    const result: EvidenceMatchingResult = {
      ok: true,
      path: "deterministic",
      analysedDeeper: false,
      analysedDeeperReason: null,
      candidatesConsidered: candidates.length,
      candidateAssumptions: toCandidateOptions(candidates),
      proposals: [
        {
          claim: rawText,
          suggestedTitle:
            rawText.length > 80 ? `${rawText.slice(0, 77)}…` : rawText,
          assumptionId: dominant.id,
          assumptionStatement: dominant.statement,
          direction: "supports",
          matchConfidence: "high",
          reason:
            "Strong text match to an existing assumption; confirm direction if needed.",
          suggestedStrength: 2,
          noMeaningfulMatch: false,
          newAssumptionSuggestion: null,
          included: true,
        },
      ],
      usage: { inputTokens: 0, outputTokens: 0, aiCalls: 0 },
      latency,
    };

    if (debug) {
      debug.usedDeterministicPath = true;
      debug.finalPath = "deterministic";
      debug.latency = latency;
      debug.skippedAiBecause =
        "Dominant single-claim text match above highMatchConfidence threshold";
      result.debug = debug;
      logMatchingDebug(debug);
    }

    return result;
  }

  if (!isOpenAiConfigured()) {
    await recordAiUsageEvent({
      workspaceId: options.workspaceId,
      feature: "evidence_matching",
      provider: "openai",
      modelRole: "none",
      success: false,
      error: "OPENAI_API_KEY not configured",
      handlerPath: "none",
      latencyCandidateMs: candidateRetrievalMs,
    });
    const failure: EvidenceMatchingFailure = {
      ok: false,
      error:
        "We couldn't analyse this evidence automatically. You can still add it manually.",
      preserveInput: true,
      latency: {
        candidateRetrievalMs,
        fastModelMs: null,
        reasoningFallbackMs: null,
        totalMs: Date.now() - pipelineStarted,
        handler: "fast",
      },
    };
    if (debug) {
      debug.skippedAiBecause = "OPENAI_API_KEY not configured";
      debug.error = failure.error;
      failure.debug = debug;
      logMatchingDebug(debug);
    }
    return failure;
  }

  const usageAcc = createUsageAccumulator();
  let path: "fast" | "reasoning" = "fast";
  let analysedDeeper = false;
  let analysedDeeperReason: string | null = null;
  let latencyFastMs: number | null = null;
  let latencyReasoningMs: number | null = null;

  try {
    // Sequential only: Sol runs after Luna when ambiguous, never in parallel.
    let extraction = forceReasoning
      ? await reasoningExtraction({ rawText, candidates })
      : await structuredExtraction({ rawText, candidates, role: "fast" });

    if (forceReasoning) {
      latencyReasoningMs = extraction.latencyMs;
    } else {
      latencyFastMs = extraction.latencyMs;
    }

    addUsage(usageAcc, extraction.usage);

    if (debug) {
      if (forceReasoning) {
        debug.reasoningModel = {
          model: extraction.model,
          role: extraction.role,
          reasoningEffort: extraction.reasoningEffort,
          latencyMs: extraction.latencyMs,
          claimCount: extraction.output.claims.length,
        };
      } else {
        debug.fastModel = {
          model: extraction.model,
          role: extraction.role,
          reasoningEffort: extraction.reasoningEffort,
          latencyMs: extraction.latencyMs,
          claimCount: extraction.output.claims.length,
          triggeredReasoningFallback: false,
        };
      }
    }

    const shouldFallback =
      !forceReasoning && needsReasoningFallback(extraction.output.claims);

    if (debug?.fastModel) {
      debug.fastModel.triggeredReasoningFallback = shouldFallback;
    }

    if (shouldFallback) {
      const deeper = await reasoningExtraction({ rawText, candidates });
      addUsage(usageAcc, deeper.usage);
      latencyReasoningMs = deeper.latencyMs;
      extraction = deeper;
      path = "reasoning";
      analysedDeeper = true;
      analysedDeeperReason =
        "Analysed more deeply because the first pass was ambiguous.";
      if (debug) {
        debug.reasoningModel = {
          model: deeper.model,
          role: deeper.role,
          reasoningEffort: deeper.reasoningEffort,
          latencyMs: deeper.latencyMs,
          claimCount: deeper.output.claims.length,
        };
      }
    } else if (forceReasoning) {
      path = "reasoning";
      analysedDeeper = true;
      analysedDeeperReason = "Analysed more deeply at your request.";
    }

    if (debug) {
      debug.aiClaims = extraction.output.claims;
      debug.newAssumptionSecondPass = [];
    }

    const proposals: ProposedEvidenceItem[] = [];
    for (const claim of extraction.output.claims.slice(
      0,
      MATCHING_LIMITS.maxClaimsPerCapture,
    )) {
      const proposal = toProposal(claim, candidates);
      if (proposal.noMeaningfulMatch && proposal.newAssumptionSuggestion) {
        const similar = await findSimilarAssumptions(
          options.workspaceId,
          proposal.newAssumptionSuggestion.statement,
          3,
        );
        const near = similar.find((s) => s.score >= HIGH_MATCH_CONFIDENCE);
        if (near) {
          proposal.assumptionId = near.id;
          proposal.assumptionStatement = near.statement;
          proposal.noMeaningfulMatch = false;
          proposal.newAssumptionSuggestion = null;
          proposal.reason = clipReason(
            `This may relate to an existing assumption: ${near.statement}`,
          );
          proposal.matchConfidence = "medium";
          proposal.included = true;
          debug?.newAssumptionSecondPass?.push({
            proposedStatement: claim.new_assumption_suggestion!.statement,
            redirectedToExisting: near.statement,
          });
        } else {
          debug?.newAssumptionSecondPass?.push({
            proposedStatement: proposal.newAssumptionSuggestion.statement,
            redirectedToExisting: null,
          });
        }
      }
      proposals.push(proposal);
    }

    const latency: MatchingLatencyBreakdown = {
      candidateRetrievalMs,
      fastModelMs: latencyFastMs,
      reasoningFallbackMs: latencyReasoningMs,
      totalMs: Date.now() - pipelineStarted,
      handler: path,
    };

    await recordAiUsageEvent({
      workspaceId: options.workspaceId,
      feature: "evidence_matching",
      provider: "openai",
      modelRole: path === "reasoning" ? "reasoning" : "fast",
      modelName: extraction.model,
      inputTokens: usageAcc.inputTokens,
      outputTokens: usageAcc.outputTokens,
      latencyMs: latency.totalMs,
      success: true,
      fallbackUsed: analysedDeeper && !forceReasoning,
      handlerPath: path,
      latencyCandidateMs: candidateRetrievalMs,
      latencyFastMs,
      latencyReasoningMs,
      reasoningEffort: extraction.reasoningEffort,
    });

    const result: EvidenceMatchingResult = {
      ok: true,
      path,
      analysedDeeper,
      analysedDeeperReason,
      candidatesConsidered: candidates.length,
      candidateAssumptions: toCandidateOptions(candidates),
      proposals,
      usage: {
        inputTokens: usageAcc.inputTokens,
        outputTokens: usageAcc.outputTokens,
        aiCalls: usageAcc.aiCalls,
      },
      latency,
    };

    if (debug) {
      debug.finalPath = path;
      debug.latency = latency;
      result.debug = debug;
      logMatchingDebug(debug);
    }

    return result;
  } catch (error) {
    const message =
      "We couldn't analyse this evidence automatically. You can still add it manually.";

    await recordAiUsageEvent({
      workspaceId: options.workspaceId,
      feature: "evidence_matching",
      provider: "openai",
      modelRole: forceReasoning ? "reasoning" : "fast",
      success: false,
      error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
      handlerPath: forceReasoning ? "reasoning" : "fast",
      latencyCandidateMs: candidateRetrievalMs,
      latencyFastMs,
      latencyReasoningMs,
    });

    const failure: EvidenceMatchingFailure = {
      ok: false,
      error: message,
      preserveInput: true,
      latency: {
        candidateRetrievalMs,
        fastModelMs: latencyFastMs,
        reasoningFallbackMs: latencyReasoningMs,
        totalMs: Date.now() - pipelineStarted,
        handler: forceReasoning ? "reasoning" : "fast",
      },
    };
    if (debug) {
      debug.error =
        error instanceof Error ? error.message : "unknown matching error";
      debug.latency = failure.latency;
      failure.debug = debug;
      logMatchingDebug(debug);
    }
    return failure;
  }
}
