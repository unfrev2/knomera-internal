import { getDb } from "@/lib/db/client";
import type {
  Assumption,
  Decision,
  DecisionStatus,
  Evidence,
  Problem,
} from "@/lib/types";

export type DecisionFilters = {
  search?: string;
  status?: DecisionStatus;
  decided_by?: string;
};

export type DecisionInput = {
  title: string;
  decision: string;
  context?: string | null;
  rationale?: string | null;
  status?: DecisionStatus;
  decision_date: string;
  decided_by?: string | null;
  revisit_trigger?: string | null;
  revisit_date?: string | null;
};

export async function listDecisions(
  workspaceId: string,
  filters: DecisionFilters = {},
): Promise<Decision[]> {
  const sql = getDb();
  const search = filters.search?.trim() ?? "";
  const status = filters.status ?? null;
  const decidedBy = filters.decided_by?.trim() ?? "";

  return sql<Decision[]>`
    SELECT
      d.id,
      d.workspace_id,
      d.title,
      d.decision,
      d.context,
      d.rationale,
      d.status,
      d.decision_date::text,
      d.decided_by,
      d.revisit_trigger,
      d.revisit_date::text,
      d.created_by,
      d.created_at::text,
      d.updated_at::text,
      COUNT(DISTINCT da.assumption_id)::int AS linked_assumption_count,
      COUNT(DISTINCT de.evidence_id)::int AS linked_evidence_count,
      COUNT(DISTINCT dp.problem_id)::int AS linked_problem_count
    FROM decisions d
    LEFT JOIN decision_assumptions da
      ON da.decision_id = d.id AND da.workspace_id = d.workspace_id
    LEFT JOIN decision_evidence de
      ON de.decision_id = d.id AND de.workspace_id = d.workspace_id
    LEFT JOIN decision_problems dp
      ON dp.decision_id = d.id AND dp.workspace_id = d.workspace_id
    WHERE d.workspace_id = ${workspaceId}
      AND (
        ${search} = ''
        OR d.title ILIKE ${"%" + search + "%"}
        OR d.decision ILIKE ${"%" + search + "%"}
        OR COALESCE(d.rationale, '') ILIKE ${"%" + search + "%"}
      )
      AND (${status}::text IS NULL OR d.status::text = ${status})
      AND (${decidedBy === ""} OR d.decided_by ILIKE ${decidedBy})
    GROUP BY d.id
    ORDER BY d.decision_date DESC, d.created_at DESC
  `;
}

export async function getDecision(
  workspaceId: string,
  id: string,
): Promise<Decision | null> {
  const sql = getDb();
  const rows = await sql<Decision[]>`
    SELECT
      d.id,
      d.workspace_id,
      d.title,
      d.decision,
      d.context,
      d.rationale,
      d.status,
      d.decision_date::text,
      d.decided_by,
      d.revisit_trigger,
      d.revisit_date::text,
      d.created_by,
      d.created_at::text,
      d.updated_at::text,
      COUNT(DISTINCT da.assumption_id)::int AS linked_assumption_count,
      COUNT(DISTINCT de.evidence_id)::int AS linked_evidence_count,
      COUNT(DISTINCT dp.problem_id)::int AS linked_problem_count
    FROM decisions d
    LEFT JOIN decision_assumptions da
      ON da.decision_id = d.id AND da.workspace_id = d.workspace_id
    LEFT JOIN decision_evidence de
      ON de.decision_id = d.id AND de.workspace_id = d.workspace_id
    LEFT JOIN decision_problems dp
      ON dp.decision_id = d.id AND dp.workspace_id = d.workspace_id
    WHERE d.workspace_id = ${workspaceId} AND d.id = ${id}
    GROUP BY d.id
  `;
  return rows[0] ?? null;
}

export async function createDecision(
  workspaceId: string,
  createdBy: string,
  input: DecisionInput,
): Promise<Decision> {
  const sql = getDb();
  const rows = await sql<Decision[]>`
    INSERT INTO decisions (
      workspace_id,
      title,
      decision,
      context,
      rationale,
      status,
      decision_date,
      decided_by,
      revisit_trigger,
      revisit_date,
      created_by
    ) VALUES (
      ${workspaceId},
      ${input.title},
      ${input.decision},
      ${input.context ?? null},
      ${input.rationale ?? null},
      ${input.status ?? "active"},
      ${input.decision_date},
      ${input.decided_by ?? null},
      ${input.revisit_trigger ?? null},
      ${input.revisit_date ?? null},
      ${createdBy}
    )
    RETURNING
      id,
      workspace_id,
      title,
      decision,
      context,
      rationale,
      status,
      decision_date::text,
      decided_by,
      revisit_trigger,
      revisit_date::text,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return {
    ...rows[0],
    linked_assumption_count: 0,
    linked_evidence_count: 0,
    linked_problem_count: 0,
  };
}

export async function updateDecision(
  workspaceId: string,
  id: string,
  input: Partial<DecisionInput>,
): Promise<Decision | null> {
  const current = await getDecision(workspaceId, id);
  if (!current) return null;
  const sql = getDb();
  const rows = await sql<Decision[]>`
    UPDATE decisions SET
      title = ${input.title ?? current.title},
      decision = ${input.decision ?? current.decision},
      context = ${input.context === undefined ? current.context : input.context},
      rationale = ${
        input.rationale === undefined ? current.rationale : input.rationale
      },
      status = ${input.status ?? current.status},
      decision_date = ${input.decision_date ?? current.decision_date},
      decided_by = ${
        input.decided_by === undefined ? current.decided_by : input.decided_by
      },
      revisit_trigger = ${
        input.revisit_trigger === undefined
          ? current.revisit_trigger
          : input.revisit_trigger
      },
      revisit_date = ${
        input.revisit_date === undefined
          ? current.revisit_date
          : input.revisit_date
      }
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    RETURNING
      id,
      workspace_id,
      title,
      decision,
      context,
      rationale,
      status,
      decision_date::text,
      decided_by,
      revisit_trigger,
      revisit_date::text,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return rows[0]
    ? {
        ...rows[0],
        linked_assumption_count: current.linked_assumption_count,
        linked_evidence_count: current.linked_evidence_count,
        linked_problem_count: current.linked_problem_count,
      }
    : null;
}

