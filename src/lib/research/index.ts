export {
  StubAiAnalysisProvider,
  StubWebResearchProvider,
  getAiAnalysisProvider,
  getWebResearchProvider,
  setAiAnalysisProvider,
  setWebResearchProvider,
  emptyUsageStats,
} from "@/lib/research/providers/index";

export { ProviderUnavailableError } from "@/lib/research/providers/types";
export type {
  AiAnalysisProvider,
  WebResearchProvider,
  UsageStats,
  EvidenceMatchRequest,
  EvidenceMatchResponse,
  ClaimMatchResult,
  AssumptionCandidate,
} from "@/lib/research/providers/types";

export { RESEARCH_LIMITS } from "@/lib/research/limits";
export { canonicaliseUrl } from "@/lib/research/url-canonical";
export {
  createUsageAccumulator,
  addUsage,
  usageToRunFields,
} from "@/lib/research/usage";

export {
  MATCHING_LIMITS,
  MAX_ASSUMPTION_CANDIDATES,
  HIGH_MATCH_CONFIDENCE,
  REASONING_FALLBACK_THRESHOLD,
  MAX_INPUT_LENGTH,
  isOpenAiConfigured,
} from "@/lib/ai/config";
export { matchEvidenceToAssumptions } from "@/lib/domain/evidence-matching";
