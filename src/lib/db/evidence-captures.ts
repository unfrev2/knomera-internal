import { getDb } from "@/lib/db/client";
import {
  isHttpUrl,
  resolveEvidenceAttribution,
  type NewEvidenceSourceInput,
} from "@/lib/domain/evidence-attribution";
import type { EvidenceCapture } from "@/lib/types";

export type EvidenceCaptureInput = {
  raw_text: string;
  organisation_id?: string | null;
  contact_id?: string | null;
  discovery_session_id?: string | null;
  evidence_source_id?: string | null;
  new_source?: NewEvidenceSourceInput | null;
  ai_assisted?: boolean;
};

async function insertEvidenceSource(
  sql: ReturnType<typeof getDb>,
  workspaceId: string,
  createdBy: string,
  input: NewEvidenceSourceInput,
): Promise<string> {
  const title = input.title.trim();
  if (!title) throw new Error("Source title is required.");
  if (input.type === "link") {
    const url = input.url?.trim() ?? "";
    if (!url || !isHttpUrl(url)) {
      throw new Error("A valid URL is required for a link source.");
    }
  }

  const rows = await sql<{ id: string }[]>`
    INSERT INTO evidence_sources (
      workspace_id, type, title, url, description, created_by
    ) VALUES (
      ${workspaceId},
      ${input.type},
      ${title},
      ${input.type === "link" ? (input.url?.trim() ?? null) : null},
      ${input.description?.trim() || null},
      ${createdBy}
    )
    RETURNING id
  `;
  return rows[0].id;
}

export async function createEvidenceCapture(
  workspaceId: string,
  capturedBy: string,
  input: EvidenceCaptureInput,
): Promise<EvidenceCapture> {
  const sql = getDb();
  const raw = input.raw_text.trim();
  if (!raw) throw new Error("Capture text is required.");

  return sql.begin(async (tx) => {
    let sourceId = input.evidence_source_id ?? null;
    if (input.new_source) {
      sourceId = await insertEvidenceSource(
        tx as unknown as ReturnType<typeof getDb>,
        workspaceId,
        capturedBy,
        input.new_source,
      );
    }

    const attribution = await resolveEvidenceAttribution(
      tx as unknown as ReturnType<typeof getDb>,
      workspaceId,
      {
        organisation_id: input.organisation_id,
        contact_id: input.contact_id,
        discovery_session_id: input.discovery_session_id,
        evidence_source_id: sourceId,
      },
    );

    const rows = await tx<EvidenceCapture[]>`
      INSERT INTO evidence_captures (
        workspace_id,
        raw_text,
        captured_by,
        organisation_id,
        contact_id,
        discovery_session_id,
        evidence_source_id,
        ai_assisted
      ) VALUES (
        ${workspaceId},
        ${raw},
        ${capturedBy},
        ${attribution.organisation_id},
        ${attribution.contact_id},
        ${attribution.discovery_session_id},
        ${attribution.evidence_source_id},
        ${input.ai_assisted ?? false}
      )
      RETURNING
        id,
        workspace_id,
        raw_text,
        captured_by,
        organisation_id,
        contact_id,
        discovery_session_id,
        evidence_source_id,
        ai_assisted,
        created_at::text
    `;
    return rows[0];
  });
}

export async function getEvidenceCapture(
  workspaceId: string,
  id: string,
): Promise<EvidenceCapture | null> {
  const sql = getDb();
  const rows = await sql<EvidenceCapture[]>`
    SELECT
      id,
      workspace_id,
      raw_text,
      captured_by,
      organisation_id,
      contact_id,
      discovery_session_id,
      evidence_source_id,
      ai_assisted,
      created_at::text
    FROM evidence_captures
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}
