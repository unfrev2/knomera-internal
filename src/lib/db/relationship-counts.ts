import { getDb } from "@/lib/db/client";

export type AssumptionRelationshipCounts = {
  supporting_evidence: number;
  challenging_evidence: number;
  discovery_sessions: number;
  active_bets: number;
};

export type ProblemRelationshipCounts = {
  linked_assumptions: number;
  organisations: number;
  evidence: number;
  active_bets: number;
};

export async function getAssumptionRelationshipCounts(
  workspaceId: string,
  assumptionId: string,
): Promise<AssumptionRelationshipCounts> {
  const sql = getDb();
  const rows = await sql<AssumptionRelationshipCounts[]>`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM evidence e
        WHERE e.workspace_id = ${workspaceId}
          AND e.assumption_id = ${assumptionId}
          AND e.direction = 'supports'
      ) AS supporting_evidence,
      (
        SELECT COUNT(*)::int
        FROM evidence e
        WHERE e.workspace_id = ${workspaceId}
          AND e.assumption_id = ${assumptionId}
          AND e.direction = 'challenges'
      ) AS challenging_evidence,
      (
        SELECT COUNT(DISTINCT e.discovery_session_id)::int
        FROM evidence e
        WHERE e.workspace_id = ${workspaceId}
          AND e.assumption_id = ${assumptionId}
          AND e.discovery_session_id IS NOT NULL
      ) AS discovery_sessions,
      (
        SELECT COUNT(*)::int
        FROM bet_assumptions ba
        INNER JOIN bets b ON b.id = ba.bet_id
        WHERE ba.assumption_id = ${assumptionId}
          AND b.workspace_id = ${workspaceId}
          AND b.status = 'active'
      ) AS active_bets
  `;
  return (
    rows[0] ?? {
      supporting_evidence: 0,
      challenging_evidence: 0,
      discovery_sessions: 0,
      active_bets: 0,
    }
  );
}

export async function getProblemRelationshipCounts(
  workspaceId: string,
  problemId: string,
): Promise<ProblemRelationshipCounts> {
  const sql = getDb();
  const rows = await sql<ProblemRelationshipCounts[]>`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM problem_assumptions pa
        WHERE pa.problem_id = ${problemId}
          AND pa.workspace_id = ${workspaceId}
      ) AS linked_assumptions,
      (
        SELECT COUNT(DISTINCT s.organisation_id)::int
        FROM discovery_problems dp
        INNER JOIN discovery_sessions s ON s.id = dp.discovery_session_id
        WHERE dp.problem_id = ${problemId}
          AND s.workspace_id = ${workspaceId}
      ) AS organisations,
      (
        SELECT COUNT(DISTINCT e.id)::int
        FROM problem_assumptions pa
        INNER JOIN evidence e ON e.assumption_id = pa.assumption_id
        WHERE pa.problem_id = ${problemId}
          AND pa.workspace_id = ${workspaceId}
          AND e.workspace_id = ${workspaceId}
      ) AS evidence,
      (
        SELECT COUNT(*)::int
        FROM bet_problems bp
        INNER JOIN bets b ON b.id = bp.bet_id
        WHERE bp.problem_id = ${problemId}
          AND b.workspace_id = ${workspaceId}
          AND b.status = 'active'
      ) AS active_bets
  `;
  return (
    rows[0] ?? {
      linked_assumptions: 0,
      organisations: 0,
      evidence: 0,
      active_bets: 0,
    }
  );
}
