import { RESEARCH_LIMITS } from "@/lib/research/limits";
import { assertSafePublicHttpUrl } from "@/lib/research/url-safety";
import { canonicaliseUrl } from "@/lib/research/url-canonical";
import {
  ProviderUnavailableError,
  type UsageStats,
  type WebFetchRequest,
  type WebFetchResult,
  type WebResearchProvider,
  type WebSearchRequest,
  type WebSearchResult,
} from "@/lib/research/providers/types";

function emptyUsage(): UsageStats {
  return {
    inputTokens: 0,
    outputTokens: 0,
    aiCalls: 0,
    searchCalls: 0,
    estimatedCost: null,
  };
}

/**
 * Tavily web search — set WEB_RESEARCH_PROVIDER=tavily and WEB_RESEARCH_API_KEY.
 */
export class TavilyWebResearchProvider implements WebResearchProvider {
  readonly name = "tavily";

  constructor(private readonly apiKey: string) {}

  async search(request: WebSearchRequest): Promise<{
    results: WebSearchResult[];
    usage: UsageStats;
  }> {
    const maxResults = Math.min(
      request.maxResults ?? RESEARCH_LIMITS.maxSourcesPerQuery,
      RESEARCH_LIMITS.maxSourcesPerQuery,
    );

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        query: request.query,
        max_results: maxResults,
        search_depth: "basic",
        include_answer: false,
      }),
    });

    const payload = (await response.json()) as {
      detail?: { error?: string } | string;
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        published_date?: string | null;
      }>;
    };

    if (!response.ok) {
      const detail =
        typeof payload.detail === "string"
          ? payload.detail
          : payload.detail?.error ?? `Tavily search failed (${response.status})`;
      throw new Error(detail);
    }

    const results: WebSearchResult[] = (payload.results ?? [])
      .filter((r) => r.url && r.title)
      .map((r) => ({
        title: r.title!.trim(),
        url: r.url!.trim(),
        snippet: (r.content ?? "").trim().slice(0, 600),
        publishedAt: r.published_date ?? null,
        publisher: null,
      }));

    return {
      results,
      usage: { ...emptyUsage(), searchCalls: 1 },
    };
  }

  async fetchSource(request: WebFetchRequest): Promise<WebFetchResult> {
    const url = assertSafePublicHttpUrl(request.url);
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "KnomeraResearchBot/1.0 (+internal research)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      throw new Error(`Fetch failed (${response.status}) for ${url.hostname}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/") &&
      !contentType.includes("json") &&
      !contentType.includes("html")
    ) {
      throw new Error("Unsupported content type for research fetch.");
    }
    const raw = await response.text();
    const text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim() ?? null;
    const excerpt = text.slice(0, RESEARCH_LIMITS.maxSourceExcerptChars);
    const canonical = canonicaliseUrl(url.toString()) ?? url.toString();
    return {
      url: url.toString(),
      canonicalUrl: canonical,
      title,
      publisher: url.hostname.replace(/^www\./, ""),
      publishedAt: null,
      excerpt,
      retrievedAt: new Date().toISOString(),
    };
  }
}

export function createWebResearchProviderFromEnv(): WebResearchProvider {
  const provider = process.env.WEB_RESEARCH_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.WEB_RESEARCH_API_KEY?.trim();

  if (provider === "tavily") {
    if (!apiKey) {
      throw new ProviderUnavailableError(
        "tavily",
        "WEB_RESEARCH_API_KEY is required when WEB_RESEARCH_PROVIDER=tavily.",
      );
    }
    return new TavilyWebResearchProvider(apiKey);
  }

  if (provider && provider !== "stub") {
    throw new ProviderUnavailableError(
      provider,
      `Unknown WEB_RESEARCH_PROVIDER "${provider}". Supported: tavily, stub.`,
    );
  }

  // Allow Tavily when only the API key is set.
  if (apiKey && (!provider || provider === "tavily")) {
    return new TavilyWebResearchProvider(apiKey);
  }

  throw new ProviderUnavailableError(
    "web-research",
    "Set WEB_RESEARCH_PROVIDER=tavily and WEB_RESEARCH_API_KEY to enable external research.",
  );
}

export function isWebResearchConfigured(): boolean {
  const provider = process.env.WEB_RESEARCH_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.WEB_RESEARCH_API_KEY?.trim();
  if (provider === "tavily" && apiKey) return true;
  if (apiKey && (!provider || provider === "tavily")) return true;
  return false;
}
