import { getDb } from "@/lib/db/client";
import { listContactsForOrganisation } from "@/lib/db/contacts";
import { listEvidenceForOrganisation } from "@/lib/db/evidence";
import { listOpportunitiesForOrganisation } from "@/lib/db/opportunities";
import type {
  Contact,
  DiscoverySession,
  Evidence,
  Opportunity,
  Organisation,
  OrganisationType,
  Problem,
} from "@/lib/types";

export type OrganisationDetail = {
  organisation: Organisation;
  contacts: Contact[];
  sessions: DiscoverySession[];
  problems: Problem[];
  evidence: Evidence[];
  opportunities: Opportunity[];
};

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
      o.id,
      o.workspace_id,
      o.name,
      o.website,
      o.organisation_type,
      o.notes,
      o.created_by,
      o.created_at::text,
      o.updated_at::text,
      (
        SELECT COUNT(*)::int FROM contacts c
        WHERE c.organisation_id = o.id AND c.workspace_id = o.workspace_id
      ) AS contact_count,
      (
        SELECT COUNT(*)::int FROM discovery_sessions s
        WHERE s.organisation_id = o.id AND s.workspace_id = o.workspace_id
      ) AS discovery_count,
      (
        SELECT COUNT(DISTINCT e.id)::int
        FROM evidence e
        LEFT JOIN contacts c ON c.id = e.contact_id
        LEFT JOIN discovery_sessions s ON s.id = e.discovery_session_id
        LEFT JOIN opportunities opp ON opp.id = e.opportunity_id
        WHERE e.workspace_id = o.workspace_id
          AND (
            e.organisation_id = o.id
            OR c.organisation_id = o.id
            OR s.organisation_id = o.id
            OR opp.organisation_id = o.id
          )
      ) AS evidence_count,
      (
        SELECT COUNT(*)::int FROM opportunities opp
        WHERE opp.organisation_id = o.id
          AND opp.workspace_id = o.workspace_id
          AND opp.stage NOT IN ('won', 'lost')
      ) AS opportunity_count
    FROM organisations o
    WHERE o.workspace_id = ${workspaceId}
      AND (
        ${query} = ''
        OR o.name ILIKE ${"%" + query + "%"}
        OR COALESCE(o.website, '') ILIKE ${"%" + query + "%"}
      )
    ORDER BY o.name ASC
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

export async function listDiscoverySessionsForOrganisation(
  workspaceId: string,
  organisationId: string,
): Promise<DiscoverySession[]> {
  const sql = getDb();
  return sql<DiscoverySession[]>`
    SELECT
      s.id,
      s.workspace_id,
      s.organisation_id,
      s.contact_id,
      s.title,
      s.session_date::text,
      s.conducted_by,
      s.summary,
      s.raw_notes,
      s.created_by,
      s.created_at::text,
      s.updated_at::text,
      o.name AS organisation_name,
      c.name AS contact_name,
      c.role AS contact_role,
      COUNT(e.id)::int AS evidence_count
    FROM discovery_sessions s
    INNER JOIN organisations o ON o.id = s.organisation_id
    LEFT JOIN contacts c ON c.id = s.contact_id
    LEFT JOIN evidence e
      ON e.discovery_session_id = s.id AND e.workspace_id = s.workspace_id
    WHERE s.workspace_id = ${workspaceId}
      AND s.organisation_id = ${organisationId}
    GROUP BY s.id, o.name, c.name, c.role
    ORDER BY s.session_date DESC, s.created_at DESC
  `;
}

export async function listProblemsDiscussedByOrganisation(
  workspaceId: string,
  organisationId: string,
): Promise<Problem[]> {
  const sql = getDb();
  return sql<Problem[]>`
    SELECT
      p.id,
      p.workspace_id,
      p.seed_key,
      p.title,
      p.description,
      p.target_customer,
      p.severity,
      p.confidence,
      p.status,
      p.owner,
      p.created_by,
      p.created_at::text,
      p.updated_at::text
    FROM problems p
    WHERE p.workspace_id = ${workspaceId}
      AND EXISTS (
        SELECT 1
        FROM discovery_problems dp
        INNER JOIN discovery_sessions s ON s.id = dp.discovery_session_id
        WHERE dp.problem_id = p.id
          AND s.organisation_id = ${organisationId}
      )
    ORDER BY p.title ASC
  `;
}

export async function listEvidenceFromOrganisation(
  workspaceId: string,
  organisationId: string,
): Promise<Evidence[]> {
  return listEvidenceForOrganisation(workspaceId, organisationId);
}

/** Compact customer history — not a CRM record. */
export async function getOrganisationDetail(
  workspaceId: string,
  organisationId: string,
): Promise<OrganisationDetail | null> {
  const organisation = await getOrganisation(workspaceId, organisationId);
  if (!organisation) return null;

  const [contacts, sessions, problems, evidence, opportunities] =
    await Promise.all([
      listContactsForOrganisation(workspaceId, organisationId),
      listDiscoverySessionsForOrganisation(workspaceId, organisationId),
      listProblemsDiscussedByOrganisation(workspaceId, organisationId),
      listEvidenceFromOrganisation(workspaceId, organisationId),
      listOpportunitiesForOrganisation(workspaceId, organisationId),
    ]);

  return {
    organisation,
    contacts,
    sessions,
    problems,
    evidence,
    opportunities,
  };
}
