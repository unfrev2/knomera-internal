import { listAssumptions } from "@/lib/db/assumptions";
import { listOrganisations } from "@/lib/db/organisations";
import {
  completeResearchRun,
  createResearchRun,
  markResearchRunRunning,
  type UpdateResearchRunUsageInput,
} from "@/lib/db/research";
import {
  findExistingSourceByCanonicalUrl,
  insertPendingResearchFinding,
  listAnalysedCanonicalUrls,
} from "@/lib/db/research-findings";
import { searchAssumptionCandidates } from "@/lib/db/assumption-candidates";
import { AI_ACTOR_ID } from "@/lib/domain/actors";
import {
  assumptionFocusedCompetitorQuery,
  competitorQueriesForOrganisation,
  marketQueriesForAssumption,
} from "@/lib/domain/research-queries";
import { RESEARCH_LIMITS } from "@/lib/research/limits";
import {
  getAiAnalysisProvider,
  getWebResearchProvider,
  isWebResearchConfigured,
} from "@/lib/research/providers/index";
import { ProviderUnavailableError } from "@/lib/research/providers/types";
import type { AssumptionCandidate } from "@/lib/research/providers/types";
import {
  addUsage,
  createUsageAccumulator,
  usageToRunFields,
} from "@/lib/research/usage";
import { canonicaliseUrl } from "@/lib/research/url-canonical";
import type {
  Assumption,
  Organisation,
  ResearchRun,
  ResearchType,
} from "@/lib/types";

export type ResearchRunResult = {
  run: ResearchRun;
  findingsCreated: number;
  message: string;
};

function toCandidates(
  rows: Array<{
    id: string;
    statement: string;
    category: string;
    importance: string;
    confidence: string;
  }>,
): AssumptionCandidate[] {
  return rows.map((r) => ({
    id: r.id,
    statement: r.statement,
    category: r.category,
    importance: r.importance,
    confidence: r.confidence,
  }));
}

/** Bounded market eligibility for manual sweeps (full eligibility lands in Stage 5). */
export function selectAssumptionsForManualMarket(
  assumptions: Assumption[],
  limit: number = RESEARCH_LIMITS.maxAssumptionsPerMarketSweep,
): Assumption[] {
  const importanceRank: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const confidenceRank: Record<string, number> = {
    low: 0,
    medium: 1,
    high: 2,
    proven: 3,
  };
  const statusRank: Record<string, number> = {
    challenged: 0,
    testing: 1,
    untested: 2,
    supported: 3,
    disproved: 4,
  };

  return [...assumptions]
    .filter((a) => a.status !== "disproved" && a.confidence !== "proven")
    .sort(
      (a, b) =>
        (importanceRank[a.importance] ?? 9) -
          (importanceRank[b.importance] ?? 9) ||
        (confidenceRank[a.confidence] ?? 9) -
          (confidenceRank[b.confidence] ?? 9) ||
        (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9) ||
        a.statement.localeCompare(b.statement),
    )
    .slice(0, limit);
}

async function finishRun(
  workspaceId: string,
  runId: string,
  status: "completed" | "partial" | "failed",
  usage: UpdateResearchRunUsageInput,
): Promise<ResearchRun> {
  const run = await completeResearchRun(workspaceId, runId, status, usage);
  if (!run) throw new Error("Could not complete research run.");
  return run;
}

type SourceCandidate = {
  title: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
  organisationId: string | null;
  organisationName: string | null;
};

