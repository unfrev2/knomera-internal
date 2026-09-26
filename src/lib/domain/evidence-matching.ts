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
import { ProviderUnavailableError } from "@/lib/research/providers/types";
import { addUsage, createUsageAccumulator } from "@/lib/research/usage";

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

export type EvidenceMatchingResult = {
  ok: true;
  path: "deterministic" | "fast" | "reasoning";
  analysedDeeper: boolean;
  analysedDeeperReason: string | null;
  candidatesConsidered: number;
  proposals: ProposedEvidenceItem[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    aiCalls: number;
  };
};

export type EvidenceMatchingFailure = {
  ok: false;
  error: string;
  preserveInput: true;
};

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
    suggestedTitle: claim.suggested_title.trim(),
    assumptionId: noMatch ? null : matched!.id,
    assumptionStatement: noMatch ? null : matched!.statement,
    direction: claim.direction,
    matchConfidence: claim.match_confidence,
    reason: claim.reason.trim(),
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

function needsReasoningFallback(claims: EvidenceClaimMatch[]): boolean {
  return claims.some(
    (c) =>
      c.needs_reasoning_fallback ||
      (c.match_confidence === "low" &&
        (c.no_meaningful_match || !c.candidate_assumption_id)) ||
      (c.new_assumption_suggestion != null && c.match_confidence !== "high"),
  );
}

/**
 * Evidence matching pipeline:
 * DB/text search → optional deterministic path → fast AI → reasoning fallback.
 */
export async function matchEvidenceToAssumptions(options: {
  workspaceId: string;
  rawText: string;
  forceReasoning?: boolean;
}): Promise<EvidenceMatchingResult | EvidenceMatchingFailure> {
  const rawText = options.rawText.trim();
  if (!rawText) {
    return {
      ok: false,
      error: "Enter what you learned before finding matching assumptions.",
      preserveInput: true,
    };
  }
  if (rawText.length > MAX_INPUT_LENGTH) {
    return {
      ok: false,
      error: `This text is too long for evidence matching (max ${MAX_INPUT_LENGTH} characters). Paste only the relevant section.`,
      preserveInput: true,
    };
  }

  const candidates = await searchAssumptionCandidates(
    options.workspaceId,
    rawText,
  );

  const dominant = isDominantSingleMatch(candidates, rawText);
  if (dominant && !options.forceReasoning) {
    await recordAiUsageEvent({
      workspaceId: options.workspaceId,
      feature: "evidence_matching",
      provider: "deterministic",
      modelRole: "deterministic",
      success: true,
      fallbackUsed: false,
      inputTokens: 0,
      outputTokens: 0,
    });

    return {
      ok: true,
      path: "deterministic",
      analysedDeeper: false,
      analysedDeeperReason: null,
      candidatesConsidered: candidates.length,
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
    };
  }

  if (!isOpenAiConfigured()) {
    await recordAiUsageEvent({
      workspaceId: options.workspaceId,
      feature: "evidence_matching",
      provider: "openai",
      modelRole: "none",
      success: false,
      error: "OPENAI_API_KEY not configured",
    });
    return {
      ok: false,
      error:
        "We couldn't analyse this evidence automatically. You can still add it manually.",
      preserveInput: true,
    };
  }

  if (candidates.length === 0) {
    // Still allow AI to suggest a new assumption with an empty candidate set —
    // but prefer asking founder to add manually if nothing exists to match.
  }

  const usageAcc = createUsageAccumulator();
  let path: "fast" | "reasoning" = "fast";
  let analysedDeeper = false;
  let analysedDeeperReason: string | null = null;

  try {
    let extraction = options.forceReasoning
      ? await reasoningExtraction({ rawText, candidates })
      : await structuredExtraction({ rawText, candidates, role: "fast" });

    addUsage(usageAcc, extraction.usage);
    await recordAiUsageEvent({
      workspaceId: options.workspaceId,
      feature: "evidence_matching",
      provider: "openai",
      modelRole: extraction.role,
      modelName: extraction.model,
      inputTokens: extraction.usage.inputTokens,
      outputTokens: extraction.usage.outputTokens,
      latencyMs: extraction.latencyMs,
      success: true,
      fallbackUsed: false,
    });

    if (
      !options.forceReasoning &&
      needsReasoningFallback(extraction.output.claims)
    ) {
      const deeper = await reasoningExtraction({ rawText, candidates });
      addUsage(usageAcc, deeper.usage);
      await recordAiUsageEvent({
        workspaceId: options.workspaceId,
        feature: "evidence_matching",
        provider: "openai",
        modelRole: deeper.role,
        modelName: deeper.model,
        inputTokens: deeper.usage.inputTokens,
        outputTokens: deeper.usage.outputTokens,
        latencyMs: deeper.latencyMs,
        success: true,
        fallbackUsed: true,
      });
      extraction = deeper;
      path = "reasoning";
      analysedDeeper = true;
      analysedDeeperReason =
        "Analysed more deeply because no clear assumption match was found.";
    } else if (options.forceReasoning) {
      path = "reasoning";
      analysedDeeper = true;
      analysedDeeperReason = "Analysed more deeply at your request.";
    }

    // Second-pass check for proposed new assumptions.
    const proposals: ProposedEvidenceItem[] = [];
    for (const claim of extraction.output.claims.slice(
      0,
      MATCHING_LIMITS.maxClaimsPerCapture,
    )) {
      const proposal = toProposal(claim, candidates);
      if (
        proposal.noMeaningfulMatch &&
        proposal.newAssumptionSuggestion
      ) {
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
          proposal.reason = `This may relate to an existing assumption: ${near.statement}`;
          proposal.matchConfidence = "medium";
          proposal.included = true;
        }
      }
      proposals.push(proposal);
    }

    return {
      ok: true,
      path,
      analysedDeeper,
      analysedDeeperReason,
      candidatesConsidered: candidates.length,
      proposals,
      usage: {
        inputTokens: usageAcc.inputTokens,
        outputTokens: usageAcc.outputTokens,
        aiCalls: usageAcc.aiCalls,
      },
    };
  } catch (error) {
    const message =
      error instanceof ProviderUnavailableError
        ? "We couldn't analyse this evidence automatically. You can still add it manually."
        : error instanceof Error
          ? `We couldn't analyse this evidence automatically. You can still add it manually.`
          : "We couldn't analyse this evidence automatically. You can still add it manually.";

    await recordAiUsageEvent({
      workspaceId: options.workspaceId,
      feature: "evidence_matching",
      provider: "openai",
      modelRole: "fast",
      success: false,
      error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
    });

    void message;
    return {
      ok: false,
      error: message,
      preserveInput: true,
    };
  }
}
