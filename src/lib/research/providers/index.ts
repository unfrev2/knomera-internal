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
import { isOpenAiConfigured } from "@/lib/ai/config";
import { structuredExtraction } from "@/lib/ai/capabilities";

const emptyUsage = (): UsageStats => ({
  inputTokens: 0,
  outputTokens: 0,
  aiCalls: 0,
  searchCalls: 0,
  estimatedCost: null,
});

/**
 * Stub AI provider — used when OPENAI_API_KEY is unset.
 */
export class StubAiAnalysisProvider implements AiAnalysisProvider {
  readonly name = "stub-ai";

  async matchEvidence(
    _request: EvidenceMatchRequest,
  ): Promise<EvidenceMatchResponse> {
    void _request;
    throw new ProviderUnavailableError(
      this.name,
      "AI analysis is not configured (set OPENAI_API_KEY).",
    );
  }

  async extractResearchClaims(
    _request: ResearchClaimExtractionRequest,
  ): Promise<ResearchClaimExtractionResponse> {
    void _request;
    throw new ProviderUnavailableError(
      this.name,
      "AI research extraction is not configured yet.",
    );
  }
}

/**
 * OpenAI-backed private-data AI analysis (Stage 2).
 * Domain code should prefer matchEvidenceToAssumptions() which adds
 * deterministic retrieval and reasoning fallback.
 */
export class OpenAiAnalysisProvider implements AiAnalysisProvider {
  readonly name = "openai";

  async matchEvidence(
    request: EvidenceMatchRequest,
  ): Promise<EvidenceMatchResponse> {
    const result = await structuredExtraction({
      rawText: request.rawText,
      candidates: request.candidates,
      role: "fast",
    });
    return {
      claims: result.output.claims.map((c) => ({
        claim: c.claim,
        candidateAssumptionId: c.candidate_assumption_id,
        direction: c.direction,
        matchConfidence:
          c.match_confidence === "high"
            ? 0.9
            : c.match_confidence === "medium"
              ? 0.6
              : 0.3,
        reason: c.reason,
        suggestedTitle: c.suggested_title,
        suggestedStrength: c.suggested_strength,
        newAssumptionSuggestion: c.new_assumption_suggestion
          ? {
              statement: c.new_assumption_suggestion.statement,
              category: c.new_assumption_suggestion.category,
              importance: c.new_assumption_suggestion.importance,
              confidence: c.new_assumption_suggestion.confidence,
              nextAction: c.new_assumption_suggestion.next_action,
            }
          : null,
      })),
      usage: result.usage,
    };
  }

  async extractResearchClaims(
    _request: ResearchClaimExtractionRequest,
  ): Promise<ResearchClaimExtractionResponse> {
    void _request;
    throw new ProviderUnavailableError(
      this.name,
      "Research claim extraction arrives in Stage 3.",
    );
  }
}

/**
 * Stub web research provider — Stage 3+.
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
      "Web research is not configured yet (Stage 3+).",
    );
  }
}

let aiProviderOverride: AiAnalysisProvider | null = null;
let webProvider: WebResearchProvider = new StubWebResearchProvider();

export function getAiAnalysisProvider(): AiAnalysisProvider {
  if (aiProviderOverride) return aiProviderOverride;
  if (isOpenAiConfigured()) return new OpenAiAnalysisProvider();
  return new StubAiAnalysisProvider();
}

export function getWebResearchProvider(): WebResearchProvider {
  return webProvider;
}

/** Test/override hook. */
export function setAiAnalysisProvider(provider: AiAnalysisProvider): void {
  aiProviderOverride = provider;
}

export function setWebResearchProvider(provider: WebResearchProvider): void {
  webProvider = provider;
}

export function emptyUsageStats(): UsageStats {
  return emptyUsage();
}
