import { getDb } from "@/lib/db/client";
import type { DiscoverySession, Evidence, Problem } from "@/lib/types";

export type DiscoverySessionInput = {
  organisation_id: string;
  contact_id?: string | null;
  title: string;
  session_date: string;
  conducted_by?: string | null;
  summary?: string | null;
  raw_notes?: string | null;
};

export async function listDiscoverySessions(
  workspaceId: string,
): Promise<DiscoverySession[]> {
  const sql = getDb();
  return sql<DiscoverySession[]>`
    SELECT
      s.id,
      s.workspace_id,
      s.organisation_id,
      s.contact_id,
      s.title,
      s.session_date::text,
      s.conducted_by,
      s.summary,
      s.raw_notes,
      s.created_by,
      s.created_at::text,
      s.updated_at::text,
      o.name AS organisation_name,
      c.name AS contact_name,
      c.role AS contact_role,
      COUNT(e.id)::int AS evidence_count
    FROM discovery_sessions s
    INNER JOIN organisations o ON o.id = s.organisation_id
    LEFT JOIN contacts c ON c.id = s.contact_id
    LEFT JOIN evidence e
      ON e.discovery_session_id = s.id AND e.workspace_id = s.workspace_id
    WHERE s.workspace_id = ${workspaceId}
    GROUP BY s.id, o.name, c.name, c.role
    ORDER BY s.session_date DESC, s.created_at DESC
  `;
}

export async function getDiscoverySession(
  workspaceId: string,
  id: string,
): Promise<DiscoverySession | null> {
  const sql = getDb();
  const rows = await sql<DiscoverySession[]>`
    SELECT
      s.id,
      s.workspace_id,
      s.organisation_id,
      s.contact_id,
      s.title,
      s.session_date::text,
      s.conducted_by,
      s.summary,
      s.raw_notes,
      s.created_by,
      s.created_at::text,
      s.updated_at::text,
      o.name AS organisation_name,
      c.name AS contact_name,
      c.role AS contact_role,
      COUNT(e.id)::int AS evidence_count
    FROM discovery_sessions s
    INNER JOIN organisations o ON o.id = s.organisation_id
    LEFT JOIN contacts c ON c.id = s.contact_id
    LEFT JOIN evidence e
      ON e.discovery_session_id = s.id AND e.workspace_id = s.workspace_id
    WHERE s.workspace_id = ${workspaceId} AND s.id = ${id}
    GROUP BY s.id, o.name, c.name, c.role
  `;
  return rows[0] ?? null;
}

export async function createDiscoverySession(
  workspaceId: string,
  createdBy: string,
  input: DiscoverySessionInput,
): Promise<DiscoverySession> {
  const sql = getDb();
  const rows = await sql<DiscoverySession[]>`
    INSERT INTO discovery_sessions (
      workspace_id,
      organisation_id,
      contact_id,
      title,
      session_date,
      conducted_by,
      summary,
      raw_notes,
      created_by
    ) VALUES (
      ${workspaceId},
      ${input.organisation_id},
      ${input.contact_id ?? null},
      ${input.title},
      ${input.session_date},
      ${input.conducted_by ?? null},
      ${input.summary ?? null},
      ${input.raw_notes ?? null},
      ${createdBy}
    )
    RETURNING
      id,
      workspace_id,
      organisation_id,
      contact_id,
      title,
      session_date::text,
      conducted_by,
      summary,
      raw_notes,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return { ...rows[0], evidence_count: 0 };
}

export async function updateDiscoverySession(
  workspaceId: string,
  id: string,
  input: Partial<DiscoverySessionInput>,
): Promise<DiscoverySession | null> {
  const current = await getDiscoverySession(workspaceId, id);
  if (!current) return null;
  const sql = getDb();
  const rows = await sql<DiscoverySession[]>`
    UPDATE discovery_sessions SET
      organisation_id = ${input.organisation_id ?? current.organisation_id},
      contact_id = ${
        input.contact_id === undefined ? current.contact_id : input.contact_id
      },
      title = ${input.title ?? current.title},
      session_date = ${input.session_date ?? current.session_date},
      conducted_by = ${
        input.conducted_by === undefined
          ? current.conducted_by
          : input.conducted_by
      },
      summary = ${input.summary === undefined ? current.summary : input.summary},
      raw_notes = ${
        input.raw_notes === undefined ? current.raw_notes : input.raw_notes
      }
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    RETURNING
      id,
      workspace_id,
      organisation_id,
      contact_id,
      title,
      session_date::text,
      conducted_by,
      summary,
      raw_notes,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return rows[0]
    ? { ...rows[0], evidence_count: current.evidence_count }
    : null;
}

export async function listEvidenceForDiscoverySession(
  workspaceId: string,
  sessionId: string,
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
    WHERE e.workspace_id = ${workspaceId}
      AND e.discovery_session_id = ${sessionId}
    ORDER BY e.evidence_date ASC, e.created_at ASC
  `;
}

export async function listProblemsForDiscoverySession(
  workspaceId: string,
  sessionId: string,
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
    INNER JOIN discovery_problems dp ON dp.problem_id = p.id
    WHERE dp.workspace_id = ${workspaceId}
      AND dp.discovery_session_id = ${sessionId}
    ORDER BY p.title ASC
  `;
}

export async function linkDiscoveryProblem(
  workspaceId: string,
  sessionId: string,
  problemId: string,
  createdBy: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO discovery_problems (
      discovery_session_id,
      problem_id,
      workspace_id,
      created_by
    ) VALUES (
      ${sessionId},
      ${problemId},
      ${workspaceId},
      ${createdBy}
    )
    ON CONFLICT (discovery_session_id, problem_id) DO NOTHING
  `;
}

export async function unlinkDiscoveryProblem(
  workspaceId: string,
  sessionId: string,
  problemId: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    DELETE FROM discovery_problems
    WHERE workspace_id = ${workspaceId}
      AND discovery_session_id = ${sessionId}
      AND problem_id = ${problemId}
  `;
}

export async function listDiscoverySessionsForAssumption(
  workspaceId: string,
  assumptionId: string,
): Promise<DiscoverySession[]> {
  const sql = getDb();
  return sql<DiscoverySession[]>`
    SELECT
      s.id,
      s.workspace_id,
      s.organisation_id,
      s.contact_id,
      s.title,
      s.session_date::text,
      s.conducted_by,
      s.summary,
      s.raw_notes,
      s.created_by,
      s.created_at::text,
      s.updated_at::text,
      o.name AS organisation_name
    FROM discovery_sessions s
    INNER JOIN organisations o ON o.id = s.organisation_id
    WHERE s.workspace_id = ${workspaceId}
      AND EXISTS (
        SELECT 1
        FROM evidence e
        WHERE e.discovery_session_id = s.id
          AND e.workspace_id = ${workspaceId}
          AND e.assumption_id = ${assumptionId}
      )
    ORDER BY s.session_date DESC, s.created_at DESC
  `;
}
