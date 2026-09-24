"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePageContext } from "@/lib/auth/context";
import {
  createStrategyItem,
  updateStrategyItem,
} from "@/lib/db/strategy";
import {
  STRATEGY_ITEM_STATUSES,
  STRATEGY_ITEM_TYPES,
} from "@/lib/types";

function optionalText(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

const strategyFormSchema = z.object({
  type: z.enum(STRATEGY_ITEM_TYPES),
  title: z.string().trim().min(1, "Title is required."),
  content: z.string().trim().min(1, "Content is required."),
  status: z.enum(STRATEGY_ITEM_STATUSES),
  sort_order: z.coerce.number().int(),
});

function parseStrategyForm(formData: FormData) {
  return strategyFormSchema.safeParse({
    type: String(formData.get("type") ?? ""),
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? ""),
    status: String(formData.get("status") ?? "active"),
    sort_order: String(formData.get("sort_order") ?? "0"),
  });
}

export async function createStrategyItemAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const parsed = parseStrategyForm(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  await createStrategyItem(workspace.id, user.id, parsed.data);
  revalidatePath("/strategy");
  redirect("/strategy");
}

export async function updateStrategyItemAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const id = optionalText(formData.get("id"));
  if (!id) throw new Error("Missing strategy item id.");

  const parsed = parseStrategyForm(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const updated = await updateStrategyItem(workspace.id, id, parsed.data);
  if (!updated) throw new Error("Strategy item not found.");

  revalidatePath("/strategy");
  redirect("/strategy");
}
