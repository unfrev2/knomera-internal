import { getDb } from "@/lib/db/client";
import type { AssumptionHistory } from "@/lib/types";

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
