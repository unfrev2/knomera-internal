"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePageContext } from "@/lib/auth/context";
import {
  createOpportunity,
  updateOpportunity,
} from "@/lib/db/opportunities";
import { OPPORTUNITY_STAGES } from "@/lib/types";

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

const opportunityFormSchema = z.object({
  organisation_id: z.string().uuid("Organisation is required."),
  title: z.string().trim().min(1, "Title is required."),
  stage: z.enum(OPPORTUNITY_STAGES),
  potential_value: z
    .string()
    .nullable()
    .optional()
    .transform((value) => {
      if (value == null || value.trim() === "") return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    }),
  currency: z.string().trim().min(1).default("GBP"),
  owner: z.string().nullable().optional(),
  next_action: z.string().nullable().optional(),
  next_action_date: optionalDate,
  outcome_reason: z.string().nullable().optional(),
});

function parseOpportunityForm(formData: FormData) {
  return opportunityFormSchema.safeParse({
    organisation_id: String(formData.get("organisation_id") ?? ""),
    title: String(formData.get("title") ?? ""),
    stage: String(formData.get("stage") ?? "prospect"),
    potential_value: optionalText(formData.get("potential_value")),
    currency: String(formData.get("currency") ?? "GBP").trim() || "GBP",
    owner: optionalText(formData.get("owner")),
    next_action: optionalText(formData.get("next_action")),
    next_action_date: optionalText(formData.get("next_action_date")),
    outcome_reason: optionalText(formData.get("outcome_reason")),
  });
}

function revalidateOpportunity(opportunityId: string) {
  revalidatePath("/commercial");
  revalidatePath(`/commercial/${opportunityId}`);
  revalidatePath("/");
}

export async function createOpportunityAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const parsed = parseOpportunityForm(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const opportunity = await createOpportunity(workspace.id, user.id, {
    organisation_id: parsed.data.organisation_id,
    title: parsed.data.title,
    stage: parsed.data.stage,
    potential_value: parsed.data.potential_value,
    currency: parsed.data.currency,
    owner: parsed.data.owner ?? user.id,
    next_action: parsed.data.next_action ?? null,
    next_action_date: parsed.data.next_action_date ?? null,
    outcome_reason: parsed.data.outcome_reason ?? null,
  });

  revalidateOpportunity(opportunity.id);
  redirect(`/commercial/${opportunity.id}`);
}

export async function updateOpportunityAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const id = optionalText(formData.get("id"));
  if (!id) throw new Error("Missing opportunity id.");

  const parsed = parseOpportunityForm(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const updated = await updateOpportunity(workspace.id, id, user.id, {
    organisation_id: parsed.data.organisation_id,
    title: parsed.data.title,
    stage: parsed.data.stage,
    potential_value: parsed.data.potential_value,
    currency: parsed.data.currency,
    owner: parsed.data.owner ?? null,
    next_action: parsed.data.next_action ?? null,
    next_action_date: parsed.data.next_action_date ?? null,
    outcome_reason: parsed.data.outcome_reason ?? null,
  });
  if (!updated) throw new Error("Opportunity not found.");

  revalidateOpportunity(id);
  redirect(`/commercial/${id}`);
}
