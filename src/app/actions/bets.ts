"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePageContext } from "@/lib/auth/context";
import {
  createBet,
  createBetOutcome,
  linkBetAssumption,
  linkBetProblem,
  linkDecisionBet,
  unlinkBetAssumption,
  unlinkBetProblem,
  unlinkDecisionBet,
  updateBet,
} from "@/lib/db/bets";
import {
  BET_ASSUMPTION_RELATIONSHIPS,
  BET_OUTCOME_RESULTS,
  BET_STATUSES,
} from "@/lib/types";

function optionalText(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

const optionalDate = z
  .string()
  .nullable()
  .optional()
  .transform((value) => (value === "" || value == null ? null : value))
  .pipe(z.string().date().nullable());

const betFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().nullable().optional(),
  hypothesis: z.string().nullable().optional(),
  status: z.enum(BET_STATUSES),
  owner: z.string().nullable().optional(),
  started_at: optionalDate,
  target_date: optionalDate,
  success_criteria: z.string().nullable().optional(),
  expected_outcome: z.string().nullable().optional(),
});

const outcomeFormSchema = z.object({
  bet_id: z.string().uuid(),
  summary: z.string().trim().min(1, "Summary is required."),
  result: z.enum(BET_OUTCOME_RESULTS),
  learning: z.string().nullable().optional(),
  outcome_date: z.string().date(),
});

function parseBetForm(formData: FormData) {
  return betFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: optionalText(formData.get("description")),
    hypothesis: optionalText(formData.get("hypothesis")),
    status: String(formData.get("status") ?? "proposed"),
    owner: optionalText(formData.get("owner")),
    started_at: optionalText(formData.get("started_at")),
    target_date: optionalText(formData.get("target_date")),
    success_criteria: optionalText(formData.get("success_criteria")),
    expected_outcome: optionalText(formData.get("expected_outcome")),
  });
}

function revalidateBet(betId: string) {
  revalidatePath("/bets");
  revalidatePath(`/bets/${betId}`);
  revalidatePath("/");
}

export async function createBetAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const parsed = parseBetForm(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const bet = await createBet(workspace.id, user.id, {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    hypothesis: parsed.data.hypothesis ?? null,
    status: parsed.data.status,
    owner: parsed.data.owner ?? user.id,
    started_at: parsed.data.started_at ?? null,
    target_date: parsed.data.target_date ?? null,
    success_criteria: parsed.data.success_criteria ?? null,
    expected_outcome: parsed.data.expected_outcome ?? null,
  });

  revalidateBet(bet.id);
  redirect(`/bets/${bet.id}`);
}

export async function updateBetAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const id = optionalText(formData.get("id"));
  if (!id) throw new Error("Missing bet id.");

  const parsed = parseBetForm(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const updated = await updateBet(workspace.id, id, user.id, {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    hypothesis: parsed.data.hypothesis ?? null,
    status: parsed.data.status,
    owner: parsed.data.owner ?? null,
    started_at: parsed.data.started_at ?? null,
    target_date: parsed.data.target_date ?? null,
    success_criteria: parsed.data.success_criteria ?? null,
    expected_outcome: parsed.data.expected_outcome ?? null,
  });
  if (!updated) throw new Error("Bet not found.");

  revalidateBet(id);
  redirect(`/bets/${id}`);
}

export async function createBetOutcomeAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const parsed = outcomeFormSchema.safeParse({
    bet_id: String(formData.get("bet_id") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    result: String(formData.get("result") ?? ""),
    learning: optionalText(formData.get("learning")),
    outcome_date: String(formData.get("outcome_date") ?? ""),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const outcome = await createBetOutcome(
    workspace.id,
    user.id,
    parsed.data.bet_id,
    {
      summary: parsed.data.summary,
      result: parsed.data.result,
      learning: parsed.data.learning ?? null,
      outcome_date: parsed.data.outcome_date,
    },
  );

  revalidateBet(parsed.data.bet_id);
  redirect(`/bets/${parsed.data.bet_id}?outcome=${outcome.id}`);
}

export async function linkProblemToBetAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const betId = optionalText(formData.get("bet_id"));
  const problemId = optionalText(formData.get("problem_id"));
  if (!betId || !problemId) {
    throw new Error("Bet and problem are required.");
  }
  await linkBetProblem(workspace.id, betId, problemId, user.id);
  revalidateBet(betId);
  revalidatePath(`/problems/${problemId}`);
}

export async function unlinkProblemFromBetAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const betId = optionalText(formData.get("bet_id"));
  const problemId = optionalText(formData.get("problem_id"));
  if (!betId || !problemId) {
    throw new Error("Bet and problem are required.");
  }
  await unlinkBetProblem(workspace.id, betId, problemId);
  revalidateBet(betId);
  revalidatePath(`/problems/${problemId}`);
}

export async function linkAssumptionToBetAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const betId = optionalText(formData.get("bet_id"));
  const assumptionId = optionalText(formData.get("assumption_id"));
  const relationship = String(
    formData.get("relationship_type") ?? "tests",
  ) as (typeof BET_ASSUMPTION_RELATIONSHIPS)[number];
  if (!betId || !assumptionId) {
    throw new Error("Bet and assumption are required.");
  }
  if (!BET_ASSUMPTION_RELATIONSHIPS.includes(relationship)) {
    throw new Error("Invalid relationship type.");
  }
  await linkBetAssumption(
    workspace.id,
    betId,
    assumptionId,
    relationship,
    user.id,
  );
  revalidateBet(betId);
  revalidatePath(`/assumptions/${assumptionId}`);
}

export async function unlinkAssumptionFromBetAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const betId = optionalText(formData.get("bet_id"));
  const assumptionId = optionalText(formData.get("assumption_id"));
  if (!betId || !assumptionId) {
    throw new Error("Bet and assumption are required.");
  }
  await unlinkBetAssumption(workspace.id, betId, assumptionId);
  revalidateBet(betId);
  revalidatePath(`/assumptions/${assumptionId}`);
}

export async function linkBetToDecisionAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const decisionId = optionalText(formData.get("decision_id"));
  const betId = optionalText(formData.get("bet_id"));
  if (!decisionId || !betId) {
    throw new Error("Decision and bet are required.");
  }
  await linkDecisionBet(workspace.id, decisionId, betId, user.id);
  revalidateBet(betId);
  revalidatePath(`/decisions/${decisionId}`);
}

export async function unlinkBetFromDecisionAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const decisionId = optionalText(formData.get("decision_id"));
  const betId = optionalText(formData.get("bet_id"));
  if (!decisionId || !betId) {
    throw new Error("Decision and bet are required.");
  }
  await unlinkDecisionBet(workspace.id, decisionId, betId);
  revalidateBet(betId);
  revalidatePath(`/decisions/${decisionId}`);
}
