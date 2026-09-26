import { getDb } from "@/lib/db/client";
import {
  HIGH_MATCH_CONFIDENCE,
  MATCHING_LIMITS,
} from "@/lib/ai/config";
import type { AssumptionCandidate } from "@/lib/research/providers/types";

export type RankedAssumptionCandidate = AssumptionCandidate & {
  score: number;
};

function significantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4)
    .slice(0, 24);
}

/**
 * Deterministic candidate retrieval for evidence matching.
 * Uses PostgreSQL full-text ranking plus token overlap; no vectors.
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
  const ftsQuery = tokens.join(" ") || query.slice(0, 120);
  const firstToken = tokens[0] ?? query.slice(0, 40);
  const likeFirst = `%${firstToken}%`;

  const ftsRows = await sql<
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
        plainto_tsquery('english', ${ftsQuery})
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
        ) @@ plainto_tsquery('english', ${ftsQuery})
        OR a.statement ILIKE ${likeFirst}
        OR coalesce(a.description, '') ILIKE ${likeFirst}
        OR a.category ILIKE ${likeFirst}
        OR coalesce(a.next_action, '') ILIKE ${likeFirst}
        OR coalesce(problem_text.titles, '') ILIKE ${likeFirst}
      )
    ORDER BY rank DESC, a.statement ASC
    LIMIT ${capped * 2}
  `;

  const scored = ftsRows.map((row) => {
    const hay = `${row.statement} ${row.category}`.toLowerCase();
    const needle = query.toLowerCase();
    let hits = 0;
    for (const token of tokens) {
      if (hay.includes(token)) hits += 1;
    }
    const overlap = tokens.length === 0 ? 0 : hits / tokens.length;
    let score = Math.min(1, Number(row.rank) * 8 + overlap * 0.7);
    // Strong literal containment boosts deterministic path.
    if (
      hay.includes(needle.slice(0, Math.min(needle.length, 60))) ||
      tokens.filter((t) => hay.includes(t)).length >= Math.min(4, tokens.length)
    ) {
      score = Math.max(score, 0.55 + overlap * 0.4);
    }
    return {
      id: row.id,
      statement: row.statement,
      category: row.category,
      importance: row.importance,
      confidence: row.confidence,
      score,
    };
  });

  scored.sort(
    (a, b) => b.score - a.score || a.statement.localeCompare(b.statement),
  );

  if (scored.length === 0 && tokens.length > 0) {
    const pattern = `%${tokens.slice(0, 3).join("%")}%`;
    const fallback = await sql<
      {
        id: string;
        statement: string;
        category: string;
        importance: string;
        confidence: string;
      }[]
    >`
      SELECT
        id,
        statement,
        category,
        importance::text,
        confidence::text
      FROM assumptions
      WHERE workspace_id = ${workspaceId}
        AND (
          statement ILIKE ${pattern}
          OR coalesce(description, '') ILIKE ${pattern}
          OR category ILIKE ${`%${tokens[0]}%`}
        )
      ORDER BY statement ASC
      LIMIT ${capped}
    `;
    return fallback.map((row, index) => ({
      ...row,
      score: Math.max(0.15, 0.45 - index * 0.03),
    }));
  }

  return scored.slice(0, capped);
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
  if (top.score < HIGH_MATCH_CONFIDENCE) return null;
  if (
    second &&
    top.score - second.score < MATCHING_LIMITS.dominantCandidateMargin
  ) {
    return null;
  }
  return top;
}
