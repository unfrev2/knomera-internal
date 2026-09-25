"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePageContext } from "@/lib/auth/context";
import { createContact, updateContact } from "@/lib/db/contacts";
import {
  createDiscoverySession,
  linkDiscoveryProblem,
  unlinkDiscoveryProblem,
  updateDiscoverySession,
} from "@/lib/db/discovery";
import {
  createOrganisation,
  updateOrganisation,
} from "@/lib/db/organisations";
import { ORGANISATION_TYPES } from "@/lib/types";

function optionalText(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

export async function createOrganisationAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Organisation name is required.");

  const typeRaw = String(formData.get("organisation_type") ?? "prospect");
  const organisation_type = ORGANISATION_TYPES.includes(
    typeRaw as (typeof ORGANISATION_TYPES)[number],
  )
    ? (typeRaw as (typeof ORGANISATION_TYPES)[number])
    : "prospect";

  const org = await createOrganisation(workspace.id, user.id, {
    name,
    website: optionalText(formData.get("website")),
    organisation_type,
    notes: optionalText(formData.get("notes")),
  });

  revalidatePath("/discovery");
  revalidatePath("/organisations");
  revalidatePath("/contacts");
  return org;
}

export async function updateOrganisationAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const id = optionalText(formData.get("id"));
  if (!id) throw new Error("Missing organisation id.");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Organisation name is required.");

  const typeRaw = String(formData.get("organisation_type") ?? "prospect");
  const organisation_type = ORGANISATION_TYPES.includes(
    typeRaw as (typeof ORGANISATION_TYPES)[number],
  )
    ? (typeRaw as (typeof ORGANISATION_TYPES)[number])
    : "prospect";

  const updated = await updateOrganisation(workspace.id, id, {
    name,
    website: optionalText(formData.get("website")),
    organisation_type,
    notes: optionalText(formData.get("notes")),
  });
  if (!updated) throw new Error("Organisation not found.");

  revalidatePath("/discovery");
  revalidatePath("/organisations");
  revalidatePath(`/organisations/${id}`);
  return updated;
}

export async function createContactAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const organisation_id = optionalText(formData.get("organisation_id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!organisation_id || !name) {
    throw new Error("Organisation and contact name are required.");
  }

  const contact = await createContact(workspace.id, user.id, {
    organisation_id,
    name,
    role: optionalText(formData.get("role")),
    email: optionalText(formData.get("email")),
    notes: optionalText(formData.get("notes")),
  });

  revalidatePath("/discovery");
  revalidatePath("/organisations");
  revalidatePath("/contacts");
  revalidatePath(`/organisations/${organisation_id}`);
  return contact;
}

export async function updateContactAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const id = optionalText(formData.get("id"));
  if (!id) throw new Error("Missing contact id.");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Contact name is required.");

  const updated = await updateContact(workspace.id, id, {
    name,
    role: optionalText(formData.get("role")),
    email: optionalText(formData.get("email")),
    notes: optionalText(formData.get("notes")),
  });
  if (!updated) throw new Error("Contact not found.");

  revalidatePath("/discovery");
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return updated;
}

const sessionSchema = z.object({
  organisation_id: z.string().uuid(),
  contact_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1, "Title is required."),
  session_date: z.string().date(),
  conducted_by: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  raw_notes: z.string().nullable().optional(),
});

export async function createDiscoverySessionAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const parsed = sessionSchema.safeParse({
    organisation_id: String(formData.get("organisation_id") ?? ""),
    contact_id: optionalText(formData.get("contact_id")),
    title: String(formData.get("title") ?? ""),
    session_date: String(formData.get("session_date") ?? ""),
    conducted_by: optionalText(formData.get("conducted_by")) ?? user.id,
    summary: optionalText(formData.get("summary")),
    raw_notes: optionalText(formData.get("raw_notes")),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const session = await createDiscoverySession(workspace.id, user.id, {
    organisation_id: parsed.data.organisation_id,
    contact_id: parsed.data.contact_id ?? null,
    title: parsed.data.title,
    session_date: parsed.data.session_date,
    conducted_by: parsed.data.conducted_by ?? user.id,
    summary: parsed.data.summary ?? null,
    raw_notes: parsed.data.raw_notes ?? null,
  });

  revalidatePath("/discovery");
  redirect(`/discovery/${session.id}`);
}

export async function updateDiscoverySessionAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const id = optionalText(formData.get("id"));
  if (!id) throw new Error("Missing session id.");

  const parsed = sessionSchema.safeParse({
    organisation_id: String(formData.get("organisation_id") ?? ""),
    contact_id: optionalText(formData.get("contact_id")),
    title: String(formData.get("title") ?? ""),
    session_date: String(formData.get("session_date") ?? ""),
    conducted_by: optionalText(formData.get("conducted_by")),
    summary: optionalText(formData.get("summary")),
    raw_notes: optionalText(formData.get("raw_notes")),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid form data.");
  }

  const updated = await updateDiscoverySession(workspace.id, id, {
    organisation_id: parsed.data.organisation_id,
    contact_id: parsed.data.contact_id ?? null,
    title: parsed.data.title,
    session_date: parsed.data.session_date,
    conducted_by: parsed.data.conducted_by ?? null,
    summary: parsed.data.summary ?? null,
    raw_notes: parsed.data.raw_notes ?? null,
  });
  if (!updated) throw new Error("Discovery session not found.");

  revalidatePath("/discovery");
  revalidatePath(`/discovery/${id}`);
  redirect(`/discovery/${id}`);
}

export async function linkProblemToDiscoveryAction(formData: FormData) {
  const { user, workspace } = await requirePageContext();
  const sessionId = optionalText(formData.get("discovery_session_id"));
  const problemId = optionalText(formData.get("problem_id"));
  if (!sessionId || !problemId) {
    throw new Error("Session and problem are required.");
  }

  await linkDiscoveryProblem(workspace.id, sessionId, problemId, user.id);
  revalidatePath(`/discovery/${sessionId}`);
  revalidatePath(`/problems/${problemId}`);
}

export async function unlinkProblemFromDiscoveryAction(formData: FormData) {
  const { workspace } = await requirePageContext();
  const sessionId = optionalText(formData.get("discovery_session_id"));
  const problemId = optionalText(formData.get("problem_id"));
  if (!sessionId || !problemId) {
    throw new Error("Session and problem are required.");
  }

  await unlinkDiscoveryProblem(workspace.id, sessionId, problemId);
  revalidatePath(`/discovery/${sessionId}`);
  revalidatePath(`/problems/${problemId}`);
}
