import { getDb } from "@/lib/db/client";
import type {
  Assumption,
  Bet,
  BetAssumptionLink,
  BetAssumptionRelationship,
  BetOutcome,
  BetOutcomeResult,
  BetStatus,
  Decision,
  Problem,
} from "@/lib/types";

export type BetFilters = {
  search?: string;
  status?: BetStatus;
  owner?: string;
};

export type BetInput = {
  title: string;
  description?: string | null;
  hypothesis?: string | null;
  status?: BetStatus;
  owner?: string | null;
  started_at?: string | null;
  target_date?: string | null;
  success_criteria?: string | null;
  expected_outcome?: string | null;
  seed_key?: string | null;
};

export type BetOutcomeInput = {
  summary: string;
  result: BetOutcomeResult;
  learning?: string | null;
  outcome_date: string;
};

export async function listBets(
  workspaceId: string,
  filters: BetFilters = {},
): Promise<Bet[]> {
  const sql = getDb();
  const search = filters.search?.trim() ?? "";
  const status = filters.status ?? null;
  const owner = filters.owner?.trim() ?? "";

  return sql<Bet[]>`
    SELECT
      b.id,
      b.workspace_id,
      b.seed_key,
      b.title,
      b.description,
      b.hypothesis,
      b.status,
      b.owner,
      b.started_at::text,
      b.target_date::text,
      b.success_criteria,
      b.expected_outcome,
      b.created_by,
      b.created_at::text,
      b.updated_at::text,
      COUNT(DISTINCT bp.problem_id)::int AS linked_problem_count,
      COUNT(DISTINCT ba.assumption_id)::int AS linked_assumption_count,
      COUNT(DISTINCT bo.id)::int AS outcome_count
    FROM bets b
    LEFT JOIN bet_problems bp
      ON bp.bet_id = b.id AND bp.workspace_id = b.workspace_id
    LEFT JOIN bet_assumptions ba
      ON ba.bet_id = b.id AND ba.workspace_id = b.workspace_id
    LEFT JOIN bet_outcomes bo
      ON bo.bet_id = b.id AND bo.workspace_id = b.workspace_id
    WHERE b.workspace_id = ${workspaceId}
      AND (
        ${search} = ''
        OR b.title ILIKE ${"%" + search + "%"}
        OR COALESCE(b.description, '') ILIKE ${"%" + search + "%"}
        OR COALESCE(b.hypothesis, '') ILIKE ${"%" + search + "%"}
      )
      AND (${status}::text IS NULL OR b.status::text = ${status})
      AND (${owner === ""} OR b.owner ILIKE ${owner})
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `;
}

export async function getBet(
  workspaceId: string,
  id: string,
): Promise<Bet | null> {
  const sql = getDb();
  const rows = await sql<Bet[]>`
    SELECT
      b.id,
      b.workspace_id,
      b.seed_key,
      b.title,
      b.description,
      b.hypothesis,
      b.status,
      b.owner,
      b.started_at::text,
      b.target_date::text,
      b.success_criteria,
      b.expected_outcome,
      b.created_by,
      b.created_at::text,
      b.updated_at::text,
      COUNT(DISTINCT bp.problem_id)::int AS linked_problem_count,
      COUNT(DISTINCT ba.assumption_id)::int AS linked_assumption_count,
      COUNT(DISTINCT bo.id)::int AS outcome_count
    FROM bets b
    LEFT JOIN bet_problems bp
      ON bp.bet_id = b.id AND bp.workspace_id = b.workspace_id
    LEFT JOIN bet_assumptions ba
      ON ba.bet_id = b.id AND ba.workspace_id = b.workspace_id
    LEFT JOIN bet_outcomes bo
      ON bo.bet_id = b.id AND bo.workspace_id = b.workspace_id
    WHERE b.workspace_id = ${workspaceId} AND b.id = ${id}
    GROUP BY b.id
  `;
  return rows[0] ?? null;
}

