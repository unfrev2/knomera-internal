"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePageContext } from "@/lib/auth/context";
import {
  createEvidence,
  deleteEvidence,
  getEvidence,
  getEvidenceAttributionOptions,
  updateEvidence,
} from "@/lib/db/evidence";
import { isHttpUrl } from "@/lib/domain/evidence-attribution";
import {
  EVIDENCE_DIRECTIONS,
  EVIDENCE_SOURCE_TYPES,
  EVIDENCE_TYPES,
} from "@/lib/types";

function optionalText(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

const evidenceFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().nullable().optional(),
  evidence_type: z.enum(EVIDENCE_TYPES),
  strength: z.coerce.number().int().min(1).max(5),
  direction: z.enum(EVIDENCE_DIRECTIONS),
  source: z.string().nullable().optional(),
  evidence_date: z.string().date(),
});

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

const createEvidenceSchema = evidenceFieldsSchema.merge(attributionSchema).extend({
  assumption_id: z.string().uuid(),
  bet_outcome_id: z.string().uuid().nullable().optional(),
  opportunity_id: z.string().uuid().nullable().optional(),
});

function parseEvidenceFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: optionalText(formData.get("description")),
    evidence_type: String(formData.get("evidence_type") ?? ""),
    strength: formData.get("strength"),
    direction: String(formData.get("direction") ?? ""),
    source: optionalText(formData.get("source")),
    evidence_date: String(formData.get("evidence_date") ?? ""),
  };
}

function parseAttribution(formData: FormData) {
  return {
    organisation_id: optionalText(formData.get("organisation_id")),
    contact_id: optionalText(formData.get("contact_id")),
    discovery_session_id: optionalText(formData.get("discovery_session_id")),
    evidence_source_id: optionalText(formData.get("evidence_source_id")),
    new_source_type: optionalText(formData.get("new_source_type")),
    new_source_title: optionalText(formData.get("new_source_title")),
    new_source_url: optionalText(formData.get("new_source_url")),
    new_source_description: optionalText(formData.get("new_source_description")),
  };
}

function newSourceFromParsed(data: z.infer<typeof attributionSchema>) {
  if (data.evidence_source_id || !data.new_source_type) return null;
  const title = data.new_source_title?.trim() ?? "";
  if (!title) {
    throw new Error("Source title is required.");
  }
  if (data.new_source_type === "link") {
    const url = data.new_source_url?.trim() ?? "";
    if (!url || !isHttpUrl(url)) {
      throw new Error("A valid URL is required for a link source.");
    }
  }
  return {
    type: data.new_source_type,
    title,
    url: data.new_source_url ?? null,
    description: data.new_source_description ?? null,
  };
}

function revalidateEvidencePaths(
  assumptionId: string,
  options?: {
    discoverySessionId?: string | null;
    betId?: string | null;
    opportunityId?: string | null;
    organisationId?: string | null;
    contactId?: string | null;
  },
) {
  revalidatePath("/evidence");
  revalidatePath(`/assumptions/${assumptionId}`);
  revalidatePath("/");
  revalidatePath("/organisations");
  revalidatePath("/contacts");
  if (options?.discoverySessionId) {
    revalidatePath(`/discovery/${options.discoverySessionId}`);
    revalidatePath("/discovery");
  }
  if (options?.betId) {
    revalidatePath(`/bets/${options.betId}`);
    revalidatePath("/bets");
  }
  if (options?.opportunityId) {
    revalidatePath(`/commercial/${options.opportunityId}`);
    revalidatePath("/commercial");
  }
  if (options?.organisationId) {
    revalidatePath(`/organisations/${options.organisationId}`);
  }
  if (options?.contactId) {
    revalidatePath(`/contacts/${options.contactId}`);
  }
}

export async function getEvidenceAttributionOptionsAction() {
  const { workspace } = await requirePageContext();
  return getEvidenceAttributionOptions(workspace.id);
}

export async function createEvidenceAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();

  const parsed = createEvidenceSchema.safeParse({
    assumption_id: String(formData.get("assumption_id") ?? ""),
    bet_outcome_id: optionalText(formData.get("bet_outcome_id")),
    opportunity_id: optionalText(formData.get("opportunity_id")),
    ...parseEvidenceFields(formData),
    ...parseAttribution(formData),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const data = parsed.data;
  const betId = optionalText(formData.get("bet_id"));
  const returnTo = optionalText(formData.get("return_to"));
  const newSource = newSourceFromParsed(data);

  const created = await createEvidence(workspace.id, user.id, {
    assumption_id: data.assumption_id,
    title: data.title,
    description: data.description ?? null,
    evidence_type: data.evidence_type,
    strength: data.strength,
    direction: data.direction,
    source: data.source ?? null,
    evidence_date: data.evidence_date,
    discovery_session_id: data.discovery_session_id ?? null,
    bet_outcome_id: data.bet_outcome_id ?? null,
    opportunity_id: data.opportunity_id ?? null,
    organisation_id: data.organisation_id ?? null,
    contact_id: data.contact_id ?? null,
    evidence_source_id: data.evidence_source_id ?? null,
    new_source: newSource,
  });

  revalidateEvidencePaths(data.assumption_id, {
    discoverySessionId: created.discovery_session_id,
    betId,
    opportunityId: data.opportunity_id,
    organisationId: created.organisation_id,
    contactId: created.contact_id,
  });

  if (returnTo) redirect(returnTo);
  if (data.opportunity_id) {
    redirect(`/commercial/${data.opportunity_id}`);
  }
  if (betId) {
    redirect(`/bets/${betId}`);
  }
  if (created.discovery_session_id) {
    redirect(`/discovery/${created.discovery_session_id}`);
  }
  redirect(`/assumptions/${data.assumption_id}?evidenceAdded=1`);
}

export async function updateEvidenceAction(id: string, formData: FormData) {
  const { workspace } = await requirePageContext();

  const parsed = evidenceFieldsSchema.merge(attributionSchema).safeParse({
    ...parseEvidenceFields(formData),
    ...parseAttribution(formData),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const existing = await getEvidence(workspace.id, id);
  if (!existing) {
    throw new Error("Evidence not found.");
  }

  const data = parsed.data;
  const newSource = newSourceFromParsed(data);
  const updated = await updateEvidence(workspace.id, id, {
    title: data.title,
    description: data.description ?? null,
    evidence_type: data.evidence_type,
    strength: data.strength,
    direction: data.direction,
    source: data.source ?? existing.source,
    evidence_date: data.evidence_date,
    organisation_id: data.organisation_id ?? null,
    contact_id: data.contact_id ?? null,
    discovery_session_id: data.discovery_session_id ?? null,
    evidence_source_id: data.evidence_source_id ?? null,
    new_source: newSource,
  });

  if (!updated) {
    throw new Error("Evidence not found.");
  }

  revalidateEvidencePaths(updated.assumption_id, {
    discoverySessionId: updated.discovery_session_id,
    organisationId: updated.organisation_id,
    contactId: updated.contact_id,
  });
  return { ok: true as const, assumptionId: updated.assumption_id };
}

export async function deleteEvidenceAction(id: string) {
  const { workspace } = await requirePageContext();

  const deleted = await deleteEvidence(workspace.id, id);
  if (!deleted) {
    throw new Error("Evidence not found.");
  }

  revalidateEvidencePaths(deleted.assumption_id, {
    discoverySessionId: deleted.discovery_session_id,
    organisationId: deleted.organisation_id,
    contactId: deleted.contact_id,
  });
  return { ok: true as const, assumptionId: deleted.assumption_id };
}
