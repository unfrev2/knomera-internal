/**
 * Central AI / matching configuration and thresholds.
 * Domain code requests capabilities — never model product names.
 *
 * Env (server-side only):
 *   OPENAI_API_KEY
 *   OPENAI_FAST_MODEL       — cheap structured classification/extraction
 *   OPENAI_REASONING_MODEL  — stronger fallback for ambiguous cases
 */

export type AiModelRole = "fast" | "reasoning";

export type ReasoningEffort = "none" | "low" | "medium" | "high";

export const MATCHING_LIMITS = {
  /** Max assumptions sent to an evidence-matching AI call. */
  maxAssumptionCandidates: 20,

  /**
   * Deterministic retrieval score (0–1 normalised) at/above which a single
   * short claim can skip the LLM entirely.
   */
  highMatchConfidence: 0.72,

  /**
   * Top candidate must beat the second by at least this margin for the
   * deterministic fast path.
   */
  dominantCandidateMargin: 0.22,

  /**
   * Max characters accepted for AI-assisted capture.
   * Oversize input is rejected with a clear message (not silently truncated).
   */
  maxInputLength: 6000,

  /** Treat inputs under this length as a single simple claim candidate. */
  simpleClaimMaxLength: 280,

  /** Max atomic claims returned from one matching request. */
  maxClaimsPerCapture: 8,

  /**
   * Soft ceiling on completion tokens for structured match JSON.
   * Sized for ≤8 concise claims — not free-form essays.
   */
  maxCompletionTokensFast: 900,

  maxCompletionTokensReasoning: 1200,

  /** Max characters for the user-facing match reason. */
  maxReasonChars: 160,
} as const;

/** Prefer RESEARCH_LIMITS.maxCandidateAssumptions for research; keep in sync. */
export const MAX_ASSUMPTION_CANDIDATES =
  MATCHING_LIMITS.maxAssumptionCandidates;

export const HIGH_MATCH_CONFIDENCE = MATCHING_LIMITS.highMatchConfidence;

/**
 * Match confidence levels that should escalate to the reasoning model
 * when the fast model marks needs_reasoning_fallback or returns low confidence
 * with no strong assumption id.
 */
export const REASONING_FALLBACK_THRESHOLD = "low" as const;

export const MAX_INPUT_LENGTH = MATCHING_LIMITS.maxInputLength;

/** Fast path (e.g. gpt-6-luna): no hidden reasoning. */
export const FAST_REASONING_EFFORT: ReasoningEffort = "none";

/** Reasoning fallback (e.g. gpt-6-sol): low effort unless evals say otherwise. */
export const REASONING_FALLBACK_EFFORT: ReasoningEffort = "low";

export function reasoningEffortForRole(role: AiModelRole): ReasoningEffort {
  return role === "reasoning"
    ? REASONING_FALLBACK_EFFORT
    : FAST_REASONING_EFFORT;
}

export function maxCompletionTokensForRole(role: AiModelRole): number {
  return role === "reasoning"
    ? MATCHING_LIMITS.maxCompletionTokensReasoning
    : MATCHING_LIMITS.maxCompletionTokensFast;
}

export function getOpenAiApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}

export function getOpenAiModel(role: AiModelRole): string {
  if (role === "reasoning") {
    return (
      process.env.OPENAI_REASONING_MODEL?.trim() ||
      process.env.OPENAI_FAST_MODEL?.trim() ||
      "gpt-4.1-mini"
    );
  }
  return process.env.OPENAI_FAST_MODEL?.trim() || "gpt-4.1-mini";
}

export function isOpenAiConfigured(): boolean {
  return Boolean(getOpenAiApiKey());
}
