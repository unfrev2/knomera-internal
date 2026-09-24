"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePageContext } from "@/lib/auth/context";
import {
  createEvidence,
  deleteEvidence,
  getEvidence,
  updateEvidence,
} from "@/lib/db/evidence";
import {
  EVIDENCE_DIRECTIONS,
  EVIDENCE_TYPES,
} from "@/lib/types";

function optionalText(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

const evidenceFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().nullable().optional(),
  evidence_type: z.enum(EVIDENCE_TYPES),
  strength: z.coerce.number().int().min(1).max(5),
  direction: z.enum(EVIDENCE_DIRECTIONS),
  source: z.string().nullable().optional(),
  evidence_date: z.string().date(),
});

const createEvidenceSchema = evidenceFieldsSchema.extend({
  assumption_id: z.string().uuid(),
  discovery_session_id: z.string().uuid().nullable().optional(),
});

function parseEvidenceFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: optionalText(formData.get("description")),
    evidence_type: String(formData.get("evidence_type") ?? ""),
    strength: formData.get("strength"),
    direction: String(formData.get("direction") ?? ""),
    source: optionalText(formData.get("source")),
    evidence_date: String(formData.get("evidence_date") ?? ""),
  };
}

function revalidateEvidencePaths(
  assumptionId: string,
  discoverySessionId?: string | null,
) {
  revalidatePath("/evidence");
  revalidatePath(`/assumptions/${assumptionId}`);
  revalidatePath("/");
  if (discoverySessionId) {
    revalidatePath(`/discovery/${discoverySessionId}`);
    revalidatePath("/discovery");
  }
}

export async function createEvidenceAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();

  const parsed = createEvidenceSchema.safeParse({
    assumption_id: String(formData.get("assumption_id") ?? ""),
    discovery_session_id: optionalText(formData.get("discovery_session_id")),
    ...parseEvidenceFields(formData),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const data = parsed.data;

  await createEvidence(workspace.id, user.id, {
    assumption_id: data.assumption_id,
    title: data.title,
    description: data.description ?? null,
    evidence_type: data.evidence_type,
    strength: data.strength,
    direction: data.direction,
    source: data.source ?? null,
    evidence_date: data.evidence_date,
    discovery_session_id: data.discovery_session_id ?? null,
  });

  revalidateEvidencePaths(data.assumption_id, data.discovery_session_id);

  if (data.discovery_session_id) {
    redirect(`/discovery/${data.discovery_session_id}`);
  }
  redirect(`/assumptions/${data.assumption_id}?evidenceAdded=1`);
}

export async function updateEvidenceAction(id: string, formData: FormData) {
  const { workspace } = await requirePageContext();

  const parsed = evidenceFieldsSchema.safeParse(parseEvidenceFields(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const existing = await getEvidence(workspace.id, id);
  if (!existing) {
    throw new Error("Evidence not found.");
  }

  const data = parsed.data;
  const updated = await updateEvidence(workspace.id, id, {
    title: data.title,
    description: data.description ?? null,
    evidence_type: data.evidence_type,
    strength: data.strength,
    direction: data.direction,
    source: data.source ?? null,
    evidence_date: data.evidence_date,
  });

  if (!updated) {
    throw new Error("Evidence not found.");
  }

  revalidateEvidencePaths(updated.assumption_id);
  return { ok: true as const, assumptionId: updated.assumption_id };
}

export async function deleteEvidenceAction(id: string) {
  const { workspace } = await requirePageContext();

  const deleted = await deleteEvidence(workspace.id, id);
  if (!deleted) {
    throw new Error("Evidence not found.");
  }

  revalidateEvidencePaths(deleted.assumption_id);
  return { ok: true as const, assumptionId: deleted.assumption_id };
}
