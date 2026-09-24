"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePageContext } from "@/lib/auth/context";
import {
  createProblem,
  linkProblemAssumption,
  unlinkProblemAssumption,
  updateProblem,
} from "@/lib/db/problems";
import {
  CONFIDENCE_LEVELS,
  IMPORTANCE_LEVELS,
  PROBLEM_ASSUMPTION_RELATIONSHIPS,
  PROBLEM_STATUSES,
} from "@/lib/types";

function optionalText(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

const problemFormSchema = z.object({
  title: z.string().trim().min(1, "Problem title is required."),
  description: z.string().nullable().optional(),
  status: z.enum(PROBLEM_STATUSES),
  severity: z.enum(IMPORTANCE_LEVELS),
  confidence: z.enum(CONFIDENCE_LEVELS),
  target_customer: z.string().nullable().optional(),
  owner: z.string().nullable().optional(),
});

function parseProblemForm(formData: FormData) {
  return problemFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: optionalText(formData.get("description")),
    status: String(formData.get("status") ?? "observed"),
    severity: String(formData.get("severity") ?? "medium"),
    confidence: String(formData.get("confidence") ?? "low"),
    target_customer: optionalText(formData.get("target_customer")),
    owner: optionalText(formData.get("owner")),
  });
}

export async function createProblemAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const parsed = parseProblemForm(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const problem = await createProblem(workspace.id, user.id, {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    status: parsed.data.status,
    severity: parsed.data.severity,
    confidence: parsed.data.confidence,
    target_customer: parsed.data.target_customer ?? null,
    owner: parsed.data.owner ?? null,
  });

  revalidatePath("/problems");
  revalidatePath("/");
  redirect(`/problems/${problem.id}`);
}

export async function updateProblemAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const id = optionalText(formData.get("id"));
  if (!id) throw new Error("Missing problem id.");

  const parsed = parseProblemForm(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const updated = await updateProblem(workspace.id, id, {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    status: parsed.data.status,
    severity: parsed.data.severity,
    confidence: parsed.data.confidence,
    target_customer: parsed.data.target_customer ?? null,
    owner: parsed.data.owner ?? null,
  });
  if (!updated) throw new Error("Problem not found.");

  revalidatePath("/problems");
  revalidatePath(`/problems/${id}`);
  revalidatePath("/");
  redirect(`/problems/${id}`);
}

export async function linkAssumptionToProblemAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const problemId = optionalText(formData.get("problem_id"));
  const assumptionId = optionalText(formData.get("assumption_id"));
  const relationshipRaw = optionalText(formData.get("relationship_type"));
  const relationship = PROBLEM_ASSUMPTION_RELATIONSHIPS.includes(
    relationshipRaw as (typeof PROBLEM_ASSUMPTION_RELATIONSHIPS)[number],
  )
    ? (relationshipRaw as (typeof PROBLEM_ASSUMPTION_RELATIONSHIPS)[number])
    : "supports_problem";

  if (!problemId || !assumptionId) {
    throw new Error("Problem and assumption are required.");
  }

  await linkProblemAssumption(
    workspace.id,
    problemId,
    assumptionId,
    user.id,
    relationship,
  );

  revalidatePath(`/problems/${problemId}`);
  revalidatePath(`/assumptions/${assumptionId}`);
  revalidatePath("/problems");
}

export async function unlinkAssumptionFromProblemAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const problemId = optionalText(formData.get("problem_id"));
  const assumptionId = optionalText(formData.get("assumption_id"));
  if (!problemId || !assumptionId) {
    throw new Error("Problem and assumption are required.");
  }

  await unlinkProblemAssumption(workspace.id, problemId, assumptionId);

  revalidatePath(`/problems/${problemId}`);
  revalidatePath(`/assumptions/${assumptionId}`);
  revalidatePath("/problems");
}