export async function createBet(
  workspaceId: string,
  createdBy: string,
  input: BetInput,
): Promise<Bet> {
  const sql = getDb();
  const rows = await sql<Bet[]>`
    INSERT INTO bets (
      workspace_id,
      seed_key,
      title,
      description,
      hypothesis,
      status,
      owner,
      started_at,
      target_date,
      success_criteria,
      expected_outcome,
      created_by
    ) VALUES (
      ${workspaceId},
      ${input.seed_key ?? null},
      ${input.title},
      ${input.description ?? null},
      ${input.hypothesis ?? null},
      ${input.status ?? "proposed"},
      ${input.owner ?? null},
      ${input.started_at ?? null},
      ${input.target_date ?? null},
      ${input.success_criteria ?? null},
      ${input.expected_outcome ?? null},
      ${createdBy}
    )
    RETURNING
      id,
      workspace_id,
      seed_key,
      title,
      description,
      hypothesis,
      status,
      owner,
      started_at::text,
      target_date::text,
      success_criteria,
      expected_outcome,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return {
    ...rows[0],
    linked_problem_count: 0,
    linked_assumption_count: 0,
    outcome_count: 0,
  };
}

export async function updateBet(
  workspaceId: string,
  id: string,
  input: Partial<BetInput>,
): Promise<Bet | null> {
  const current = await getBet(workspaceId, id);
  if (!current) return null;
  const sql = getDb();
  const rows = await sql<Bet[]>`
    UPDATE bets SET
      title = ${input.title ?? current.title},
      description = ${
        input.description === undefined ? current.description : input.description
      },
      hypothesis = ${
        input.hypothesis === undefined ? current.hypothesis : input.hypothesis
      },
      status = ${input.status ?? current.status},
      owner = ${input.owner === undefined ? current.owner : input.owner},
      started_at = ${
        input.started_at === undefined ? current.started_at : input.started_at
      },
      target_date = ${
        input.target_date === undefined ? current.target_date : input.target_date
      },
      success_criteria = ${
        input.success_criteria === undefined
          ? current.success_criteria
          : input.success_criteria
      },
      expected_outcome = ${
        input.expected_outcome === undefined
          ? current.expected_outcome
          : input.expected_outcome
      }
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    RETURNING
      id,
      workspace_id,
      seed_key,
      title,
      description,
      hypothesis,
      status,
      owner,
      started_at::text,
      target_date::text,
      success_criteria,
      expected_outcome,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return rows[0]
    ? {
        ...rows[0],
        linked_problem_count: current.linked_problem_count,
        linked_assumption_count: current.linked_assumption_count,
        outcome_count: current.outcome_count,
      }
    : null;
}

