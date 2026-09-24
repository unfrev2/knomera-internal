import { getDb } from "@/lib/db/client";
import type {
  Evidence,
  Opportunity,
  OpportunityStage,
  Organisation,
} from "@/lib/types";

export type OpportunityFilters = {
  search?: string;
  stage?: OpportunityStage;
  owner?: string;
  organisation_id?: string;
};

export type OpportunityInput = {
  organisation_id: string;
  title: string;
  stage?: OpportunityStage;
  potential_value?: number | null;
  currency?: string;
  owner?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  outcome_reason?: string | null;
};

function mapOpportunity(row: Opportunity): Opportunity {
  return {
    ...row,
    potential_value:
      row.potential_value == null ? null : Number(row.potential_value),
  };
}

export async function listOpportunities(
  workspaceId: string,
  filters: OpportunityFilters = {},
): Promise<Opportunity[]> {
  const sql = getDb();
  const search = filters.search?.trim() ?? "";
  const stage = filters.stage ?? null;
  const owner = filters.owner?.trim() ?? "";
  const organisationId = filters.organisation_id?.trim() || null;

  const rows = await sql<Opportunity[]>`
    SELECT
      o.id,
      o.workspace_id,
      o.organisation_id,
      o.title,
      o.stage,
      o.potential_value,
      o.currency,
      o.owner,
      o.next_action,
      o.next_action_date::text,
      o.outcome_reason,
      o.created_by,
      o.created_at::text,
      o.updated_at::text,
      org.name AS organisation_name,
      COUNT(DISTINCT e.id)::int AS evidence_count
    FROM opportunities o
    INNER JOIN organisations org
      ON org.id = o.organisation_id AND org.workspace_id = o.workspace_id
    LEFT JOIN evidence e
      ON e.opportunity_id = o.id AND e.workspace_id = o.workspace_id
    WHERE o.workspace_id = ${workspaceId}
      AND (
        ${search} = ''
        OR o.title ILIKE ${"%" + search + "%"}
        OR org.name ILIKE ${"%" + search + "%"}
        OR COALESCE(o.next_action, '') ILIKE ${"%" + search + "%"}
      )
      AND (${stage}::text IS NULL OR o.stage::text = ${stage})
      AND (${owner === ""} OR o.owner ILIKE ${owner})
      AND (
        ${organisationId}::uuid IS NULL
        OR o.organisation_id = ${organisationId}::uuid
      )
    GROUP BY o.id, org.name
    ORDER BY
      CASE
        WHEN o.stage IN ('won', 'lost') THEN 1
        ELSE 0
      END ASC,
      o.next_action_date ASC NULLS LAST,
      o.updated_at DESC
  `;
  return rows.map(mapOpportunity);
}

export async function getOpportunity(
  workspaceId: string,
  id: string,
): Promise<Opportunity | null> {
  const sql = getDb();
  const rows = await sql<Opportunity[]>`
    SELECT
      o.id,
      o.workspace_id,
      o.organisation_id,
      o.title,
      o.stage,
      o.potential_value,
      o.currency,
      o.owner,
      o.next_action,
      o.next_action_date::text,
      o.outcome_reason,
      o.created_by,
      o.created_at::text,
      o.updated_at::text,
      org.name AS organisation_name,
      COUNT(DISTINCT e.id)::int AS evidence_count
    FROM opportunities o
    INNER JOIN organisations org
      ON org.id = o.organisation_id AND org.workspace_id = o.workspace_id
    LEFT JOIN evidence e
      ON e.opportunity_id = o.id AND e.workspace_id = o.workspace_id
    WHERE o.workspace_id = ${workspaceId} AND o.id = ${id}
    GROUP BY o.id, org.name
  `;
  return rows[0] ? mapOpportunity(rows[0]) : null;
}

