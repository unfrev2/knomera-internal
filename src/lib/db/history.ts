import { getDb } from "@/lib/db/client";
import type {
  AssumptionHistory,
  EntityHistory,
  EntityHistoryType,
} from "@/lib/types";

export async function listAssumptionHistory(
  workspaceId: string,
  assumptionId: string,
): Promise<AssumptionHistory[]> {
  const sql = getDb();
  return sql<AssumptionHistory[]>`
    SELECT
      id,
      workspace_id,
      assumption_id,
      field_changed,
      old_value,
      new_value,
      changed_by,
      changed_at::text
    FROM assumption_history
    WHERE workspace_id = ${workspaceId}
      AND assumption_id = ${assumptionId}
    ORDER BY changed_at ASC, id ASC
  `;
}

export async function listEntityHistory(
  workspaceId: string,
  entityType: EntityHistoryType,
  entityId: string,
): Promise<EntityHistory[]> {
  const sql = getDb();
  return sql<EntityHistory[]>`
    SELECT
      id,
      workspace_id,
      entity_type,
      entity_id,
      field_changed,
      old_value,
      new_value,
      changed_by,
      changed_at::text
    FROM entity_history
    WHERE workspace_id = ${workspaceId}
      AND entity_type = ${entityType}
      AND entity_id = ${entityId}
    ORDER BY changed_at ASC, id ASC
  `;
}
