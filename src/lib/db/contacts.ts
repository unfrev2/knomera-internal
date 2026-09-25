import { getDb } from "@/lib/db/client";
import { listDiscoverySessionsForContact } from "@/lib/db/discovery";
import { listEvidenceForContact } from "@/lib/db/evidence";
import { listOpportunitiesForOrganisation } from "@/lib/db/opportunities";
import type { Contact, DiscoverySession, Evidence, Opportunity, Organisation } from "@/lib/types";

export type ContactInput = {
  organisation_id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  notes?: string | null;
};

export type ContactDetail = {
  contact: Contact;
  organisation: Organisation;
  sessions: DiscoverySession[];
  evidence: Evidence[];
  opportunities: Opportunity[];
};

export async function listContacts(
  workspaceId: string,
  search?: string,
): Promise<Contact[]> {
  const sql = getDb();
  const query = search?.trim() ?? "";
  return sql<Contact[]>`
    SELECT
      c.id,
      c.workspace_id,
      c.organisation_id,
      c.name,
      c.role,
      c.email,
      c.notes,
      c.created_by,
      c.created_at::text,
      c.updated_at::text,
      o.name AS organisation_name,
      (
        SELECT COUNT(*)::int FROM discovery_sessions s
        WHERE s.contact_id = c.id AND s.workspace_id = c.workspace_id
      ) AS discovery_count,
      (
        SELECT COUNT(DISTINCT e.id)::int
        FROM evidence e
        LEFT JOIN discovery_sessions s ON s.id = e.discovery_session_id
        WHERE e.workspace_id = c.workspace_id
          AND (e.contact_id = c.id OR s.contact_id = c.id)
      ) AS evidence_count
    FROM contacts c
    INNER JOIN organisations o ON o.id = c.organisation_id
    WHERE c.workspace_id = ${workspaceId}
      AND (
        ${query} = ''
        OR c.name ILIKE ${"%" + query + "%"}
        OR COALESCE(c.role, '') ILIKE ${"%" + query + "%"}
        OR o.name ILIKE ${"%" + query + "%"}
      )
    ORDER BY c.name ASC
  `;
}

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
      c.id,
      c.workspace_id,
      c.organisation_id,
      c.name,
      c.role,
      c.email,
      c.notes,
      c.created_by,
      c.created_at::text,
      c.updated_at::text,
      o.name AS organisation_name
    FROM contacts c
    INNER JOIN organisations o ON o.id = c.organisation_id
    WHERE c.workspace_id = ${workspaceId} AND c.id = ${id}
  `;
  return rows[0] ?? null;
}

export async function getContactDetail(
  workspaceId: string,
  id: string,
): Promise<ContactDetail | null> {
  const contact = await getContact(workspaceId, id);
  if (!contact) return null;
  const sql = getDb();
  const orgRows = await sql<Organisation[]>`
    SELECT
      id, workspace_id, name, website, organisation_type, notes,
      created_by, created_at::text, updated_at::text
    FROM organisations
    WHERE workspace_id = ${workspaceId} AND id = ${contact.organisation_id}
  `;
  const organisation = orgRows[0];
  if (!organisation) return null;

  const [sessions, evidence, opportunities] = await Promise.all([
    listDiscoverySessionsForContact(workspaceId, id),
    listEvidenceForContact(workspaceId, id),
    listOpportunitiesForOrganisation(workspaceId, contact.organisation_id),
  ]);

  return { contact, organisation, sessions, evidence, opportunities };
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
