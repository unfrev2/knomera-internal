import { getDb } from "@/lib/db/client";
import type { Evidence, EvidenceDirection, EvidenceType } from "@/lib/types";

export type EvidenceInput = {
  assumption_id: string;
  title: string;
  description?: string | null;
  evidence_type: EvidenceType;
  strength: number;
  direction: EvidenceDirection;
  source?: string | null;
  evidence_date: string;
  discovery_session_id?: string | null;
};

export type EvidenceFilters = {
  evidence_type?: EvidenceType;
  strength?: number;
  direction?: EvidenceDirection;
  assumption_id?: string;
  source?: string;
  date_from?: string;
  date_to?: string;
};

export type EvidenceUpdateInput = {
  title: string;
  description?: string | null;
  evidence_type: EvidenceType;
  strength: number;
  direction: EvidenceDirection;
  source?: string | null;
  evidence_date: string;
};

export async function listEvidenceForAssumption(
  workspaceId: string,
  assumptionId: string,
): Promise<Evidence[]> {
  const sql = getDb();
  return sql<Evidence[]>`
    SELECT
      id,
      workspace_id,
      assumption_id,
      title,
      description,
      evidence_type,
      strength,
      direction,
      source,
      evidence_date::text,
      created_by,
      created_at::text,
      discovery_session_id
    FROM evidence
    WHERE workspace_id = ${workspaceId}
      AND assumption_id = ${assumptionId}
    ORDER BY evidence_date ASC, created_at ASC
  `;
}

export async function listEvidence(
  workspaceId: string,
  filters: EvidenceFilters = {},
): Promise<Evidence[]> {
  const sql = getDb();
  const type = filters.evidence_type ?? null;
  const strength = filters.strength ?? null;
  const direction = filters.direction ?? null;
  const assumptionId = filters.assumption_id?.trim() || null;
  const source = filters.source?.trim() || null;
  const dateFrom = filters.date_from?.trim() || null;
  const dateTo = filters.date_to?.trim() || null;

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
    INNER JOIN assumptions a
      ON a.id = e.assumption_id AND a.workspace_id = e.workspace_id
    WHERE e.workspace_id = ${workspaceId}
      AND (${type}::text IS NULL OR e.evidence_type::text = ${type})
      AND (${strength}::int IS NULL OR e.strength = ${strength})
      AND (${direction}::text IS NULL OR e.direction::text = ${direction})
      AND (${assumptionId}::uuid IS NULL OR e.assumption_id = ${assumptionId}::uuid)
      AND (${source}::text IS NULL OR e.source = ${source})
      AND (${dateFrom}::date IS NULL OR e.evidence_date >= ${dateFrom}::date)
      AND (${dateTo}::date IS NULL OR e.evidence_date <= ${dateTo}::date)
    ORDER BY e.evidence_date DESC, e.created_at DESC
  `;
}

export async function getEvidence(
  workspaceId: string,
  id: string,
): Promise<Evidence | null> {
  const sql = getDb();
  const rows = await sql<Evidence[]>`
    SELECT
      id,
      workspace_id,
      assumption_id,
      title,
      description,
      evidence_type,
      strength,
      direction,
      source,
      evidence_date::text,
      created_by,
      created_at::text,
      discovery_session_id
    FROM evidence
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listEvidenceSources(
  workspaceId: string,
): Promise<string[]> {
  const sql = getDb();
  const rows = await sql<{ source: string }[]>`
    SELECT DISTINCT source
    FROM evidence
    WHERE workspace_id = ${workspaceId}
      AND source IS NOT NULL
      AND trim(source) <> ''
    ORDER BY source ASC
  `;
  return rows.map((row) => row.source);
}

export async function createEvidence(
  workspaceId: string,
  createdBy: string,
  input: EvidenceInput,
): Promise<Evidence> {
  const sql = getDb();

  const assumption = await sql<{ id: string }[]>`
    SELECT id FROM assumptions
    WHERE id = ${input.assumption_id} AND workspace_id = ${workspaceId}
    LIMIT 1
  `;
  if (!assumption[0]) {
    throw new Error("Assumption not found in this workspace.");
  }

  const rows = await sql<Evidence[]>`
    INSERT INTO evidence (
      workspace_id,
      assumption_id,
      title,
      description,
      evidence_type,
      strength,
      direction,
      source,
      evidence_date,
      created_by,
      discovery_session_id
    ) VALUES (
      ${workspaceId},
      ${input.assumption_id},
      ${input.title},
      ${input.description ?? null},
      ${input.evidence_type},
      ${input.strength},
      ${input.direction},
      ${input.source ?? null},
      ${input.evidence_date},
      ${createdBy},
      ${input.discovery_session_id ?? null}
    )
    RETURNING
      id,
      workspace_id,
      assumption_id,
      title,
      description,
      evidence_type,
      strength,
      direction,
      source,
      evidence_date::text,
      created_by,
      created_at::text,
      discovery_session_id
  `;

  return rows[0];
}

export async function updateEvidence(
  workspaceId: string,
  id: string,
  input: EvidenceUpdateInput,
): Promise<Evidence | null> {
  const sql = getDb();
  const rows = await sql<Evidence[]>`
    UPDATE evidence SET
      title = ${input.title},
      description = ${input.description ?? null},
      evidence_type = ${input.evidence_type},
      strength = ${input.strength},
      direction = ${input.direction},
      source = ${input.source ?? null},
      evidence_date = ${input.evidence_date}
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    RETURNING
      id,
      workspace_id,
      assumption_id,
      title,
      description,
      evidence_type,
      strength,
      direction,
      source,
      evidence_date::text,
      created_by,
      created_at::text,
      discovery_session_id
  `;
  return rows[0] ?? null;
}

export async function deleteEvidence(
  workspaceId: string,
  id: string,
): Promise<Evidence | null> {
  const sql = getDb();
  const rows = await sql<Evidence[]>`
    DELETE FROM evidence
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    RETURNING
      id,
      workspace_id,
      assumption_id,
      title,
      description,
      evidence_type,
      strength,
      direction,
      source,
      evidence_date::text,
      created_by,
      created_at::text,
      discovery_session_id
  `;
  return rows[0] ?? null;
}

export async function listEvidenceByAssumptionIds(
  workspaceId: string,
  assumptionIds: string[],
): Promise<Evidence[]> {
  if (assumptionIds.length === 0) return [];
  const sql = getDb();
  return sql<Evidence[]>`
    SELECT
      id,
      workspace_id,
      assumption_id,
      title,
      description,
      evidence_type,
      strength,
      direction,
      source,
      evidence_date::text,
      created_by,
      created_at::text,
      discovery_session_id
    FROM evidence
    WHERE workspace_id = ${workspaceId}
      AND assumption_id IN ${sql(assumptionIds)}
  `;
}
