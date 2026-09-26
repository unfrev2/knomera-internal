import type {
  AiAnalysisProvider,
  EvidenceMatchRequest,
  EvidenceMatchResponse,
  ResearchClaimExtractionRequest,
  ResearchClaimExtractionResponse,
  UsageStats,
  WebResearchProvider,
  WebSearchRequest,
} from "@/lib/research/providers/types";
import { ProviderUnavailableError } from "@/lib/research/providers/types";

const emptyUsage = (): UsageStats => ({
  inputTokens: 0,
  outputTokens: 0,
  aiCalls: 0,
  searchCalls: 0,
  estimatedCost: null,
});

/**
 * Stub AI provider — Stage 1 foundation.
 * Callers must handle ProviderUnavailableError and fall back to manual flows.
 */
export class StubAiAnalysisProvider implements AiAnalysisProvider {
  readonly name = "stub-ai";

  async matchEvidence(
    _request: EvidenceMatchRequest,
  ): Promise<EvidenceMatchResponse> {
    void _request;
    throw new ProviderUnavailableError(
      this.name,
      "AI analysis is not configured yet (Stage 1 foundation only).",
    );
  }

  async extractResearchClaims(
    _request: ResearchClaimExtractionRequest,
  ): Promise<ResearchClaimExtractionResponse> {
    void _request;
    throw new ProviderUnavailableError(
      this.name,
      "AI research extraction is not configured yet (Stage 1 foundation only).",
    );
  }
}

/**
 * Stub web research provider — Stage 1 foundation.
 */
export class StubWebResearchProvider implements WebResearchProvider {
  readonly name = "stub-web";

  async search(_request: WebSearchRequest): Promise<{
    results: never[];
    usage: UsageStats;
  }> {
    void _request;
    throw new ProviderUnavailableError(
      this.name,
      "Web research is not configured yet (Stage 1 foundation only).",
    );
  }
}

let aiProvider: AiAnalysisProvider = new StubAiAnalysisProvider();
let webProvider: WebResearchProvider = new StubWebResearchProvider();

export function getAiAnalysisProvider(): AiAnalysisProvider {
  return aiProvider;
}

export function getWebResearchProvider(): WebResearchProvider {
  return webProvider;
}

/** Test/override hook — production wiring arrives in later stages. */
export function setAiAnalysisProvider(provider: AiAnalysisProvider): void {
  aiProvider = provider;
}

export function setWebResearchProvider(provider: WebResearchProvider): void {
  webProvider = provider;
}

export function emptyUsageStats(): UsageStats {
  return emptyUsage();
}
