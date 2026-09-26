import { getDb } from "@/lib/db/client";
import { createEvidenceCapture } from "@/lib/db/evidence-captures";
import { createEvidence, type EvidenceInput } from "@/lib/db/evidence";
import type { Evidence, EvidenceCapture } from "@/lib/types";
import type { NewEvidenceSourceInput } from "@/lib/domain/evidence-attribution";

export type AcceptedMatchedEvidence = {
  title: string;
  description: string;
  assumption_id: string;
  direction: EvidenceInput["direction"];
  strength: number;
  evidence_type: EvidenceInput["evidence_type"];
};

export type SaveMatchedEvidenceInput = {
  raw_text: string;
  evidence_date: string;
  organisation_id?: string | null;
  contact_id?: string | null;
  discovery_session_id?: string | null;
  evidence_source_id?: string | null;
  new_source?: NewEvidenceSourceInput | null;
  items: AcceptedMatchedEvidence[];
};

/**
 * Persist capture + accepted atomic evidence in one logical operation.
 * Founder remains created_by; ai_assisted = true.
 */
export async function saveMatchedEvidenceCapture(
  workspaceId: string,
  capturedBy: string,
  input: SaveMatchedEvidenceInput,
): Promise<{ capture: EvidenceCapture; evidence: Evidence[] }> {
  if (input.items.length === 0) {
    throw new Error("Select at least one evidence item to save.");
  }

  const capture = await createEvidenceCapture(workspaceId, capturedBy, {
    raw_text: input.raw_text,
    organisation_id: input.organisation_id,
    contact_id: input.contact_id,
    discovery_session_id: input.discovery_session_id,
    evidence_source_id: input.evidence_source_id,
    new_source: input.new_source,
    ai_assisted: true,
  });

  const evidence: Evidence[] = [];
  for (const item of input.items) {
    const created = await createEvidence(workspaceId, capturedBy, {
      assumption_id: item.assumption_id,
      title: item.title,
      description: item.description,
      evidence_type: item.evidence_type,
      strength: item.strength,
      direction: item.direction,
      evidence_date: input.evidence_date,
      organisation_id: capture.organisation_id,
      contact_id: capture.contact_id,
      discovery_session_id: capture.discovery_session_id,
      evidence_source_id: capture.evidence_source_id,
      evidence_capture_id: capture.id,
      ai_assisted: true,
    });
    evidence.push(created);
  }

  return { capture, evidence };
}

export async function countAiUsageEvents(
  workspaceId: string,
  feature = "evidence_matching",
): Promise<number> {
  const sql = getDb();
  const rows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM ai_usage_events
    WHERE workspace_id = ${workspaceId}
      AND feature = ${feature}
  `;
  return rows[0]?.count ?? 0;
}