export async function listAssumptionsForDecision(
  workspaceId: string,
  decisionId: string,
): Promise<Assumption[]> {
  const sql = getDb();
  return sql<Assumption[]>`
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
      a.updated_at::text
    FROM assumptions a
    INNER JOIN decision_assumptions da ON da.assumption_id = a.id
    WHERE da.workspace_id = ${workspaceId}
      AND da.decision_id = ${decisionId}
    ORDER BY a.statement ASC
  `;
}

export async function listEvidenceForDecision(
  workspaceId: string,
  decisionId: string,
): Promise<Evidence[]> {
  const sql = getDb();
  return sql<Evidence[]>`
    SELECT
      e.id,
      e.workspace_id,
      e.assumption_id,
      e.title,
      e.description,
      e.evidence_type,
      e.strength,
      e.direction,
      e.source,
      e.evidence_date::text,
      e.created_by,
      e.created_at::text,
      e.discovery_session_id,
      a.statement AS assumption_statement
    FROM evidence e
    INNER JOIN assumptions a ON a.id = e.assumption_id
    INNER JOIN decision_evidence de ON de.evidence_id = e.id
    WHERE de.workspace_id = ${workspaceId}
      AND de.decision_id = ${decisionId}
    ORDER BY e.evidence_date DESC, e.created_at DESC
  `;
}

export async function listProblemsForDecision(
  workspaceId: string,
  decisionId: string,
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
    INNER JOIN decision_problems dp ON dp.problem_id = p.id
    WHERE dp.workspace_id = ${workspaceId}
      AND dp.decision_id = ${decisionId}
    ORDER BY p.title ASC
  `;
}

export async function listDecisionsForAssumption(
  workspaceId: string,
  assumptionId: string,
): Promise<Decision[]> {
  const sql = getDb();
  return sql<Decision[]>`
    SELECT
      d.id,
      d.workspace_id,
      d.title,
      d.decision,
      d.context,
      d.rationale,
      d.status,
      d.decision_date::text,
      d.decided_by,
      d.revisit_trigger,
      d.revisit_date::text,
      d.created_by,
      d.created_at::text,
      d.updated_at::text
    FROM decisions d
    INNER JOIN decision_assumptions da ON da.decision_id = d.id
    WHERE da.workspace_id = ${workspaceId}
      AND da.assumption_id = ${assumptionId}
    ORDER BY d.decision_date DESC
  `;
}

export async function listDecisionsForProblem(
  workspaceId: string,
  problemId: string,
): Promise<Decision[]> {
  const sql = getDb();
  return sql<Decision[]>`
    SELECT
      d.id,
      d.workspace_id,
      d.title,
      d.decision,
      d.context,
      d.rationale,
      d.status,
      d.decision_date::text,
      d.decided_by,
      d.revisit_trigger,
      d.revisit_date::text,
      d.created_by,
      d.created_at::text,
      d.updated_at::text
    FROM decisions d
    INNER JOIN decision_problems dp ON dp.decision_id = d.id
    WHERE dp.workspace_id = ${workspaceId}
      AND dp.problem_id = ${problemId}
    ORDER BY d.decision_date DESC
  `;
}

export async function linkDecisionAssumption(
  workspaceId: string,
  decisionId: string,
  assumptionId: string,
  createdBy: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO decision_assumptions (
      decision_id, assumption_id, workspace_id, created_by
    ) VALUES (
      ${decisionId}, ${assumptionId}, ${workspaceId}, ${createdBy}
    )
    ON CONFLICT (decision_id, assumption_id) DO NOTHING
  `;
}

export async function unlinkDecisionAssumption(
  workspaceId: string,
  decisionId: string,
  assumptionId: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    DELETE FROM decision_assumptions
    WHERE workspace_id = ${workspaceId}
      AND decision_id = ${decisionId}
      AND assumption_id = ${assumptionId}
  `;
}

export async function linkDecisionEvidence(
  workspaceId: string,
  decisionId: string,
  evidenceId: string,
  createdBy: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO decision_evidence (
      decision_id, evidence_id, workspace_id, created_by
    ) VALUES (
      ${decisionId}, ${evidenceId}, ${workspaceId}, ${createdBy}
    )
    ON CONFLICT (decision_id, evidence_id) DO NOTHING
  `;
}

export async function unlinkDecisionEvidence(
  workspaceId: string,
  decisionId: string,
  evidenceId: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    DELETE FROM decision_evidence
    WHERE workspace_id = ${workspaceId}
      AND decision_id = ${decisionId}
      AND evidence_id = ${evidenceId}
  `;
}

export async function linkDecisionProblem(
  workspaceId: string,
  decisionId: string,
  problemId: string,
  createdBy: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO decision_problems (
      decision_id, problem_id, workspace_id, created_by
    ) VALUES (
      ${decisionId}, ${problemId}, ${workspaceId}, ${createdBy}
    )
    ON CONFLICT (decision_id, problem_id) DO NOTHING
  `;
}

export async function unlinkDecisionProblem(
  workspaceId: string,
  decisionId: string,
  problemId: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    DELETE FROM decision_problems
    WHERE workspace_id = ${workspaceId}
      AND decision_id = ${decisionId}
      AND problem_id = ${problemId}
  `;
}
