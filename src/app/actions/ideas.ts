"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePageContext } from "@/lib/auth/context";
import {
  createIdea,
  linkIdeaAssumption,
  linkIdeaProblem,
  unlinkIdeaAssumption,
  unlinkIdeaProblem,
  updateIdea,
} from "@/lib/db/ideas";
import { IDEA_STATUSES } from "@/lib/types";

function optionalText(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

const ideaFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().nullable().optional(),
  status: z.enum(IDEA_STATUSES),
  submitted_by: z.string().nullable().optional(),
});

function parseIdeaForm(formData: FormData) {
  return ideaFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: optionalText(formData.get("description")),
    status: String(formData.get("status") ?? "inbox"),
    submitted_by: optionalText(formData.get("submitted_by")),
  });
}

function revalidateIdea(ideaId: string) {
  revalidatePath("/ideas");
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/");
}

export async function createIdeaAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const parsed = parseIdeaForm(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const idea = await createIdea(workspace.id, user.id, {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    status: parsed.data.status,
    submitted_by: parsed.data.submitted_by ?? user.id,
  });

  revalidateIdea(idea.id);
  redirect(`/ideas/${idea.id}`);
}

export async function updateIdeaAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const id = optionalText(formData.get("id"));
  if (!id) throw new Error("Missing idea id.");

  const parsed = parseIdeaForm(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const updated = await updateIdea(workspace.id, id, {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    status: parsed.data.status,
    submitted_by: parsed.data.submitted_by ?? null,
  });
  if (!updated) throw new Error("Idea not found.");

  revalidateIdea(id);
  redirect(`/ideas/${id}`);
}

export async function linkProblemToIdeaAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const ideaId = optionalText(formData.get("idea_id"));
  const problemId = optionalText(formData.get("problem_id"));
  if (!ideaId || !problemId) {
    throw new Error("Idea and problem are required.");
  }
  await linkIdeaProblem(workspace.id, ideaId, problemId, user.id);
  revalidateIdea(ideaId);
  revalidatePath(`/problems/${problemId}`);
}

export async function unlinkProblemFromIdeaAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const ideaId = optionalText(formData.get("idea_id"));
  const problemId = optionalText(formData.get("problem_id"));
  if (!ideaId || !problemId) {
    throw new Error("Idea and problem are required.");
  }
  await unlinkIdeaProblem(workspace.id, ideaId, problemId);
  revalidateIdea(ideaId);
  revalidatePath(`/problems/${problemId}`);
}

export async function linkAssumptionToIdeaAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const ideaId = optionalText(formData.get("idea_id"));
  const assumptionId = optionalText(formData.get("assumption_id"));
  if (!ideaId || !assumptionId) {
    throw new Error("Idea and assumption are required.");
  }
  await linkIdeaAssumption(workspace.id, ideaId, assumptionId, user.id);
  revalidateIdea(ideaId);
  revalidatePath(`/assumptions/${assumptionId}`);
}

export async function unlinkAssumptionFromIdeaAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const ideaId = optionalText(formData.get("idea_id"));
  const assumptionId = optionalText(formData.get("assumption_id"));
  if (!ideaId || !assumptionId) {
    throw new Error("Idea and assumption are required.");
  }
  await unlinkIdeaAssumption(workspace.id, ideaId, assumptionId);
  revalidateIdea(ideaId);
  revalidatePath(`/assumptions/${assumptionId}`);
}
