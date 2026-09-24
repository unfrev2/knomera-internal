import { getDb } from "@/lib/db/client";
import type { Organisation, OrganisationType } from "@/lib/types";

export type OrganisationInput = {
  name: string;
  website?: string | null;
  organisation_type?: OrganisationType;
  notes?: string | null;
};

export async function listOrganisations(
  workspaceId: string,
  search?: string,
): Promise<Organisation[]> {
  const sql = getDb();
  const query = search?.trim() ?? "";
  return sql<Organisation[]>`
    SELECT
      id,
      workspace_id,
      name,
      website,
      organisation_type,
      notes,
      created_by,
      created_at::text,
      updated_at::text
    FROM organisations
    WHERE workspace_id = ${workspaceId}
      AND (
        ${query} = ''
        OR name ILIKE ${"%" + query + "%"}
        OR COALESCE(website, '') ILIKE ${"%" + query + "%"}
      )
    ORDER BY name ASC
  `;
}

export async function getOrganisation(
  workspaceId: string,
  id: string,
): Promise<Organisation | null> {
  const sql = getDb();
  const rows = await sql<Organisation[]>`
    SELECT
      id,
      workspace_id,
      name,
      website,
      organisation_type,
      notes,
      created_by,
      created_at::text,
      updated_at::text
    FROM organisations
    WHERE workspace_id = ${workspaceId} AND id = ${id}
  `;
  return rows[0] ?? null;
}

export async function createOrganisation(
  workspaceId: string,
  createdBy: string,
  input: OrganisationInput,
): Promise<Organisation> {
  const sql = getDb();
  const rows = await sql<Organisation[]>`
    INSERT INTO organisations (
      workspace_id,
      name,
      website,
      organisation_type,
      notes,
      created_by
    ) VALUES (
      ${workspaceId},
      ${input.name},
      ${input.website ?? null},
      ${input.organisation_type ?? "prospect"},
      ${input.notes ?? null},
      ${createdBy}
    )
    RETURNING
      id,
      workspace_id,
      name,
      website,
      organisation_type,
      notes,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return rows[0];
}

export async function updateOrganisation(
  workspaceId: string,
  id: string,
  input: Partial<OrganisationInput>,
): Promise<Organisation | null> {
  const current = await getOrganisation(workspaceId, id);
  if (!current) return null;
  const sql = getDb();
  const rows = await sql<Organisation[]>`
    UPDATE organisations SET
      name = ${input.name ?? current.name},
      website = ${input.website === undefined ? current.website : input.website},
      organisation_type = ${input.organisation_type ?? current.organisation_type},
      notes = ${input.notes === undefined ? current.notes : input.notes}
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    RETURNING
      id,
      workspace_id,
      name,
      website,
      organisation_type,
      notes,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return rows[0] ?? null;
}
