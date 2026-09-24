import { getDb, withChangedBy } from "@/lib/db/client";
import type {
  Assumption,
  AssumptionStatus,
  Confidence,
  Importance,
} from "@/lib/types";

export type AssumptionFilters = {
  search?: string;
  category?: string;
  importance?: Importance | Importance[];
  confidence?: Confidence | Confidence[];
  status?: AssumptionStatus | AssumptionStatus[];
  owner?: string;
};

export type AssumptionInput = {
  statement: string;
  description?: string | null;
  category: string;
  importance: Importance;
  confidence: Confidence;
  status?: AssumptionStatus;
  owner?: string | null;
  next_action?: string | null;
  target_date?: string | null;
};

function asArray<T extends string>(value?: T | T[]): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export async function listAssumptions(
  workspaceId: string,
  filters: AssumptionFilters = {},
): Promise<Assumption[]> {
  const sql = getDb();
  const categories = filters.category ? [filters.category] : [];
  const importance = asArray(filters.importance);
  const confidence = asArray(filters.confidence);
  const status = asArray(filters.status);
  const search = filters.search?.trim() ?? "";
  const owner = filters.owner?.trim() ?? "";

  // Never bind empty JS arrays into ANY() — with fetch_types:false / Hyperdrive
  // postgres.js serializes [] as "", which Postgres rejects as a malformed array literal.
  const rows = await sql<Assumption[]>`
    SELECT
      a.id,
      a.workspace_id,
      a.seed_key,
      a.statement,
      a.description,
      a.category,
      a.importance,
      a.confidence,
      a.status,
      a.owner,
      a.next_action,
      a.target_date::text,
      a.created_by,
      a.created_at::text,
      a.updated_at::text,
      COUNT(e.id)::int AS evidence_count
    FROM assumptions a
    LEFT JOIN evidence e ON e.assumption_id = a.id
    WHERE a.workspace_id = ${workspaceId}
      AND (${search} = '' OR a.statement ILIKE ${"%" + search + "%"} OR COALESCE(a.description, '') ILIKE ${"%" + search + "%"} OR COALESCE(a.next_action, '') ILIKE ${"%" + search + "%"})
      ${categories.length > 0 ? sql`AND a.category = ANY(${sql.array(categories)})` : sql``}
      ${importance.length > 0 ? sql`AND a.importance::text = ANY(${sql.array(importance)})` : sql``}
      ${confidence.length > 0 ? sql`AND a.confidence::text = ANY(${sql.array(confidence)})` : sql``}
      ${status.length > 0 ? sql`AND a.status::text = ANY(${sql.array(status)})` : sql``}
      AND (${owner === ""} OR a.owner ILIKE ${owner})
    GROUP BY a.id
    ORDER BY a.created_at ASC
  `;

  return rows;
}

export async function getAssumption(
  workspaceId: string,
  id: string,
): Promise<Assumption | null> {
  const sql = getDb();
  const rows = await sql<Assumption[]>`
    SELECT
      a.id,
      a.workspace_id,
      a.seed_key,
      a.statement,
      a.description,
      a.category,
      a.importance,
      a.confidence,
      a.status,
      a.owner,
      a.next_action,
      a.target_date::text,
      a.created_by,
      a.created_at::text,
      a.updated_at::text,
      COUNT(e.id)::int AS evidence_count
    FROM assumptions a
    LEFT JOIN evidence e ON e.assumption_id = a.id
    WHERE a.workspace_id = ${workspaceId} AND a.id = ${id}
    GROUP BY a.id
  `;
  return rows[0] ?? null;
}

export async function createAssumption(
  workspaceId: string,
  createdBy: string,
  input: AssumptionInput,
): Promise<Assumption> {
  const sql = getDb();
  const rows = await sql<Assumption[]>`
    INSERT INTO assumptions (
      workspace_id,
      statement,
      description,
      category,
      importance,
      confidence,
      status,
      owner,
      next_action,
      target_date,
      created_by
    ) VALUES (
      ${workspaceId},
      ${input.statement},
      ${input.description ?? null},
      ${input.category},
      ${input.importance},
      ${input.confidence},
      ${input.status ?? "untested"},
      ${input.owner ?? null},
      ${input.next_action ?? null},
      ${input.target_date ?? null},
      ${createdBy}
    )
    RETURNING
      id,
      workspace_id,
      seed_key,
      statement,
      description,
      category,
      importance,
      confidence,
      status,
      owner,
      next_action,
      target_date::text,
      created_by,
      created_at::text,
      updated_at::text
  `;

  const created = rows[0];
  await sql`
    INSERT INTO assumption_history (
      workspace_id, assumption_id, field_changed, old_value, new_value, changed_by
    ) VALUES (
      ${workspaceId},
      ${created.id},
      'confidence',
      NULL,
      ${created.confidence},
      ${createdBy}
    )
  `;

  return { ...created, evidence_count: 0 };
}

export async function updateAssumption(
  workspaceId: string,
  id: string,
  changedBy: string,
  input: Partial<AssumptionInput>,
): Promise<Assumption | null> {
  return withChangedBy(changedBy, async (sql) => {
    const currentRows = await sql<Assumption[]>`
      SELECT
        a.id,
        a.workspace_id,
        a.seed_key,
        a.statement,
        a.description,
        a.category,
        a.importance,
        a.confidence,
        a.status,
        a.owner,
        a.next_action,
        a.target_date::text,
        a.created_by,
        a.created_at::text,
        a.updated_at::text,
        COUNT(e.id)::int AS evidence_count
      FROM assumptions a
      LEFT JOIN evidence e ON e.assumption_id = a.id
      WHERE a.workspace_id = ${workspaceId} AND a.id = ${id}
      GROUP BY a.id
    `;
    const current = currentRows[0];
    if (!current) return null;

    const rows = await sql<Assumption[]>`
      UPDATE assumptions SET
        statement = ${input.statement ?? current.statement},
        description = ${input.description === undefined ? current.description : input.description},
        category = ${input.category ?? current.category},
        importance = ${input.importance ?? current.importance},
        confidence = ${input.confidence ?? current.confidence},
        status = ${input.status ?? current.status},
        owner = ${input.owner === undefined ? current.owner : input.owner},
        next_action = ${input.next_action === undefined ? current.next_action : input.next_action},
        target_date = ${input.target_date === undefined ? current.target_date : input.target_date}
      WHERE workspace_id = ${workspaceId} AND id = ${id}
      RETURNING
        id,
        workspace_id,
        seed_key,
        statement,
        description,
        category,
        importance,
        confidence,
        status,
        owner,
        next_action,
        target_date::text,
        created_by,
        created_at::text,
        updated_at::text
    `;

    return rows[0] ? { ...rows[0], evidence_count: current.evidence_count } : null;
  });
}

export async function countAssumptions(workspaceId: string) {
  const sql = getDb();
  const rows = await sql<{
    total: number;
    critical: number;
    critical_low: number;
    testing: number;
    supported: number;
    disproved: number;
  }[]>`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE importance = 'critical')::int AS critical,
      COUNT(*) FILTER (WHERE importance = 'critical' AND confidence = 'low')::int AS critical_low,
      COUNT(*) FILTER (WHERE status = 'testing')::int AS testing,
      COUNT(*) FILTER (WHERE status = 'supported')::int AS supported,
      COUNT(*) FILTER (WHERE status = 'disproved')::int AS disproved
    FROM assumptions
    WHERE workspace_id = ${workspaceId}
  `;
  return rows[0];
}
