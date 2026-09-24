import { getDb, withChangedBy } from "@/lib/db/client";
import type {
  Assumption,
  Confidence,
  Problem,
  ProblemAssumptionLink,
  ProblemAssumptionRelationship,
  ProblemSeverity,
  ProblemStatus,
} from "@/lib/types";

export type ProblemFilters = {
  search?: string;
  status?: ProblemStatus;
  severity?: ProblemSeverity;
  confidence?: Confidence;
  owner?: string;
};

export type ProblemInput = {
  title: string;
  description?: string | null;
  status?: ProblemStatus;
  severity: ProblemSeverity;
  confidence: Confidence;
  target_customer?: string | null;
  owner?: string | null;
  seed_key?: string | null;
};

function asArray<T extends string>(value?: T | T[]): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export async function listProblems(
  workspaceId: string,
  filters: ProblemFilters = {},
): Promise<Problem[]> {
  const sql = getDb();
  const search = filters.search?.trim() ?? "";
  const status = asArray(filters.status);
  const severity = asArray(filters.severity);
  const confidence = asArray(filters.confidence);
  const owner = filters.owner?.trim() ?? "";

  return sql<Problem[]>`
    SELECT
      p.id,
      p.workspace_id,
      p.seed_key,
      p.title,
      p.description,
      p.status,
      p.severity,
      p.confidence,
      p.target_customer,
      p.owner,
      p.created_by,
      p.created_at::text,
      p.updated_at::text,
      COUNT(DISTINCT pa.assumption_id)::int AS linked_assumption_count,
      COUNT(DISTINCT e.id)::int AS evidence_count
    FROM problems p
    LEFT JOIN problem_assumptions pa
      ON pa.problem_id = p.id AND pa.workspace_id = p.workspace_id
    LEFT JOIN evidence e
      ON e.assumption_id = pa.assumption_id AND e.workspace_id = p.workspace_id
    WHERE p.workspace_id = ${workspaceId}
      AND (
        ${search} = ''
        OR p.title ILIKE ${"%" + search + "%"}
        OR COALESCE(p.description, '') ILIKE ${"%" + search + "%"}
        OR COALESCE(p.target_customer, '') ILIKE ${"%" + search + "%"}
      )
      ${status.length > 0 ? sql`AND p.status::text IN ${sql(status)}` : sql``}
      ${severity.length > 0 ? sql`AND p.severity::text IN ${sql(severity)}` : sql``}
      ${confidence.length > 0 ? sql`AND p.confidence::text IN ${sql(confidence)}` : sql``}
      AND (${owner === ""} OR p.owner ILIKE ${owner})
    GROUP BY p.id
    ORDER BY
      CASE p.severity
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        ELSE 3
      END,
      p.created_at ASC
  `;
}

export async function getProblem(
  workspaceId: string,
  id: string,
): Promise<Problem | null> {
  const sql = getDb();
  const rows = await sql<Problem[]>`
    SELECT
      p.id,
      p.workspace_id,
      p.seed_key,
      p.title,
      p.description,
      p.status,
      p.severity,
      p.confidence,
      p.target_customer,
      p.owner,
      p.created_by,
      p.created_at::text,
      p.updated_at::text,
      COUNT(DISTINCT pa.assumption_id)::int AS linked_assumption_count,
      COUNT(DISTINCT e.id)::int AS evidence_count
    FROM problems p
    LEFT JOIN problem_assumptions pa
      ON pa.problem_id = p.id AND pa.workspace_id = p.workspace_id
    LEFT JOIN evidence e
      ON e.assumption_id = pa.assumption_id AND e.workspace_id = p.workspace_id
    WHERE p.workspace_id = ${workspaceId} AND p.id = ${id}
    GROUP BY p.id
  `;
  return rows[0] ?? null;
}

export async function createProblem(
  workspaceId: string,
  createdBy: string,
  input: ProblemInput,
): Promise<Problem> {
  const sql = getDb();
  const rows = await sql<Problem[]>`
    INSERT INTO problems (
      workspace_id,
      seed_key,
      title,
      description,
      status,
      severity,
      confidence,
      target_customer,
      owner,
      created_by
    ) VALUES (
      ${workspaceId},
      ${input.seed_key ?? null},
      ${input.title},
      ${input.description ?? null},
      ${input.status ?? "observed"},
      ${input.severity},
      ${input.confidence},
      ${input.target_customer ?? null},
      ${input.owner ?? null},
      ${createdBy}
    )
    RETURNING
      id,
      workspace_id,
      seed_key,
      title,
      description,
      status,
      severity,
      confidence,
      target_customer,
      owner,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return { ...rows[0], linked_assumption_count: 0, evidence_count: 0 };
}

export async function updateProblem(
  workspaceId: string,
  id: string,
  changedBy: string,
  input: Partial<ProblemInput>,
): Promise<Problem | null> {
  return withChangedBy(changedBy, async (sql) => {
    const current = await getProblem(workspaceId, id);
    if (!current) return null;

    const rows = await sql<Problem[]>`
      UPDATE problems SET
        title = ${input.title ?? current.title},
        description = ${
          input.description === undefined
            ? current.description
            : input.description
        },
        status = ${input.status ?? current.status},
        severity = ${input.severity ?? current.severity},
        confidence = ${input.confidence ?? current.confidence},
        target_customer = ${
          input.target_customer === undefined
            ? current.target_customer
            : input.target_customer
        },
        owner = ${input.owner === undefined ? current.owner : input.owner}
      WHERE workspace_id = ${workspaceId} AND id = ${id}
      RETURNING
        id,
        workspace_id,
        seed_key,
        title,
        description,
        status,
        severity,
        confidence,
        target_customer,
        owner,
        created_by,
        created_at::text,
        updated_at::text
    `;

    return rows[0]
      ? {
          ...rows[0],
          linked_assumption_count: current.linked_assumption_count,
          evidence_count: current.evidence_count,
        }
      : null;
  });
}

export async function upsertProblemBySeedKey(
  workspaceId: string,
  createdBy: string,
  input: ProblemInput & { seed_key: string },
): Promise<Problem> {
  const sql = getDb();
  const rows = await sql<Problem[]>`
    INSERT INTO problems (
      workspace_id,
      seed_key,
      title,
      description,
      status,
      severity,
      confidence,
      target_customer,
      owner,
      created_by
    ) VALUES (
      ${workspaceId},
      ${input.seed_key},
      ${input.title},
      ${input.description ?? null},
      ${input.status ?? "observed"},
      ${input.severity},
      ${input.confidence},
      ${input.target_customer ?? null},
      ${input.owner ?? null},
      ${createdBy}
    )
    ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      target_customer = EXCLUDED.target_customer
    RETURNING
      id,
      workspace_id,
      seed_key,
      title,
      description,
      status,
      severity,
      confidence,
      target_customer,
      owner,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return { ...rows[0], linked_assumption_count: 0, evidence_count: 0 };
}

