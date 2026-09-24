"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePageContext } from "@/lib/auth/context";
import {
  createFocusItem,
  deleteFocusItem,
  updateFocusItem,
} from "@/lib/db/focus";
import { weekStartISO } from "@/lib/format";
import { FOCUS_ITEM_STATUSES } from "@/lib/types";

function optionalText(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

const focusFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  owner: z.enum(["jon", "ahmed"]),
  week_start: z.string().date(),
  status: z.enum(FOCUS_ITEM_STATUSES),
  linked_assumption_id: z.string().uuid().nullable().optional(),
  linked_bet_id: z.string().uuid().nullable().optional(),
  linked_opportunity_id: z.string().uuid().nullable().optional(),
});

function parseFocusForm(formData: FormData) {
  return focusFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    owner: String(formData.get("owner") ?? ""),
    week_start: String(formData.get("week_start") ?? weekStartISO()),
    status: String(formData.get("status") ?? "planned"),
    linked_assumption_id: optionalText(formData.get("linked_assumption_id")),
    linked_bet_id: optionalText(formData.get("linked_bet_id")),
    linked_opportunity_id: optionalText(formData.get("linked_opportunity_id")),
  });
}

function revalidateFocus() {
  revalidatePath("/focus");
  revalidatePath("/");
}

export async function createFocusItemAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const parsed = parseFocusForm(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  await createFocusItem(workspace.id, user.id, {
    title: parsed.data.title,
    owner: parsed.data.owner,
    week_start: parsed.data.week_start,
    status: parsed.data.status,
    linked_assumption_id: parsed.data.linked_assumption_id ?? null,
    linked_bet_id: parsed.data.linked_bet_id ?? null,
    linked_opportunity_id: parsed.data.linked_opportunity_id ?? null,
  });

  revalidateFocus();
}

export async function updateFocusItemAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const id = optionalText(formData.get("id"));
  if (!id) throw new Error("Missing focus item id.");

  const parsed = parseFocusForm(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const updated = await updateFocusItem(workspace.id, id, {
    title: parsed.data.title,
    owner: parsed.data.owner,
    week_start: parsed.data.week_start,
    status: parsed.data.status,
    linked_assumption_id: parsed.data.linked_assumption_id ?? null,
    linked_bet_id: parsed.data.linked_bet_id ?? null,
    linked_opportunity_id: parsed.data.linked_opportunity_id ?? null,
  });
  if (!updated) throw new Error("Focus item not found.");

  revalidateFocus();
}

export async function setFocusItemStatusAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const id = optionalText(formData.get("id"));
  const statusRaw = String(formData.get("status") ?? "");
  if (!id) throw new Error("Missing focus item id.");
  if (
    !FOCUS_ITEM_STATUSES.includes(
      statusRaw as (typeof FOCUS_ITEM_STATUSES)[number],
    )
  ) {
    throw new Error("Invalid status.");
  }
  const status = statusRaw as (typeof FOCUS_ITEM_STATUSES)[number];
  const updated = await updateFocusItem(workspace.id, id, { status });
  if (!updated) throw new Error("Focus item not found.");
  revalidateFocus();
}

export async function deleteFocusItemAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const id = optionalText(formData.get("id"));
  if (!id) throw new Error("Missing focus item id.");
  await deleteFocusItem(workspace.id, id);
  revalidateFocus();
}