async function analyseSourcesAndCreateFindings(options: {
  workspaceId: string;
  runId: string;
  researchType: ResearchType;
  sources: SourceCandidate[];
  candidateAssumptions: AssumptionCandidate[];
  usageAcc: ReturnType<typeof createUsageAccumulator>;
  maxAiCalls: number;
}): Promise<number> {
  const ai = getAiAnalysisProvider();
  const web = getWebResearchProvider();
  let findingsCreated = 0;
  let aiCalls = 0;

  for (const source of options.sources) {
    if (aiCalls >= options.maxAiCalls) break;

    const canonical = canonicaliseUrl(source.url);
    if (!canonical) continue;

    let excerpt = source.snippet;
    if (web.fetchSource) {
      try {
        const fetched = await web.fetchSource({ url: source.url });
        excerpt = fetched.excerpt || excerpt;
        addUsage(options.usageAcc, { searchCalls: 0 });
      } catch {
        // Keep snippet if fetch fails — still useful for extraction.
      }
    }

    const extraction = await ai.extractResearchClaims({
      sourceTitle: source.title,
      sourceUrl: source.url,
      excerpts: [excerpt.slice(0, RESEARCH_LIMITS.maxSourceExcerptChars)],
      organisationName: source.organisationName,
      candidateAssumptions: options.candidateAssumptions,
    });
    addUsage(options.usageAcc, extraction.usage);
    aiCalls += 1;

    for (const claim of extraction.claims) {
      if (!claim.useful) continue;
      if (!claim.candidateAssumptionId) continue;
      const matched = options.candidateAssumptions.find(
        (c) => c.id === claim.candidateAssumptionId,
      );
      if (!matched) continue;

      await insertPendingResearchFinding(options.workspaceId, AI_ACTOR_ID, {
        research_run_id: options.runId,
        research_type: options.researchType,
        organisation_id: source.organisationId,
        claim: claim.claim,
        summary: claim.summary,
        ai_confidence: claim.aiConfidence,
        suggested_strength: claim.suggestedStrength,
        assumptions: [
          {
            assumption_id: matched.id,
            direction: claim.direction,
            relevance: claim.relevance,
            reason: claim.reason,
          },
        ],
        sources: [
          {
            title: source.title,
            url: source.url,
            published_at: source.publishedAt,
            description: source.snippet.slice(0, 280) || null,
          },
        ],
      });
      findingsCreated += 1;
    }
  }

  return findingsCreated;
}

/**
 * Manual competitor sweep — competitor-first, bounded.
 * Does not schedule weekly automation (Stage 4).
 */
