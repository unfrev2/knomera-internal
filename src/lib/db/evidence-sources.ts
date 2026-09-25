import { getDb } from "@/lib/db/client";
import type { EvidenceSource, EvidenceSourceType } from "@/lib/types";

export type EvidenceSourceInput = {
  type: EvidenceSourceType;
  title: string;
  url?: string | null;
  description?: string | null;
};

export async function listStructuredEvidenceSources(
  workspaceId: string,
  search?: string,
): Promise<EvidenceSource[]> {
  const sql = getDb();
  const query = search?.trim() ?? "";
  return sql<EvidenceSource[]>`
    SELECT
      id,
      workspace_id,
      type::text AS type,
      title,
      url,
      description,
      created_by,
      created_at::text,
      updated_at::text
    FROM evidence_sources
    WHERE workspace_id = ${workspaceId}
      AND (
        ${query} = ''
        OR title ILIKE ${"%" + query + "%"}
        OR COALESCE(url, '') ILIKE ${"%" + query + "%"}
        OR COALESCE(description, '') ILIKE ${"%" + query + "%"}
      )
    ORDER BY title ASC
  `;
}

export async function getEvidenceSource(
  workspaceId: string,
  id: string,
): Promise<EvidenceSource | null> {
  const sql = getDb();
  const rows = await sql<EvidenceSource[]>`
    SELECT
      id,
      workspace_id,
      type::text AS type,
      title,
      url,
      description,
      created_by,
      created_at::text,
      updated_at::text
    FROM evidence_sources
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createEvidenceSource(
  workspaceId: string,
  createdBy: string,
  input: EvidenceSourceInput,
): Promise<EvidenceSource> {
  const sql = getDb();
  const rows = await sql<EvidenceSource[]>`
    INSERT INTO evidence_sources (
      workspace_id,
      type,
      title,
      url,
      description,
      created_by
    ) VALUES (
      ${workspaceId},
      ${input.type},
      ${input.title},
      ${input.url ?? null},
      ${input.description ?? null},
      ${createdBy}
    )
    RETURNING
      id,
      workspace_id,
      type::text AS type,
      title,
      url,
      description,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return rows[0];
}