export async function listProblemsForBet(
  workspaceId: string,
  betId: string,
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
    INNER JOIN bet_problems bp ON bp.problem_id = p.id
    WHERE bp.workspace_id = ${workspaceId}
      AND bp.bet_id = ${betId}
    ORDER BY p.title ASC
  `;
}

export async function listAssumptionsForBet(
  workspaceId: string,
  betId: string,
): Promise<BetAssumptionLink[]> {
  const sql = getDb();
  return sql<BetAssumptionLink[]>`
    SELECT
      ba.bet_id,
      ba.assumption_id,
      ba.workspace_id,
      ba.relationship_type,
      ba.created_at::text,
      ba.created_by,
      a.statement AS assumption_statement,
      a.confidence AS assumption_confidence,
      a.importance AS assumption_importance,
      a.status AS assumption_status
    FROM bet_assumptions ba
    INNER JOIN assumptions a ON a.id = ba.assumption_id
    WHERE ba.workspace_id = ${workspaceId}
      AND ba.bet_id = ${betId}
    ORDER BY ba.relationship_type ASC, a.statement ASC
  `;
}

export async function listOutcomesForBet(
  workspaceId: string,
  betId: string,
): Promise<BetOutcome[]> {
  const sql = getDb();
  return sql<BetOutcome[]>`
    SELECT
      id,
      workspace_id,
      bet_id,
      summary,
      result,
      learning,
      outcome_date::text,
      created_by,
      created_at::text
    FROM bet_outcomes
    WHERE workspace_id = ${workspaceId}
      AND bet_id = ${betId}
    ORDER BY outcome_date DESC, created_at DESC
  `;
}

export async function getBetOutcome(
  workspaceId: string,
  id: string,
): Promise<BetOutcome | null> {
  const sql = getDb();
  const rows = await sql<BetOutcome[]>`
    SELECT
      id,
      workspace_id,
      bet_id,
      summary,
      result,
      learning,
      outcome_date::text,
      created_by,
      created_at::text
    FROM bet_outcomes
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createBetOutcome(
  workspaceId: string,
  createdBy: string,
  betId: string,
  input: BetOutcomeInput,
): Promise<BetOutcome> {
  const sql = getDb();
  const bet = await sql<{ id: string }[]>`
    SELECT id FROM bets
    WHERE id = ${betId} AND workspace_id = ${workspaceId}
    LIMIT 1
  `;
  if (!bet[0]) throw new Error("Bet not found in this workspace.");

  const rows = await sql<BetOutcome[]>`
    INSERT INTO bet_outcomes (
      workspace_id,
      bet_id,
      summary,
      result,
      learning,
      outcome_date,
      created_by
    ) VALUES (
      ${workspaceId},
      ${betId},
      ${input.summary},
      ${input.result},
      ${input.learning ?? null},
      ${input.outcome_date},
      ${createdBy}
    )
    RETURNING
      id,
      workspace_id,
      bet_id,
      summary,
      result,
      learning,
      outcome_date::text,
      created_by,
      created_at::text
  `;
  return rows[0];
}

export async function listBetsForProblem(
  workspaceId: string,
  problemId: string,
): Promise<Bet[]> {
  const sql = getDb();
  return sql<Bet[]>`
    SELECT
      b.id,
      b.workspace_id,
      b.seed_key,
      b.title,
      b.description,
      b.hypothesis,
      b.status,
      b.owner,
      b.started_at::text,
      b.target_date::text,
      b.success_criteria,
      b.expected_outcome,
      b.created_by,
      b.created_at::text,
      b.updated_at::text
    FROM bets b
    INNER JOIN bet_problems bp ON bp.bet_id = b.id
    WHERE bp.workspace_id = ${workspaceId}
      AND bp.problem_id = ${problemId}
    ORDER BY b.created_at DESC
  `;
}

export async function listBetsForAssumption(
  workspaceId: string,
  assumptionId: string,
): Promise<(Bet & { relationship_type: BetAssumptionRelationship })[]> {
  const sql = getDb();
  return sql<(Bet & { relationship_type: BetAssumptionRelationship })[]>`
    SELECT
      b.id,
      b.workspace_id,
      b.seed_key,
      b.title,
      b.description,
      b.hypothesis,
      b.status,
      b.owner,
      b.started_at::text,
      b.target_date::text,
      b.success_criteria,
      b.expected_outcome,
      b.created_by,
      b.created_at::text,
      b.updated_at::text,
      ba.relationship_type
    FROM bets b
    INNER JOIN bet_assumptions ba ON ba.bet_id = b.id
    WHERE ba.workspace_id = ${workspaceId}
      AND ba.assumption_id = ${assumptionId}
    ORDER BY b.created_at DESC
  `;
}

export async function listDecisionsForBet(
  workspaceId: string,
  betId: string,
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
    INNER JOIN decision_bets db ON db.decision_id = d.id
    WHERE db.workspace_id = ${workspaceId}
      AND db.bet_id = ${betId}
    ORDER BY d.decision_date DESC
  `;
}

export async function listBetsForDecision(
  workspaceId: string,
  decisionId: string,
): Promise<Bet[]> {
  const sql = getDb();
  return sql<Bet[]>`
    SELECT
      b.id,
      b.workspace_id,
      b.seed_key,
      b.title,
      b.description,
      b.hypothesis,
      b.status,
      b.owner,
      b.started_at::text,
      b.target_date::text,
      b.success_criteria,
      b.expected_outcome,
      b.created_by,
      b.created_at::text,
      b.updated_at::text
    FROM bets b
    INNER JOIN decision_bets db ON db.bet_id = b.id
    WHERE db.workspace_id = ${workspaceId}
      AND db.decision_id = ${decisionId}
    ORDER BY b.created_at DESC
  `;
}

export async function linkBetProblem(
  workspaceId: string,
  betId: string,
  problemId: string,
  createdBy: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO bet_problems (bet_id, problem_id, workspace_id, created_by)
    VALUES (${betId}, ${problemId}, ${workspaceId}, ${createdBy})
    ON CONFLICT (bet_id, problem_id) DO NOTHING
  `;
}

export async function unlinkBetProblem(
  workspaceId: string,
  betId: string,
  problemId: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    DELETE FROM bet_problems
    WHERE workspace_id = ${workspaceId}
      AND bet_id = ${betId}
      AND problem_id = ${problemId}
  `;
}

export async function linkBetAssumption(
  workspaceId: string,
  betId: string,
  assumptionId: string,
  relationshipType: BetAssumptionRelationship,
  createdBy: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO bet_assumptions (
      bet_id, assumption_id, workspace_id, relationship_type, created_by
    ) VALUES (
      ${betId}, ${assumptionId}, ${workspaceId}, ${relationshipType}, ${createdBy}
    )
    ON CONFLICT (bet_id, assumption_id) DO UPDATE SET
      relationship_type = EXCLUDED.relationship_type
  `;
}

export async function unlinkBetAssumption(
  workspaceId: string,
  betId: string,
  assumptionId: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    DELETE FROM bet_assumptions
    WHERE workspace_id = ${workspaceId}
      AND bet_id = ${betId}
      AND assumption_id = ${assumptionId}
  `;
}

export async function linkDecisionBet(
  workspaceId: string,
  decisionId: string,
  betId: string,
  createdBy: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO decision_bets (decision_id, bet_id, workspace_id, created_by)
    VALUES (${decisionId}, ${betId}, ${workspaceId}, ${createdBy})
    ON CONFLICT (decision_id, bet_id) DO NOTHING
  `;
}

export async function unlinkDecisionBet(
  workspaceId: string,
  decisionId: string,
  betId: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    DELETE FROM decision_bets
    WHERE workspace_id = ${workspaceId}
      AND decision_id = ${decisionId}
      AND bet_id = ${betId}
  `;
}

export async function upsertBetBySeedKey(
  workspaceId: string,
  createdBy: string,
  input: BetInput & { seed_key: string },
): Promise<Bet> {
  const sql = getDb();
  const rows = await sql<Bet[]>`
    INSERT INTO bets (
      workspace_id,
      seed_key,
      title,
      description,
      hypothesis,
      status,
      owner,
      started_at,
      target_date,
      success_criteria,
      expected_outcome,
      created_by
    ) VALUES (
      ${workspaceId},
      ${input.seed_key},
      ${input.title},
      ${input.description ?? null},
      ${input.hypothesis ?? null},
      ${input.status ?? "proposed"},
      ${input.owner ?? null},
      ${input.started_at ?? null},
      ${input.target_date ?? null},
      ${input.success_criteria ?? null},
      ${input.expected_outcome ?? null},
      ${createdBy}
    )
    ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      hypothesis = EXCLUDED.hypothesis,
      status = EXCLUDED.status,
      owner = COALESCE(EXCLUDED.owner, bets.owner),
      started_at = COALESCE(EXCLUDED.started_at, bets.started_at),
      target_date = COALESCE(EXCLUDED.target_date, bets.target_date),
      success_criteria = EXCLUDED.success_criteria,
      expected_outcome = EXCLUDED.expected_outcome
    RETURNING
      id,
      workspace_id,
      seed_key,
      title,
      description,
      hypothesis,
      status,
      owner,
      started_at::text,
      target_date::text,
      success_criteria,
      expected_outcome,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return {
    ...rows[0],
    linked_problem_count: 0,
    linked_assumption_count: 0,
    outcome_count: 0,
  };
}