export async function runManualCompetitorSweep(options: {
  workspaceId: string;
  triggeredBy: string;
  assumptionId?: string | null;
}): Promise<ResearchRunResult> {
  if (!isWebResearchConfigured()) {
    throw new ProviderUnavailableError(
      "web-research",
      "Configure WEB_RESEARCH_PROVIDER=tavily and WEB_RESEARCH_API_KEY first.",
    );
  }

  const run = await createResearchRun(options.workspaceId, {
    research_type: "competitor",
    trigger_type: "manual",
    triggered_by: options.triggeredBy,
    notes: options.assumptionId
      ? `Manual competitor sweep focused on assumption ${options.assumptionId}`
      : "Manual competitor sweep",
  });
  await markResearchRunRunning(options.workspaceId, run.id);

  const usageAcc = createUsageAccumulator();
  let findingsCreated = 0;
  let sourcesExamined = 0;
  let searchQueries = 0;

  try {
    const [orgs, assumptions, analysed] = await Promise.all([
      listOrganisations(options.workspaceId),
      listAssumptions(options.workspaceId),
      listAnalysedCanonicalUrls(options.workspaceId),
    ]);

    const competitors = orgs.filter((o) => o.organisation_type === "competitor");
    if (competitors.length === 0) {
      const completed = await finishRun(options.workspaceId, run.id, "completed", {
        ...usageToRunFields(usageAcc),
        assumptions_considered: 0,
        sources_examined: 0,
        findings_created: 0,
        search_queries_used: 0,
        notes:
          "No competitor organisations found. Add organisations with type Competitor, then re-run.",
      });
      return {
        run: completed,
        findingsCreated: 0,
        message: "No competitors to research yet.",
      };
    }

    const focusAssumption = options.assumptionId
      ? assumptions.find((a) => a.id === options.assumptionId) ?? null
      : null;

    const candidateAssumptions = toCandidates(
      focusAssumption
        ? [focusAssumption]
        : selectAssumptionsForManualMarket(assumptions, 40),
    );

    const web = getWebResearchProvider();
    const sourceCandidates: SourceCandidate[] = [];

    for (const competitor of competitors) {
      const queries = focusAssumption
        ? [assumptionFocusedCompetitorQuery(focusAssumption, competitor.name)]
        : competitorQueriesForOrganisation({
            name: competitor.name,
            website: competitor.website,
          }).slice(0, 2);

      let newForCompetitor = 0;
      for (const query of queries) {
        if (searchQueries >= RESEARCH_LIMITS.maxSearchesPerAutomaticRun) break;
        if (newForCompetitor >= RESEARCH_LIMITS.maxNewSourcesPerCompetitor) break;

        const search = await web.search({
          query,
          maxResults: RESEARCH_LIMITS.maxSourcesPerQuery,
        });
        addUsage(usageAcc, search.usage);
        searchQueries += 1;

        for (const result of search.results) {
          const canonical = canonicaliseUrl(result.url);
          if (!canonical) continue;
          if (analysed.has(canonical)) continue;
          const existing = await findExistingSourceByCanonicalUrl(
            options.workspaceId,
            result.url,
          );
          if (existing) continue;

          sourceCandidates.push({
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            publishedAt: result.publishedAt ?? null,
            organisationId: competitor.id,
            organisationName: competitor.name,
          });
          analysed.add(canonical);
          newForCompetitor += 1;
          sourcesExamined += 1;
          if (newForCompetitor >= RESEARCH_LIMITS.maxNewSourcesPerCompetitor) {
            break;
          }
        }
      }
    }

    findingsCreated = await analyseSourcesAndCreateFindings({
      workspaceId: options.workspaceId,
      runId: run.id,
      researchType: "competitor",
      sources: sourceCandidates,
      candidateAssumptions,
      usageAcc,
      maxAiCalls: RESEARCH_LIMITS.maxAiCallsPerRun,
    });

    const notes =
      findingsCreated === 0
        ? sourcesExamined === 0
          ? "No new public sources found for competitors (nothing found is not evidence)."
          : "Sources examined but no material assumption-linked findings."
        : `Created ${findingsCreated} pending finding(s) for review.`;

    const completed = await finishRun(
      options.workspaceId,
      run.id,
      findingsCreated > 0 ? "completed" : "completed",
      {
        ...usageToRunFields(usageAcc),
        assumptions_considered: candidateAssumptions.length,
        sources_examined: sourcesExamined,
        findings_created: findingsCreated,
        search_queries_used: searchQueries,
        notes,
      },
    );

    return { run: completed, findingsCreated, message: notes };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 500) : "Research failed";
    const failed = await finishRun(options.workspaceId, run.id, "failed", {
      ...usageToRunFields(usageAcc),
      findings_created: findingsCreated,
      search_queries_used: searchQueries,
      sources_examined: sourcesExamined,
      error: message,
    });
    return { run: failed, findingsCreated, message };
  }
}

/**
 * Manual market sweep — assumption-first, bounded eligibility.
 */
