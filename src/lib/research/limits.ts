/**
 * Centralised cost/safety limits for AI research and evidence matching.
 * Guardrails — not product truths. Adjust here only.
 *
 * Stage 1: constants + docs only. Consumers arrive in later stages.
 */

export const RESEARCH_LIMITS = {
  /** Max assumptions sent to an evidence-matching AI call. */
  maxCandidateAssumptions: 12,

  /** Max assumptions researched in one scheduled market sweep. */
  maxAssumptionsPerMarketSweep: 25,

  /** Max useful sources retained per research query. */
  maxSourcesPerQuery: 5,

  /** Max new sources analysed per competitor in a normal weekly sweep. */
  maxNewSourcesPerCompetitor: 5,

  /** Max external search calls in one automatic run. */
  maxSearchesPerAutomaticRun: 40,

  /** Soft cap on AI calls within one research run. */
  maxAiCallsPerRun: 30,

  /** Approximate max excerpt chars sent to the model per source. */
  maxSourceExcerptChars: 4000,
} as const;

export type ResearchLimits = typeof RESEARCH_LIMITS;
