"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePageContext } from "@/lib/auth/context";
import { createEvidence } from "@/lib/db/evidence";
import {
  EVIDENCE_DIRECTIONS,
  EVIDENCE_TYPES,
} from "@/lib/types";

function optionalText(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

const evidenceFormSchema = z.object({
  assumption_id: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().nullable().optional(),
  evidence_type: z.enum(EVIDENCE_TYPES),
  strength: z.coerce.number().int().min(1).max(5),
  direction: z.enum(EVIDENCE_DIRECTIONS),
  source: z.string().nullable().optional(),
  evidence_date: z.string().date(),
});

export async function createEvidenceAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();

  const raw = {
    assumption_id: String(formData.get("assumption_id") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: optionalText(formData.get("description")),
    evidence_type: String(formData.get("evidence_type") ?? ""),
    strength: formData.get("strength"),
    direction: String(formData.get("direction") ?? ""),
    source: optionalText(formData.get("source")),
    evidence_date: String(formData.get("evidence_date") ?? ""),
  };

  const parsed = evidenceFormSchema.safeParse(raw);
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
  });

  revalidatePath("/evidence");
  revalidatePath(`/assumptions/${data.assumption_id}`);
  revalidatePath("/");
  redirect(`/assumptions/${data.assumption_id}?evidenceAdded=1`);
}
