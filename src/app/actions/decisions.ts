"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePageContext } from "@/lib/auth/context";
import {
  createDecision,
  linkDecisionAssumption,
  linkDecisionEvidence,
  linkDecisionProblem,
  unlinkDecisionAssumption,
  unlinkDecisionEvidence,
  unlinkDecisionProblem,
  updateDecision,
} from "@/lib/db/decisions";
import { DECISION_STATUSES } from "@/lib/types";

function optionalText(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

const decisionFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  decision: z.string().trim().min(1, "What we decided is required."),
  context: z.string().nullable().optional(),
  rationale: z.string().nullable().optional(),
  status: z.enum(DECISION_STATUSES),
  decision_date: z.string().date(),
  decided_by: z.string().nullable().optional(),
  revisit_trigger: z.string().nullable().optional(),
  revisit_date: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value === "" || value == null ? null : value))
    .pipe(z.string().date().nullable()),
});

function parseDecisionForm(formData: FormData) {
  return decisionFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    decision: String(formData.get("decision") ?? ""),
    context: optionalText(formData.get("context")),
    rationale: optionalText(formData.get("rationale")),
    status: String(formData.get("status") ?? "active"),
    decision_date: String(formData.get("decision_date") ?? ""),
    decided_by: optionalText(formData.get("decided_by")),
    revisit_trigger: optionalText(formData.get("revisit_trigger")),
    revisit_date: optionalText(formData.get("revisit_date")),
  });
}

function revalidateDecision(decisionId: string) {
  revalidatePath("/decisions");
  revalidatePath(`/decisions/${decisionId}`);
  revalidatePath("/");
}

export async function createDecisionAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const parsed = parseDecisionForm(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const decision = await createDecision(workspace.id, user.id, {
    title: parsed.data.title,
    decision: parsed.data.decision,
    context: parsed.data.context ?? null,
    rationale: parsed.data.rationale ?? null,
    status: parsed.data.status,
    decision_date: parsed.data.decision_date,
    decided_by: parsed.data.decided_by ?? user.id,
    revisit_trigger: parsed.data.revisit_trigger ?? null,
    revisit_date: parsed.data.revisit_date ?? null,
  });

  revalidateDecision(decision.id);
  redirect(`/decisions/${decision.id}`);
}

export async function updateDecisionAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const id = optionalText(formData.get("id"));
  if (!id) throw new Error("Missing decision id.");

  const parsed = parseDecisionForm(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const updated = await updateDecision(workspace.id, id, user.id, {
    title: parsed.data.title,
    decision: parsed.data.decision,
    context: parsed.data.context ?? null,
    rationale: parsed.data.rationale ?? null,
    status: parsed.data.status,
    decision_date: parsed.data.decision_date,
    decided_by: parsed.data.decided_by ?? null,
    revisit_trigger: parsed.data.revisit_trigger ?? null,
    revisit_date: parsed.data.revisit_date ?? null,
  });
  if (!updated) throw new Error("Decision not found.");

  revalidateDecision(id);
  redirect(`/decisions/${id}`);
}

export async function linkAssumptionToDecisionAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const decisionId = optionalText(formData.get("decision_id"));
  const assumptionId = optionalText(formData.get("assumption_id"));
  if (!decisionId || !assumptionId) {
    throw new Error("Decision and assumption are required.");
  }
  await linkDecisionAssumption(
    workspace.id,
    decisionId,
    assumptionId,
    user.id,
  );
  revalidateDecision(decisionId);
  revalidatePath(`/assumptions/${assumptionId}`);
}

export async function unlinkAssumptionFromDecisionAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const decisionId = optionalText(formData.get("decision_id"));
  const assumptionId = optionalText(formData.get("assumption_id"));
  if (!decisionId || !assumptionId) {
    throw new Error("Decision and assumption are required.");
  }
  await unlinkDecisionAssumption(workspace.id, decisionId, assumptionId);
  revalidateDecision(decisionId);
  revalidatePath(`/assumptions/${assumptionId}`);
}

export async function linkEvidenceToDecisionAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const decisionId = optionalText(formData.get("decision_id"));
  const evidenceId = optionalText(formData.get("evidence_id"));
  if (!decisionId || !evidenceId) {
    throw new Error("Decision and evidence are required.");
  }
  await linkDecisionEvidence(workspace.id, decisionId, evidenceId, user.id);
  revalidateDecision(decisionId);
}

export async function unlinkEvidenceFromDecisionAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const decisionId = optionalText(formData.get("decision_id"));
  const evidenceId = optionalText(formData.get("evidence_id"));
  if (!decisionId || !evidenceId) {
    throw new Error("Decision and evidence are required.");
  }
  await unlinkDecisionEvidence(workspace.id, decisionId, evidenceId);
  revalidateDecision(decisionId);
}

export async function linkProblemToDecisionAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const decisionId = optionalText(formData.get("decision_id"));
  const problemId = optionalText(formData.get("problem_id"));
  if (!decisionId || !problemId) {
    throw new Error("Decision and problem are required.");
  }
  await linkDecisionProblem(workspace.id, decisionId, problemId, user.id);
  revalidateDecision(decisionId);
  revalidatePath(`/problems/${problemId}`);
}

export async function unlinkProblemFromDecisionAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const decisionId = optionalText(formData.get("decision_id"));
  const problemId = optionalText(formData.get("problem_id"));
  if (!decisionId || !problemId) {
    throw new Error("Decision and problem are required.");
  }
  await unlinkDecisionProblem(workspace.id, decisionId, problemId);
  revalidateDecision(decisionId);
  revalidatePath(`/problems/${problemId}`);
}
