"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePageContext } from "@/lib/auth/context";
import {
  createAssumption,
  updateAssumption,
} from "@/lib/db/assumptions";
import {
  ASSUMPTION_STATUSES,
  CONFIDENCE_LEVELS,
  IMPORTANCE_LEVELS,
} from "@/lib/types";

function optionalText(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

const assumptionFormSchema = z.object({
  statement: z.string().trim().min(1, "Assumption is required."),
  description: z.string().optional(),
  category: z.string().trim().min(1, "Category is required."),
  importance: z.enum(IMPORTANCE_LEVELS),
  confidence: z.enum(CONFIDENCE_LEVELS),
  status: z.enum(ASSUMPTION_STATUSES).optional(),
  owner: z.string().nullable().optional(),
  next_action: z.string().nullable().optional(),
  target_date: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value === "" || value == null ? null : value))
    .pipe(z.string().date().nullable()),
});

function parseAssumptionForm(formData: FormData) {
  const raw = {
    statement: String(formData.get("statement") ?? ""),
    description: optionalText(formData.get("description")) ?? undefined,
    category: String(formData.get("category") ?? ""),
    importance: String(formData.get("importance") ?? ""),
    confidence: String(formData.get("confidence") ?? ""),
    status: optionalText(formData.get("status")) ?? undefined,
    owner: optionalText(formData.get("owner")),
    next_action: optionalText(formData.get("next_action")),
    target_date: optionalText(formData.get("target_date")),
  };

  return assumptionFormSchema.safeParse(raw);
}

export async function createAssumptionAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const parsed = parseAssumptionForm(formData);

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const data = parsed.data;
  const assumption = await createAssumption(workspace.id, user.id, {
    statement: data.statement,
    description: data.description ?? null,
    category: data.category,
    importance: data.importance,
    confidence: data.confidence,
    status: data.status ?? "untested",
    owner: data.owner ?? null,
    next_action: data.next_action ?? null,
    target_date: data.target_date ?? null,
  });

  revalidatePath("/");
  revalidatePath("/assumptions");
  redirect(`/assumptions/${assumption.id}`);
}

export async function updateAssumptionAction(id: string, formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const parsed = parseAssumptionForm(formData);

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const data = parsed.data;
  const updated = await updateAssumption(workspace.id, id, user.id, {
    statement: data.statement,
    description: data.description ?? null,
    category: data.category,
    importance: data.importance,
    confidence: data.confidence,
    status: data.status,
    owner: data.owner ?? null,
    next_action: data.next_action ?? null,
    target_date: data.target_date ?? null,
  });

  if (!updated) {
    throw new Error("Assumption not found.");
  }

  revalidatePath("/");
  revalidatePath("/assumptions");
  revalidatePath(`/assumptions/${id}`);
  redirect(`/assumptions/${id}`);
}
