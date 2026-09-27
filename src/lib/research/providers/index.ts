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
import {
  extractResearchClaimsStructured,
  structuredExtraction,
} from "@/lib/ai/capabilities";
import { createWebResearchProviderFromEnv } from "@/lib/research/providers/web";

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
      "AI research extraction is not configured (set OPENAI_API_KEY).",
    );
  }
}

/**
 * OpenAI-backed AI analysis (evidence matching + research claim extraction).
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
    request: ResearchClaimExtractionRequest,
  ): Promise<ResearchClaimExtractionResponse> {
    const result = await extractResearchClaimsStructured({
      sourceTitle: request.sourceTitle,
      sourceUrl: request.sourceUrl,
      excerpts: request.excerpts,
      organisationName: request.organisationName,
      candidates: request.candidateAssumptions,
      role: "fast",
    });
    return {
      claims: result.output.claims.map((c) => ({
        claim: c.claim,
        summary: c.summary,
        direction: c.direction,
        candidateAssumptionId: c.candidate_assumption_id,
        relevance: c.relevance,
        reason: c.reason,
        aiConfidence: c.ai_confidence,
        suggestedStrength: c.suggested_strength,
        useful: c.useful,
      })),
      usage: result.usage,
    };
  }
}

/**
 * Stub web research provider.
 */
export class StubWebResearchProvider implements WebResearchProvider {
  readonly providerId = "stub";

  async search(_request: WebSearchRequest): Promise<{
    results: never[];
    usage: UsageStats;
  }> {
    void _request;
    throw new ProviderUnavailableError(
      this.providerId,
      "Web research is not configured.",
    );
  }
}

let aiProviderOverride: AiAnalysisProvider | null = null;
let webProviderOverride: WebResearchProvider | null = null;

export function getAiAnalysisProvider(): AiAnalysisProvider {
  if (aiProviderOverride) return aiProviderOverride;
  if (isOpenAiConfigured()) return new OpenAiAnalysisProvider();
  return new StubAiAnalysisProvider();
}

export function getWebResearchProvider(): WebResearchProvider {
  if (webProviderOverride) return webProviderOverride;
  try {
    return createWebResearchProviderFromEnv();
  } catch {
    return new StubWebResearchProvider();
  }
}

/** Test/override hook. */
export function setAiAnalysisProvider(provider: AiAnalysisProvider): void {
  aiProviderOverride = provider;
}

export function setWebResearchProvider(provider: WebResearchProvider): void {
  webProviderOverride = provider;
}

export function emptyUsageStats(): UsageStats {
  return emptyUsage();
}

export function isWebResearchConfigured(): boolean {
  try {
    createWebResearchProviderFromEnv();
    return true;
  } catch {
    return false;
  }
}

export { createWebResearchProviderFromEnv } from "@/lib/research/providers/web";
