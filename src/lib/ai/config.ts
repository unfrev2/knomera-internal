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