export async function runManualMarketSweep(options: {
  workspaceId: string;
  triggeredBy: string;
  assumptionId?: string | null;
}): Promise<ResearchRunResult> {
  if (!isWebResearchConfigured()) {
    throw new ProviderUnavailableError(
      "web-research",
      "Configure WEB_RESEARCH_PROVIDER=tavily and WEB_RESEARCH_API_KEY first.",
    );
  }

  const run = await createResearchRun(options.workspaceId, {
    research_type: options.assumptionId ? "assumption" : "market",
    trigger_type: "manual",
    triggered_by: options.triggeredBy,
    notes: options.assumptionId
      ? `Manual assumption research for ${options.assumptionId}`
      : "Manual market sweep",
  });
  await markResearchRunRunning(options.workspaceId, run.id);

  const usageAcc = createUsageAccumulator();
  let findingsCreated = 0;
  let sourcesExamined = 0;
  let searchQueries = 0;

  try {
    const [assumptions, analysed] = await Promise.all([
      listAssumptions(options.workspaceId),
      listAnalysedCanonicalUrls(options.workspaceId),
    ]);

    const selected = options.assumptionId
      ? assumptions.filter((a) => a.id === options.assumptionId)
      : selectAssumptionsForManualMarket(assumptions);

    if (selected.length === 0) {
      const completed = await finishRun(options.workspaceId, run.id, "completed", {
        ...usageToRunFields(usageAcc),
        notes: "No eligible assumptions for market research.",
      });
      return {
        run: completed,
        findingsCreated: 0,
        message: "No eligible assumptions.",
      };
    }

    const web = getWebResearchProvider();
    const sourceCandidates: SourceCandidate[] = [];

    for (const assumption of selected) {
      if (searchQueries >= RESEARCH_LIMITS.maxSearchesPerAutomaticRun) break;
      const queries = marketQueriesForAssumption(assumption).slice(0, 2);
      for (const query of queries) {
        if (searchQueries >= RESEARCH_LIMITS.maxSearchesPerAutomaticRun) break;
        const search = await web.search({
          query,
          maxResults: RESEARCH_LIMITS.maxSourcesPerQuery,
        });
        addUsage(usageAcc, search.usage);
        searchQueries += 1;

        for (const result of search.results) {
          const canonical = canonicaliseUrl(result.url);
          if (!canonical || analysed.has(canonical)) continue;
          sourceCandidates.push({
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            publishedAt: result.publishedAt ?? null,
            organisationId: null,
            organisationName: null,
          });
          analysed.add(canonical);
          sourcesExamined += 1;
        }
      }
    }

    // Prefer candidates retrieved for the focus assumption when single-assumption run.
    let candidateAssumptions = toCandidates(selected);
    if (options.assumptionId && selected[0]) {
      const retrieved = await searchAssumptionCandidates(
        options.workspaceId,
        selected[0].statement,
        RESEARCH_LIMITS.maxCandidateAssumptions,
      );
      const byId = new Map(candidateAssumptions.map((c) => [c.id, c]));
      for (const row of retrieved) {
        byId.set(row.id, {
          id: row.id,
          statement: row.statement,
          category: row.category,
          importance: row.importance,
          confidence: row.confidence,
        });
      }
      candidateAssumptions = [...byId.values()].slice(
        0,
        RESEARCH_LIMITS.maxCandidateAssumptions,
      );
    }

    findingsCreated = await analyseSourcesAndCreateFindings({
      workspaceId: options.workspaceId,
      runId: run.id,
      researchType: options.assumptionId ? "assumption" : "market",
      sources: sourceCandidates.slice(0, 20),
      candidateAssumptions,
      usageAcc,
      maxAiCalls: RESEARCH_LIMITS.maxAiCallsPerRun,
    });

    const notes =
      findingsCreated === 0
        ? "No material market findings (nothing found is not evidence)."
        : `Created ${findingsCreated} pending finding(s) for review.`;

    const completed = await finishRun(options.workspaceId, run.id, "completed", {
      ...usageToRunFields(usageAcc),
      assumptions_considered: selected.length,
      sources_examined: sourcesExamined,
      findings_created: findingsCreated,
      search_queries_used: searchQueries,
      notes,
    });

    return { run: completed, findingsCreated, message: notes };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 500) : "Research failed";
    const failed = await finishRun(options.workspaceId, run.id, "failed", {
      ...usageToRunFields(usageAcc),
      findings_created: findingsCreated,
      search_queries_used: searchQueries,
      sources_examined: sourcesExamined,
      error: message,
    });
    return { run: failed, findingsCreated, message };
  }
}

export async function runAssumptionExternalResearch(options: {
  workspaceId: string;
  triggeredBy: string;
  assumptionId: string;
  mode: "market" | "competitor" | "both";
}): Promise<ResearchRunResult[]> {
  const results: ResearchRunResult[] = [];
  if (options.mode === "market" || options.mode === "both") {
    results.push(
      await runManualMarketSweep({
        workspaceId: options.workspaceId,
        triggeredBy: options.triggeredBy,
        assumptionId: options.assumptionId,
      }),
    );
  }
  if (options.mode === "competitor" || options.mode === "both") {
    results.push(
      await runManualCompetitorSweep({
        workspaceId: options.workspaceId,
        triggeredBy: options.triggeredBy,
        assumptionId: options.assumptionId,
      }),
    );
  }
  return results;
}

export type { Organisation };
