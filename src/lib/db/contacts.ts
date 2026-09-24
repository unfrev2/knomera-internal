import { getDb } from "@/lib/db/client";
import type { Contact } from "@/lib/types";

export type ContactInput = {
  organisation_id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  notes?: string | null;
};

export async function listContactsForOrganisation(
  workspaceId: string,
  organisationId: string,
): Promise<Contact[]> {
  const sql = getDb();
  return sql<Contact[]>`
    SELECT
      id,
      workspace_id,
      organisation_id,
      name,
      role,
      email,
      notes,
      created_by,
      created_at::text,
      updated_at::text
    FROM contacts
    WHERE workspace_id = ${workspaceId}
      AND organisation_id = ${organisationId}
    ORDER BY name ASC
  `;
}

export async function getContact(
  workspaceId: string,
  id: string,
): Promise<Contact | null> {
  const sql = getDb();
  const rows = await sql<Contact[]>`
    SELECT
      id,
      workspace_id,
      organisation_id,
      name,
      role,
      email,
      notes,
      created_by,
      created_at::text,
      updated_at::text
    FROM contacts
    WHERE workspace_id = ${workspaceId} AND id = ${id}
  `;
  return rows[0] ?? null;
}

export async function createContact(
  workspaceId: string,
  createdBy: string,
  input: ContactInput,
): Promise<Contact> {
  const sql = getDb();
  const rows = await sql<Contact[]>`
    INSERT INTO contacts (
      workspace_id,
      organisation_id,
      name,
      role,
      email,
      notes,
      created_by
    ) VALUES (
      ${workspaceId},
      ${input.organisation_id},
      ${input.name},
      ${input.role ?? null},
      ${input.email ?? null},
      ${input.notes ?? null},
      ${createdBy}
    )
    RETURNING
      id,
      workspace_id,
      organisation_id,
      name,
      role,
      email,
      notes,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return rows[0];
}

export async function updateContact(
  workspaceId: string,
  id: string,
  input: Partial<Omit<ContactInput, "organisation_id">>,
): Promise<Contact | null> {
  const current = await getContact(workspaceId, id);
  if (!current) return null;
  const sql = getDb();
  const rows = await sql<Contact[]>`
    UPDATE contacts SET
      name = ${input.name ?? current.name},
      role = ${input.role === undefined ? current.role : input.role},
      email = ${input.email === undefined ? current.email : input.email},
      notes = ${input.notes === undefined ? current.notes : input.notes}
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    RETURNING
      id,
      workspace_id,
      organisation_id,
      name,
      role,
      email,
      notes,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return rows[0] ?? null;
}
