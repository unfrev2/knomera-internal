import { getDb } from "@/lib/db/client";
import type { FocusItem, FocusItemStatus } from "@/lib/types";

export type FocusFilters = {
  week_start?: string;
  owner?: string;
  status?: FocusItemStatus;
};

export type FocusItemInput = {
  title: string;
  owner: string;
  week_start: string;
  status?: FocusItemStatus;
  linked_assumption_id?: string | null;
  linked_bet_id?: string | null;
  linked_opportunity_id?: string | null;
};

export async function listFocusItems(
  workspaceId: string,
  filters: FocusFilters = {},
): Promise<FocusItem[]> {
  const sql = getDb();
  const weekStart = filters.week_start?.trim() || null;
  const owner = filters.owner?.trim() ?? "";
  const status = filters.status ?? null;

  return sql<FocusItem[]>`
    SELECT
      f.id,
      f.workspace_id,
      f.title,
      f.owner,
      f.week_start::text,
      f.status,
      f.linked_assumption_id,
      f.linked_bet_id,
      f.linked_opportunity_id,
      f.created_by,
      f.created_at::text,
      a.statement AS linked_assumption_statement,
      b.title AS linked_bet_title,
      o.title AS linked_opportunity_title
    FROM focus_items f
    LEFT JOIN assumptions a ON a.id = f.linked_assumption_id
    LEFT JOIN bets b ON b.id = f.linked_bet_id
    LEFT JOIN opportunities o ON o.id = f.linked_opportunity_id
    WHERE f.workspace_id = ${workspaceId}
      AND (${weekStart}::date IS NULL OR f.week_start = ${weekStart}::date)
      AND (${owner === ""} OR f.owner = ${owner})
      AND (${status}::text IS NULL OR f.status::text = ${status})
    ORDER BY
      CASE f.status
        WHEN 'active' THEN 0
        WHEN 'planned' THEN 1
        WHEN 'done' THEN 2
        ELSE 3
      END,
      f.created_at ASC
  `;
}

export async function getFocusItem(
  workspaceId: string,
  id: string,
): Promise<FocusItem | null> {
  const sql = getDb();
  const rows = await sql<FocusItem[]>`
    SELECT
      f.id,
      f.workspace_id,
      f.title,
      f.owner,
      f.week_start::text,
      f.status,
      f.linked_assumption_id,
      f.linked_bet_id,
      f.linked_opportunity_id,
      f.created_by,
      f.created_at::text,
      a.statement AS linked_assumption_statement,
      b.title AS linked_bet_title,
      o.title AS linked_opportunity_title
    FROM focus_items f
    LEFT JOIN assumptions a ON a.id = f.linked_assumption_id
    LEFT JOIN bets b ON b.id = f.linked_bet_id
    LEFT JOIN opportunities o ON o.id = f.linked_opportunity_id
    WHERE f.workspace_id = ${workspaceId} AND f.id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createFocusItem(
  workspaceId: string,
  createdBy: string,
  input: FocusItemInput,
): Promise<FocusItem> {
  const sql = getDb();
  const rows = await sql<FocusItem[]>`
    INSERT INTO focus_items (
      workspace_id,
      title,
      owner,
      week_start,
      status,
      linked_assumption_id,
      linked_bet_id,
      linked_opportunity_id,
      created_by
    ) VALUES (
      ${workspaceId},
      ${input.title},
      ${input.owner},
      ${input.week_start},
      ${input.status ?? "planned"},
      ${input.linked_assumption_id ?? null},
      ${input.linked_bet_id ?? null},
      ${input.linked_opportunity_id ?? null},
      ${createdBy}
    )
    RETURNING
      id,
      workspace_id,
      title,
      owner,
      week_start::text,
      status,
      linked_assumption_id,
      linked_bet_id,
      linked_opportunity_id,
      created_by,
      created_at::text
  `;
  return rows[0];
}

export async function updateFocusItem(
  workspaceId: string,
  id: string,
  input: Partial<FocusItemInput>,
): Promise<FocusItem | null> {
  const current = await getFocusItem(workspaceId, id);
  if (!current) return null;
  const sql = getDb();
  const rows = await sql<FocusItem[]>`
    UPDATE focus_items SET
      title = ${input.title ?? current.title},
      owner = ${input.owner ?? current.owner},
      week_start = ${input.week_start ?? current.week_start},
      status = ${input.status ?? current.status},
      linked_assumption_id = ${
        input.linked_assumption_id === undefined
          ? current.linked_assumption_id
          : input.linked_assumption_id
      },
      linked_bet_id = ${
        input.linked_bet_id === undefined
          ? current.linked_bet_id
          : input.linked_bet_id
      },
      linked_opportunity_id = ${
        input.linked_opportunity_id === undefined
          ? current.linked_opportunity_id
          : input.linked_opportunity_id
      }
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    RETURNING
      id,
      workspace_id,
      title,
      owner,
      week_start::text,
      status,
      linked_assumption_id,
      linked_bet_id,
      linked_opportunity_id,
      created_by,
      created_at::text
  `;
  return rows[0] ?? null;
}

export async function deleteFocusItem(
  workspaceId: string,
  id: string,
): Promise<boolean> {
  const sql = getDb();
  const rows = await sql<{ id: string }[]>`
    DELETE FROM focus_items
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    RETURNING id
  `;
  return Boolean(rows[0]);
}
