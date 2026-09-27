import { z } from "zod";
import type { EvidenceDirection } from "@/lib/types";

/**
 * Provider interfaces for AI analysis and web research.
 * Domain code depends on these — not on a specific vendor.
 * Stage 1 ships stubs; real providers land in later stages.
 */

export const usageStatsSchema = z.object({
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
  aiCalls: z.number().int().nonnegative().default(0),
  searchCalls: z.number().int().nonnegative().default(0),
  estimatedCost: z.number().nonnegative().nullable().optional(),
});

export type UsageStats = z.infer<typeof usageStatsSchema>;

export type AssumptionCandidate = {
  id: string;
  statement: string;
  category: string;
  importance: string;
  confidence: string;
};

export type ClaimMatchResult = {
  claim: string;
  candidateAssumptionId: string | null;
  direction: EvidenceDirection;
  matchConfidence: number;
  reason: string;
  suggestedTitle: string;
  suggestedStrength: number;
  newAssumptionSuggestion?: {
    statement: string;
    category: string;
    importance: string;
    confidence: string;
    nextAction: string;
  } | null;
};

export type EvidenceMatchRequest = {
  rawText: string;
  candidates: AssumptionCandidate[];
};

export type EvidenceMatchResponse = {
  claims: ClaimMatchResult[];
  usage: UsageStats;
};

export type ResearchClaimExtractionRequest = {
  sourceTitle: string;
  sourceUrl: string | null;
  excerpts: string[];
  /** Treat page content as untrusted data only. */
  organisationName?: string | null;
  candidateAssumptions: AssumptionCandidate[];
};

export type ExtractedResearchClaim = {
  claim: string;
  summary: string;
  direction: EvidenceDirection;
  candidateAssumptionId: string | null;
  relevance: string;
  reason: string;
  aiConfidence: number;
  suggestedStrength: number;
  useful: boolean;
};

export type ResearchClaimExtractionResponse = {
  claims: ExtractedResearchClaim[];
  usage: UsageStats;
};

export interface AiAnalysisProvider {
  readonly name: string;
  matchEvidence(request: EvidenceMatchRequest): Promise<EvidenceMatchResponse>;
  extractResearchClaims(
    request: ResearchClaimExtractionRequest,
  ): Promise<ResearchClaimExtractionResponse>;
}

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string | null;
  publisher?: string | null;
};

export type WebSearchRequest = {
  query: string;
  maxResults?: number;
  /** Prefer results after this ISO date when the provider supports it. */
  after?: string | null;
};

export type WebFetchRequest = {
  url: string;
};

export type WebFetchResult = {
  url: string;
  canonicalUrl: string;
  title: string | null;
  publisher: string | null;
  publishedAt: string | null;
  excerpt: string;
  retrievedAt: string;
};

export interface WebResearchProvider {
  /**
   * Stable provider identifier recorded on research_runs.search_provider
   * (e.g. "tavily", "openai", "exa"). Not inferred from env key names.
   */
  readonly providerId: string;
  search(request: WebSearchRequest): Promise<{
    results: WebSearchResult[];
    usage: UsageStats;
  }>;
  /** Optional safe fetch; may throw if URL is disallowed (SSRF). */
  fetchSource?(request: WebFetchRequest): Promise<WebFetchResult>;
}

export class ProviderUnavailableError extends Error {
  constructor(provider: string, detail?: string) {
    super(
      detail
        ? `${provider} unavailable: ${detail}`
        : `${provider} is not configured`,
    );
    this.name = "ProviderUnavailableError";
  }
}