export async function listAssumptionsForProblem(
  workspaceId: string,
  problemId: string,
): Promise<ProblemAssumptionLink[]> {
  const sql = getDb();
  return sql<ProblemAssumptionLink[]>`
    SELECT
      pa.problem_id,
      pa.assumption_id,
      pa.workspace_id,
      pa.relationship_type,
      pa.created_at::text,
      pa.created_by,
      a.statement AS assumption_statement,
      a.confidence AS assumption_confidence,
      a.importance AS assumption_importance,
      a.status AS assumption_status
    FROM problem_assumptions pa
    INNER JOIN assumptions a ON a.id = pa.assumption_id
    WHERE pa.workspace_id = ${workspaceId}
      AND pa.problem_id = ${problemId}
    ORDER BY a.statement ASC
  `;
}

export async function listProblemsForAssumption(
  workspaceId: string,
  assumptionId: string,
): Promise<Problem[]> {
  const sql = getDb();
  return sql<Problem[]>`
    SELECT
      p.id,
      p.workspace_id,
      p.seed_key,
      p.title,
      p.description,
      p.status,
      p.severity,
      p.confidence,
      p.target_customer,
      p.owner,
      p.created_by,
      p.created_at::text,
      p.updated_at::text
    FROM problems p
    INNER JOIN problem_assumptions pa ON pa.problem_id = p.id
    WHERE pa.workspace_id = ${workspaceId}
      AND pa.assumption_id = ${assumptionId}
    ORDER BY p.title ASC
  `;
}

export async function linkProblemAssumption(
  workspaceId: string,
  problemId: string,
  assumptionId: string,
  createdBy: string,
  relationshipType: ProblemAssumptionRelationship = "supports_problem",
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO problem_assumptions (
      problem_id,
      assumption_id,
      workspace_id,
      relationship_type,
      created_by
    ) VALUES (
      ${problemId},
      ${assumptionId},
      ${workspaceId},
      ${relationshipType},
      ${createdBy}
    )
    ON CONFLICT (problem_id, assumption_id) DO UPDATE SET
      relationship_type = EXCLUDED.relationship_type
  `;
}

export async function unlinkProblemAssumption(
  workspaceId: string,
  problemId: string,
  assumptionId: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    DELETE FROM problem_assumptions
    WHERE workspace_id = ${workspaceId}
      AND problem_id = ${problemId}
      AND assumption_id = ${assumptionId}
  `;
}

export async function listEvidenceForProblem(
  workspaceId: string,
  problemId: string,
): Promise<
  {
    id: string;
    title: string;
    direction: string;
    strength: number;
    assumption_id: string;
    assumption_statement: string;
    evidence_date: string;
  }[]
> {
  const sql = getDb();
  return sql`
    SELECT
      e.id,
      e.title,
      e.direction::text,
      e.strength,
      e.assumption_id,
      a.statement AS assumption_statement,
      e.evidence_date::text
    FROM evidence e
    INNER JOIN assumptions a ON a.id = e.assumption_id
    INNER JOIN problem_assumptions pa ON pa.assumption_id = a.id
    WHERE pa.workspace_id = ${workspaceId}
      AND pa.problem_id = ${problemId}
      AND e.workspace_id = ${workspaceId}
    ORDER BY e.evidence_date DESC, e.created_at DESC
  `;
}

export async function getAssumptionIdsBySeedKeys(
  workspaceId: string,
  seedKeys: string[],
): Promise<Map<string, string>> {
  const sql = getDb();
  if (seedKeys.length === 0) return new Map();

  const rows = await sql<{ id: string; seed_key: string }[]>`
    SELECT id, seed_key
    FROM assumptions
    WHERE workspace_id = ${workspaceId}
      AND seed_key IN ${sql(seedKeys)}
  `;

  return new Map(rows.map((row) => [row.seed_key, row.id]));
}