export async function createOpportunity(
  workspaceId: string,
  createdBy: string,
  input: OpportunityInput,
): Promise<Opportunity> {
  const sql = getDb();
  const org = await sql<{ id: string }[]>`
    SELECT id FROM organisations
    WHERE id = ${input.organisation_id} AND workspace_id = ${workspaceId}
    LIMIT 1
  `;
  if (!org[0]) throw new Error("Organisation not found in this workspace.");

  const rows = await sql<Opportunity[]>`
    INSERT INTO opportunities (
      workspace_id,
      organisation_id,
      title,
      stage,
      potential_value,
      currency,
      owner,
      next_action,
      next_action_date,
      outcome_reason,
      created_by
    ) VALUES (
      ${workspaceId},
      ${input.organisation_id},
      ${input.title},
      ${input.stage ?? "prospect"},
      ${input.potential_value ?? null},
      ${input.currency ?? "GBP"},
      ${input.owner ?? null},
      ${input.next_action ?? null},
      ${input.next_action_date ?? null},
      ${input.outcome_reason ?? null},
      ${createdBy}
    )
    RETURNING
      id,
      workspace_id,
      organisation_id,
      title,
      stage,
      potential_value,
      currency,
      owner,
      next_action,
      next_action_date::text,
      outcome_reason,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return {
    ...mapOpportunity(rows[0]),
    evidence_count: 0,
  };
}

export async function updateOpportunity(
  workspaceId: string,
  id: string,
  input: Partial<OpportunityInput>,
): Promise<Opportunity | null> {
  const current = await getOpportunity(workspaceId, id);
  if (!current) return null;
  const sql = getDb();

  if (input.organisation_id) {
    const org = await sql<{ id: string }[]>`
      SELECT id FROM organisations
      WHERE id = ${input.organisation_id} AND workspace_id = ${workspaceId}
      LIMIT 1
    `;
    if (!org[0]) throw new Error("Organisation not found in this workspace.");
  }

  const rows = await sql<Opportunity[]>`
    UPDATE opportunities SET
      organisation_id = ${input.organisation_id ?? current.organisation_id},
      title = ${input.title ?? current.title},
      stage = ${input.stage ?? current.stage},
      potential_value = ${
        input.potential_value === undefined
          ? current.potential_value
          : input.potential_value
      },
      currency = ${input.currency ?? current.currency},
      owner = ${input.owner === undefined ? current.owner : input.owner},
      next_action = ${
        input.next_action === undefined
          ? current.next_action
          : input.next_action
      },
      next_action_date = ${
        input.next_action_date === undefined
          ? current.next_action_date
          : input.next_action_date
      },
      outcome_reason = ${
        input.outcome_reason === undefined
          ? current.outcome_reason
          : input.outcome_reason
      }
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    RETURNING
      id,
      workspace_id,
      organisation_id,
      title,
      stage,
      potential_value,
      currency,
      owner,
      next_action,
      next_action_date::text,
      outcome_reason,
      created_by,
      created_at::text,
      updated_at::text
  `;
  return rows[0]
    ? {
        ...mapOpportunity(rows[0]),
        organisation_name: current.organisation_name,
        evidence_count: current.evidence_count,
      }
    : null;
}

export async function listEvidenceForOpportunity(
  workspaceId: string,
  opportunityId: string,
): Promise<Evidence[]> {
  const sql = getDb();
  return sql<Evidence[]>`
    SELECT
      e.id,
      e.workspace_id,
      e.assumption_id,
      e.title,
      e.description,
      e.evidence_type,
      e.strength,
      e.direction,
      e.source,
      e.evidence_date::text,
      e.created_by,
      e.created_at::text,
      e.discovery_session_id,
      e.bet_outcome_id,
      e.opportunity_id,
      a.statement AS assumption_statement
    FROM evidence e
    INNER JOIN assumptions a ON a.id = e.assumption_id
    WHERE e.workspace_id = ${workspaceId}
      AND e.opportunity_id = ${opportunityId}
    ORDER BY e.evidence_date DESC, e.created_at DESC
  `;
}

export async function listOpportunitiesForOrganisation(
  workspaceId: string,
  organisationId: string,
): Promise<Opportunity[]> {
  return listOpportunities(workspaceId, { organisation_id: organisationId });
}

export async function getOrganisationForOpportunity(
  workspaceId: string,
  opportunityId: string,
): Promise<Organisation | null> {
  const sql = getDb();
  const rows = await sql<Organisation[]>`
    SELECT
      org.id,
      org.workspace_id,
      org.name,
      org.website,
      org.organisation_type,
      org.notes,
      org.created_by,
      org.created_at::text,
      org.updated_at::text
    FROM organisations org
    INNER JOIN opportunities o ON o.organisation_id = org.id
    WHERE o.workspace_id = ${workspaceId}
      AND o.id = ${opportunityId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}
