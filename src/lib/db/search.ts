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
    : ([
        "assumption",
        "evidence",
        "problem",
        "organisation",
        "discovery_session",
        "decision",
      ] as SearchableObjectType[]);
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

  if (types.includes("problem")) {
    const rows = await sql<
      { id: string; title: string; status: string; severity: string }[]
    >`
      SELECT id, title, status::text, severity::text
      FROM problems
      WHERE workspace_id = ${workspaceId}
        AND (
          ${query} = ''
          OR title ILIKE ${pattern}
          OR COALESCE(description, '') ILIKE ${pattern}
          OR COALESCE(target_customer, '') ILIKE ${pattern}
        )
        ${exclude.length > 0 ? sql`AND id NOT IN ${sql(exclude)}` : sql``}
      ORDER BY title ASC
      LIMIT ${limit}
    `;

    for (const row of rows) {
      results.push({
        type: "problem",
        id: row.id,
        title: row.title,
        subtitle: row.status,
        meta: row.severity,
        href: hrefForLinkable("problem", row.id),
      });
    }
  }

  if (types.includes("organisation")) {
    const rows = await sql<{ id: string; name: string; organisation_type: string }[]>`
      SELECT id, name, organisation_type::text
      FROM organisations
      WHERE workspace_id = ${workspaceId}
        AND (
          ${query} = ''
          OR name ILIKE ${pattern}
          OR COALESCE(website, '') ILIKE ${pattern}
        )
        ${exclude.length > 0 ? sql`AND id NOT IN ${sql(exclude)}` : sql``}
      ORDER BY name ASC
      LIMIT ${limit}
    `;

    for (const row of rows) {
      results.push({
        type: "organisation",
        id: row.id,
        title: row.name,
        subtitle: row.organisation_type,
        href: hrefForLinkable("organisation", row.id),
      });
    }
  }

  if (types.includes("discovery_session")) {
    const rows = await sql<
      { id: string; title: string; organisation_name: string; session_date: string }[]
    >`
      SELECT
        s.id,
        s.title,
        o.name AS organisation_name,
        s.session_date::text
      FROM discovery_sessions s
      INNER JOIN organisations o ON o.id = s.organisation_id
      WHERE s.workspace_id = ${workspaceId}
        AND (
          ${query} = ''
          OR s.title ILIKE ${pattern}
          OR COALESCE(s.summary, '') ILIKE ${pattern}
          OR o.name ILIKE ${pattern}
        )
        ${exclude.length > 0 ? sql`AND s.id NOT IN ${sql(exclude)}` : sql``}
      ORDER BY s.session_date DESC
      LIMIT ${limit}
    `;

    for (const row of rows) {
      results.push({
        type: "discovery_session",
        id: row.id,
        title: row.title,
        subtitle: row.organisation_name,
        meta: row.session_date,
        href: hrefForLinkable("discovery_session", row.id),
      });
    }
  }

  if (types.includes("decision")) {
    const rows = await sql<
      { id: string; title: string; status: string; decision_date: string }[]
    >`
      SELECT id, title, status::text, decision_date::text
      FROM decisions
      WHERE workspace_id = ${workspaceId}
        AND (
          ${query} = ''
          OR title ILIKE ${pattern}
          OR decision ILIKE ${pattern}
          OR COALESCE(rationale, '') ILIKE ${pattern}
        )
        ${exclude.length > 0 ? sql`AND id NOT IN ${sql(exclude)}` : sql``}
      ORDER BY decision_date DESC
      LIMIT ${limit}
    `;

    for (const row of rows) {
      results.push({
        type: "decision",
        id: row.id,
        title: row.title,
        subtitle: row.status,
        meta: row.decision_date,
        href: hrefForLinkable("decision", row.id),
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
