import { getDb } from "@/lib/db/client";
import {
  hrefForLinkable,
  type LinkableObject,
  type SearchableObjectType,
} from "@/lib/domain/linkable";

export type WorkspaceSearchOptions = {
  query: string;
  types?: SearchableObjectType[];
  excludeIds?: string[];
  limit?: number;
};

/**
 * Workspace-scoped text search across objects that exist today.
 * Later stages add problems, decisions, bets, etc. without changing the call site.
 */
export async function searchWorkspaceObjects(
  workspaceId: string,
  options: WorkspaceSearchOptions,
): Promise<LinkableObject[]> {
  const sql = getDb();
  const query = options.query.trim();
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
  const types = options.types?.length
    ? options.types
    : (["assumption", "evidence"] as SearchableObjectType[]);
  const exclude = options.excludeIds ?? [];
  const pattern = query ? `%${query}%` : "%";

  const results: LinkableObject[] = [];

  if (types.includes("assumption")) {
    const rows = await sql<
      { id: string; statement: string; category: string; confidence: string }[]
    >`
      SELECT id, statement, category, confidence::text
      FROM assumptions
      WHERE workspace_id = ${workspaceId}
        AND (
          ${query} = ''
          OR statement ILIKE ${pattern}
          OR COALESCE(description, '') ILIKE ${pattern}
          OR category ILIKE ${pattern}
        )
        ${exclude.length > 0 ? sql`AND id NOT IN ${sql(exclude)}` : sql``}
      ORDER BY statement ASC
      LIMIT ${limit}
    `;

    for (const row of rows) {
      results.push({
        type: "assumption",
        id: row.id,
        title: row.statement,
        subtitle: row.category,
        meta: row.confidence,
        href: hrefForLinkable("assumption", row.id),
      });
    }
  }

  if (types.includes("evidence")) {
    const rows = await sql<
      {
        id: string;
        title: string;
        assumption_statement: string;
        direction: string;
      }[]
    >`
      SELECT
        e.id,
        e.title,
        a.statement AS assumption_statement,
        e.direction::text
      FROM evidence e
      INNER JOIN assumptions a ON a.id = e.assumption_id
      WHERE e.workspace_id = ${workspaceId}
        AND (
          ${query} = ''
          OR e.title ILIKE ${pattern}
          OR COALESCE(e.description, '') ILIKE ${pattern}
          OR COALESCE(e.source, '') ILIKE ${pattern}
          OR a.statement ILIKE ${pattern}
        )
        ${exclude.length > 0 ? sql`AND e.id NOT IN ${sql(exclude)}` : sql``}
      ORDER BY e.evidence_date DESC, e.created_at DESC
      LIMIT ${limit}
    `;

    for (const row of rows) {
      results.push({
        type: "evidence",
        id: row.id,
        title: row.title,
        subtitle: row.assumption_statement,
        meta: row.direction,
        href: hrefForLinkable("evidence", row.id),
      });
    }
  }

  return results.slice(0, limit);
}
