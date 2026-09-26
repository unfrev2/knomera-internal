import { getDb } from "@/lib/db/client";
import {
  HIGH_MATCH_CONFIDENCE,
  MATCHING_LIMITS,
} from "@/lib/ai/config";
import type { AssumptionCandidate } from "@/lib/research/providers/types";

export type RankedAssumptionCandidate = AssumptionCandidate & {
  score: number;
};

/** Stopwords that add noise to candidate retrieval. */
const STOP = new Set([
  "that",
  "this",
  "with",
  "from",
  "have",
  "has",
  "been",
  "were",
  "will",
  "would",
  "could",
  "should",
  "about",
  "their",
  "there",
  "which",
  "when",
  "what",
  "they",
  "them",
  "also",
  "into",
  "than",
  "then",
  "some",
  "more",
  "most",
  "only",
  "over",
  "such",
  "very",
  "just",
  "like",
  "because",
  "does",
  "dont",
  "didn't",
  "it's",
  "its",
]);

function significantTokens(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)) {
    if (raw.length < 4) continue;
    if (STOP.has(raw)) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
    if (out.length >= 16) break;
  }
  return out;
}

/**
 * Deterministic candidate retrieval for evidence matching.
 * Prefer recall over precision — AI ranks within the shortlist.
 * Uses OR-based FTS + per-token ILIKE; no vectors.
 */
export async function searchAssumptionCandidates(
  workspaceId: string,
  rawText: string,
  limit: number = MATCHING_LIMITS.maxAssumptionCandidates,
): Promise<RankedAssumptionCandidate[]> {
  const sql = getDb();
  const capped = Math.min(
    Math.max(limit, 1),
    MATCHING_LIMITS.maxAssumptionCandidates,
  );
  const query = rawText.trim();
  if (!query) return [];

  const tokens = significantTokens(query);
  if (tokens.length === 0) {
    // Extremely short / stopword-only input — return nothing rather than all assumptions.
    return [];
  }

  // websearch OR query: match assumptions containing ANY significant token.
  const ftsOr = tokens.join(" OR ");
  // Build OR of ILIKE clauses — postgres.js does not bind JS arrays as PG arrays by default.
  const likeClause = tokens
    .map((token) => {
      const pattern = `%${token}%`;
      return sql`(
        a.statement ILIKE ${pattern}
        OR coalesce(a.description, '') ILIKE ${pattern}
        OR a.category ILIKE ${pattern}
        OR coalesce(a.next_action, '') ILIKE ${pattern}
        OR coalesce(problem_text.titles, '') ILIKE ${pattern}
      )`;
    })
    .reduce((acc, part, index) => (index === 0 ? part : sql`${acc} OR ${part}`));

  const rows = await sql<
    {
      id: string;
      statement: string;
      category: string;
      importance: string;
      confidence: string;
      rank: number;
    }[]
  >`
    SELECT
      a.id,
      a.statement,
      a.category,
      a.importance::text,
      a.confidence::text,
      ts_rank(
        setweight(to_tsvector('english', coalesce(a.statement, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(a.description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(a.category, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(a.next_action, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(problem_text.titles, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(problem_text.descriptions, '')), 'C'),
        websearch_to_tsquery('english', ${ftsOr})
      )::float8 AS rank
    FROM assumptions a
    LEFT JOIN LATERAL (
      SELECT
        string_agg(DISTINCT p.title, ' ') AS titles,
        string_agg(DISTINCT coalesce(p.description, ''), ' ') AS descriptions
      FROM problem_assumptions pa
      INNER JOIN problems p
        ON p.id = pa.problem_id AND p.workspace_id = a.workspace_id
      WHERE pa.assumption_id = a.id
        AND pa.workspace_id = a.workspace_id
    ) problem_text ON true
    WHERE a.workspace_id = ${workspaceId}
      AND (
        (
          setweight(to_tsvector('english', coalesce(a.statement, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(a.description, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(a.category, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(a.next_action, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(problem_text.titles, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(problem_text.descriptions, '')), 'C')
        ) @@ websearch_to_tsquery('english', ${ftsOr})
        OR (${likeClause})
      )
    ORDER BY rank DESC, a.statement ASC
    LIMIT ${Math.min(capped * 4, 48)}
  `;

  const normalisedQuery = query.toLowerCase().replace(/\s+/g, " ").trim();

  const scored = rows.map((row) => {
    const hay =
      `${row.statement} ${row.category}`.toLowerCase();
    let hits = 0;
    for (const token of tokens) {
      if (hay.includes(token)) hits += 1;
    }
    const overlap = tokens.length > 0 ? hits / tokens.length : 0;
    // Keep headroom below 1 so near-exact boosts remain distinguishable.
    let score = Math.min(
      0.9,
      Number(row.rank) * 6 + overlap * 0.7 + hits * 0.03,
    );

    const normalisedStatement = row.statement
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    const exact =
      normalisedStatement === normalisedQuery ||
      (normalisedQuery.length >= 24 &&
        (normalisedStatement === normalisedQuery ||
          normalisedStatement.startsWith(`${normalisedQuery} `) ||
          normalisedQuery.startsWith(`${normalisedStatement} `)));

    if (exact) {
      score = 1;
    } else if (
      normalisedQuery.length >= 40 &&
      (normalisedStatement.startsWith(normalisedQuery.slice(0, 48)) ||
        normalisedQuery.startsWith(normalisedStatement.slice(0, 48)))
    ) {
      score = Math.max(score, 0.93);
    }

    return {
      id: row.id,
      statement: row.statement,
      category: row.category,
      importance: row.importance,
      confidence: row.confidence,
      score,
      hits,
      exact,
    };
  });

  scored.sort(
    (a, b) =>
      Number(b.exact) - Number(a.exact) ||
      b.score - a.score ||
      b.hits - a.hits ||
      a.statement.localeCompare(b.statement),
  );

  // Prefer candidates that share at least one content token when possible.
  const withHits = scored.filter((c) => c.hits > 0);
  const pool = withHits.length > 0 ? withHits : scored;

  return pool
    .slice(0, capped)
    .map(({ hits: _hits, exact: _exact, ...rest }) => rest);
}

/**
 * Second-pass similarity check before offering a new assumption.
 */
export async function findSimilarAssumptions(
  workspaceId: string,
  statement: string,
  limit = 5,
): Promise<RankedAssumptionCandidate[]> {
  return searchAssumptionCandidates(
    workspaceId,
    statement,
    Math.min(limit, MATCHING_LIMITS.maxAssumptionCandidates),
  );
}

export function isDominantSingleMatch(
  candidates: RankedAssumptionCandidate[],
  rawText: string,
): RankedAssumptionCandidate | null {
  if (candidates.length === 0) return null;
  const top = candidates[0];
  const second = candidates[1];
  const simple =
    rawText.trim().length <= MATCHING_LIMITS.simpleClaimMaxLength &&
    (rawText.match(/[.!?]/g) ?? []).length <= 1;

  if (!simple) return null;

  const normalisedQuery = rawText
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const normalisedTop = top.statement.toLowerCase().replace(/\s+/g, " ").trim();
  if (normalisedTop === normalisedQuery) {
    return top;
  }

  if (top.score < HIGH_MATCH_CONFIDENCE) return null;
  if (
    second &&
    top.score - second.score < MATCHING_LIMITS.dominantCandidateMargin
  ) {
    return null;
  }
  return top;
}
