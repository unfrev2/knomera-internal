"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePageContext } from "@/lib/auth/context";
import { createAssumption } from "@/lib/db/assumptions";
import { saveMatchedEvidenceCapture } from "@/lib/db/evidence-matching-save";
import { isHttpUrl } from "@/lib/domain/evidence-attribution";
import { matchEvidenceToAssumptions } from "@/lib/domain/evidence-matching";
import {
  EVIDENCE_DIRECTIONS,
  EVIDENCE_SOURCE_TYPES,
  EVIDENCE_TYPES,
  IMPORTANCE_LEVELS,
  CONFIDENCE_LEVELS,
} from "@/lib/types";

function optionalText(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

const attributionSchema = z.object({
  organisation_id: z.string().uuid().nullable().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  discovery_session_id: z.string().uuid().nullable().optional(),
  evidence_source_id: z.string().uuid().nullable().optional(),
  new_source_type: z.enum(EVIDENCE_SOURCE_TYPES).nullable().optional(),
  new_source_title: z.string().nullable().optional(),
  new_source_url: z.string().nullable().optional(),
  new_source_description: z.string().nullable().optional(),
});

export async function matchEvidenceAssumptionsAction(input: {
  rawText: string;
  forceReasoning?: boolean;
}) {
  const { workspace } = await requirePageContext();
  return matchEvidenceToAssumptions({
    workspaceId: workspace.id,
    rawText: input.rawText,
    forceReasoning: input.forceReasoning,
  });
}

const proposalItemSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  assumption_id: z.string().uuid(),
  direction: z.enum(EVIDENCE_DIRECTIONS),
  strength: z.number().int().min(1).max(5),
  evidence_type: z.enum(EVIDENCE_TYPES),
});

const saveMatchedSchema = attributionSchema.extend({
  raw_text: z.string().trim().min(1),
  evidence_date: z.string().date(),
  items: z.array(proposalItemSchema).min(1),
  return_to: z.string().nullable().optional(),
});

export async function saveMatchedEvidenceAction(input: z.infer<typeof saveMatchedSchema>) {
  const { user, workspace } = await requirePageContext();
  const parsed = saveMatchedSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const data = parsed.data;
  let newSource = null as
    | {
        type: (typeof EVIDENCE_SOURCE_TYPES)[number];
        title: string;
        url: string | null;
        description: string | null;
      }
    | null;

  if (!data.evidence_source_id && data.new_source_type) {
    const title = data.new_source_title?.trim() ?? "";
    if (!title) throw new Error("Source title is required.");
    if (data.new_source_type === "link") {
      const url = data.new_source_url?.trim() ?? "";
      if (!url || !isHttpUrl(url)) {
        throw new Error("A valid URL is required for a link source.");
      }
    }
    newSource = {
      type: data.new_source_type,
      title,
      url: data.new_source_url ?? null,
      description: data.new_source_description ?? null,
    };
  }

  const { evidence } = await saveMatchedEvidenceCapture(workspace.id, user.id, {
    raw_text: data.raw_text,
    evidence_date: data.evidence_date,
    organisation_id: data.organisation_id,
    contact_id: data.contact_id,
    discovery_session_id: data.discovery_session_id,
    evidence_source_id: data.evidence_source_id,
    new_source: newSource,
    items: data.items,
  });

  const assumptionIds = [...new Set(evidence.map((e) => e.assumption_id))];
  for (const id of assumptionIds) {
    revalidatePath(`/assumptions/${id}`);
  }
  revalidatePath("/evidence");
  revalidatePath("/");

  if (data.return_to) redirect(data.return_to);

  if (assumptionIds.length === 1) {
    redirect(`/assumptions/${assumptionIds[0]}?evidenceAdded=1`);
  }
  redirect("/evidence");
}

const createSuggestedAssumptionSchema = z.object({
  statement: z.string().trim().min(1),
  category: z.string().trim().min(1),
  importance: z.enum(IMPORTANCE_LEVELS),
  confidence: z.enum(CONFIDENCE_LEVELS),
  next_action: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export async function createSuggestedAssumptionAction(
  input: z.infer<typeof createSuggestedAssumptionSchema>,
) {
  const { user, workspace } = await requirePageContext();
  const parsed = createSuggestedAssumptionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid assumption.");
  }

  const created = await createAssumption(workspace.id, user.id, {
    statement: parsed.data.statement,
    description: optionalText(parsed.data.description),
    category: parsed.data.category,
    importance: parsed.data.importance,
    confidence: parsed.data.confidence,
    status: "untested",
    owner: user.id,
    next_action: optionalText(parsed.data.next_action),
  });

  revalidatePath("/assumptions");
  revalidatePath(`/assumptions/${created.id}`);
  return created;
}
