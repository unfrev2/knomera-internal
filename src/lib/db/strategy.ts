import { getDb } from "@/lib/db/client";
import type {
  StrategyItem,
  StrategyItemStatus,
  StrategyItemType,
} from "@/lib/types";

export type StrategyItemInput = {
  type: StrategyItemType;
  title: string;
  content: string;
  status?: StrategyItemStatus;
  sort_order?: number;
  seed_key?: string | null;
};

export async function listStrategyItems(
  workspaceId: string,
): Promise<StrategyItem[]> {
  const sql = getDb();
  return sql<StrategyItem[]>`
    SELECT
      id,
      workspace_id,
      seed_key,
      type,
      title,
      content,
      status,
      sort_order,
      created_by,
      created_at::text,
      updated_at::text
    FROM strategy_items
    WHERE workspace_id = ${workspaceId}
    ORDER BY sort_order ASC, created_at ASC
  `;
}

export async function getStrategyItem(
  workspaceId: string,
  id: string,
): Promise<StrategyItem | null> {
  const sql = getDb();
  const rows = await sql<StrategyItem[]>`
    SELECT
      id,
      workspace_id,
      seed_key,
      type,
      title,
      content,
      status,
      sort_order,
      created_by,
      created_at::text,
      updated_at::text
    FROM strategy_items
    WHERE workspace_id = ${workspaceId} AND id = ${id}
  `;
  return rows[0] ?? null;
}

export async function createStrategyItem(
  workspaceId: string,
  createdBy: string,
  input: StrategyItemInput,
): Promise<StrategyItem> {
  const sql = getDb();
  const rows = await sql<StrategyItem[]>`
    INSERT INTO strategy_items (
      workspace_id,
      seed_key,
      type,
      title,
      content,
      status,
      sort_order,
      created_by
    ) VALUES (
      ${workspaceId},
      ${input.seed_key ?? null},
      ${input.type},
      ${input.title},
      ${input.content},
      ${input.status ?? "active"},
      ${input.sort_order ?? 0},
      ${createdBy}
    )
    RETURNING
      id,
      workspace_id,
      seed_key,
      type,
      title,
      content,
      status,
      sort_order,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return rows[0];
}

export async function updateStrategyItem(
  workspaceId: string,
  id: string,
  input: Partial<StrategyItemInput>,
): Promise<StrategyItem | null> {
  const sql = getDb();
  const current = await getStrategyItem(workspaceId, id);
  if (!current) return null;

  const rows = await sql<StrategyItem[]>`
    UPDATE strategy_items SET
      type = ${input.type ?? current.type},
      title = ${input.title ?? current.title},
      content = ${input.content ?? current.content},
      status = ${input.status ?? current.status},
      sort_order = ${input.sort_order ?? current.sort_order}
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    RETURNING
      id,
      workspace_id,
      seed_key,
      type,
      title,
      content,
      status,
      sort_order,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return rows[0] ?? null;
}

export async function upsertStrategyItemBySeedKey(
  workspaceId: string,
  createdBy: string,
  input: StrategyItemInput & { seed_key: string },
): Promise<StrategyItem> {
  const sql = getDb();
  const rows = await sql<StrategyItem[]>`
    INSERT INTO strategy_items (
      workspace_id,
      seed_key,
      type,
      title,
      content,
      status,
      sort_order,
      created_by
    ) VALUES (
      ${workspaceId},
      ${input.seed_key},
      ${input.type},
      ${input.title},
      ${input.content},
      ${input.status ?? "active"},
      ${input.sort_order ?? 0},
      ${createdBy}
    )
    ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
      type = EXCLUDED.type,
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      sort_order = EXCLUDED.sort_order
    RETURNING
      id,
      workspace_id,
      seed_key,
      type,
      title,
      content,
      status,
      sort_order,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return rows[0];
}
