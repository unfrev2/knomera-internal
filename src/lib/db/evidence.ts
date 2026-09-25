import { getDb } from "@/lib/db/client";
import {
  isHttpUrl,
  resolveEvidenceAttribution,
  type EvidenceAttributionInput,
  type NewEvidenceSourceInput,
} from "@/lib/domain/evidence-attribution";
import type {
  Evidence,
  EvidenceDirection,
  EvidenceSourceKindFilter,
  EvidenceType,
} from "@/lib/types";

export type EvidenceInput = {
  assumption_id: string;
  title: string;
  description?: string | null;
  evidence_type: EvidenceType;
  strength: number;
  direction: EvidenceDirection;
  source?: string | null;
  evidence_date: string;
  discovery_session_id?: string | null;
  bet_outcome_id?: string | null;
  opportunity_id?: string | null;
  organisation_id?: string | null;
  contact_id?: string | null;
  evidence_source_id?: string | null;
  new_source?: NewEvidenceSourceInput | null;
};

export type EvidenceFilters = {
  evidence_type?: EvidenceType;
  strength?: number;
  direction?: EvidenceDirection;
  assumption_id?: string;
  source?: string;
  date_from?: string;
  date_to?: string;
  organisation_id?: string;
  contact_id?: string;
  discovery_session_id?: string;
  source_kind?: EvidenceSourceKindFilter;
  q?: string;
};

export type EvidenceUpdateInput = {
  title: string;
  description?: string | null;
  evidence_type: EvidenceType;
  strength: number;
  direction: EvidenceDirection;
  source?: string | null;
  evidence_date: string;
  discovery_session_id?: string | null;
  organisation_id?: string | null;
  contact_id?: string | null;
  evidence_source_id?: string | null;
  new_source?: NewEvidenceSourceInput | null;
};

export type EvidenceAttributionOption = {
  organisations: { id: string; name: string }[];
  contacts: {
    id: string;
    name: string;
    role: string | null;
    organisation_id: string;
    organisation_name: string;
  }[];
  sessions: {
    id: string;
    title: string;
    session_date: string;
    organisation_id: string;
    contact_id: string | null;
  }[];
  sources: {
    id: string;
    type: string;
    title: string;
    url: string | null;
    description: string | null;
  }[];
};

async function insertEvidenceSource(
  sql: ReturnType<typeof getDb>,
  workspaceId: string,
  createdBy: string,
  input: NewEvidenceSourceInput,
): Promise<string> {
  const title = input.title.trim();
  if (!title) throw new Error("Source title is required.");
  if (input.type === "link") {
    const url = input.url?.trim() ?? "";
    if (!url || !isHttpUrl(url)) {
      throw new Error("A valid URL is required for a link source.");
    }
  }

  const rows = await sql<{ id: string }[]>`
    INSERT INTO evidence_sources (
      workspace_id, type, title, url, description, created_by
    ) VALUES (
      ${workspaceId},
      ${input.type},
      ${title},
      ${input.type === "link" ? (input.url?.trim() ?? null) : null},
      ${input.description?.trim() || null},
      ${createdBy}
    )
    RETURNING id
  `;
  return rows[0].id;
}

async function persistAttribution(
  sql: ReturnType<typeof getDb>,
  workspaceId: string,
  createdBy: string,
  input: EvidenceAttributionInput & { new_source?: NewEvidenceSourceInput | null },
) {
  let sourceId = input.evidence_source_id ?? null;
  if (input.new_source) {
    sourceId = await insertEvidenceSource(sql, workspaceId, createdBy, input.new_source);
  }
  return resolveEvidenceAttribution(sql, workspaceId, {
    organisation_id: input.organisation_id,
    contact_id: input.contact_id,
    discovery_session_id: input.discovery_session_id,
    evidence_source_id: sourceId,
  });
}

export async function getEvidenceAttributionOptions(
  workspaceId: string,
): Promise<EvidenceAttributionOption> {
  const sql = getDb();
  const [organisations, contacts, sessions, sources] = await Promise.all([
    sql<{ id: string; name: string }[]>`
      SELECT id, name
      FROM organisations
      WHERE workspace_id = ${workspaceId}
      ORDER BY name ASC
    `,
    sql<
      {
        id: string;
        name: string;
        role: string | null;
        organisation_id: string;
        organisation_name: string;
      }[]
    >`
      SELECT
        c.id,
        c.name,
        c.role,
        c.organisation_id,
        o.name AS organisation_name
      FROM contacts c
      INNER JOIN organisations o ON o.id = c.organisation_id
      WHERE c.workspace_id = ${workspaceId}
      ORDER BY c.name ASC
    `,
    sql<
      {
        id: string;
        title: string;
        session_date: string;
        organisation_id: string;
        contact_id: string | null;
      }[]
    >`
      SELECT
        id,
        title,
        session_date::text,
        organisation_id,
        contact_id
      FROM discovery_sessions
      WHERE workspace_id = ${workspaceId}
      ORDER BY session_date DESC, created_at DESC
    `,
    sql<
      {
        id: string;
        type: string;
        title: string;
        url: string | null;
        description: string | null;
      }[]
    >`
      SELECT id, type::text AS type, title, url, description
      FROM evidence_sources
      WHERE workspace_id = ${workspaceId}
      ORDER BY title ASC
    `,
  ]);

  return { organisations, contacts, sessions, sources };
}

export async function listEvidenceForAssumption(
  workspaceId: string,
  assumptionId: string,
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
      e.organisation_id,
      e.contact_id,
      e.evidence_source_id,
      a.statement AS assumption_statement,
      org.name AS organisation_name,
      ct.name AS contact_name,
      ct.role AS contact_role,
      ds.title AS discovery_title,
      ds.session_date::text AS discovery_session_date,
      es.title AS source_title,
      es.type::text AS source_type,
      es.url AS source_url,
      es.description AS source_description
    FROM evidence e
    INNER JOIN assumptions a
      ON a.id = e.assumption_id AND a.workspace_id = e.workspace_id
    LEFT JOIN organisations org ON org.id = e.organisation_id
    LEFT JOIN contacts ct ON ct.id = e.contact_id
    LEFT JOIN discovery_sessions ds ON ds.id = e.discovery_session_id
    LEFT JOIN evidence_sources es ON es.id = e.evidence_source_id
    WHERE e.workspace_id = ${workspaceId}
      AND e.assumption_id = ${assumptionId}
    ORDER BY e.evidence_date ASC, e.created_at ASC
  `;
}

export async function listEvidence(
  workspaceId: string,
  filters: EvidenceFilters = {},
): Promise<Evidence[]> {
  const sql = getDb();
  const type = filters.evidence_type ?? null;
  const strength = filters.strength ?? null;
  const direction = filters.direction ?? null;
  const assumptionId = filters.assumption_id?.trim() || null;
  const source = filters.source?.trim() || null;
  const dateFrom = filters.date_from?.trim() || null;
  const dateTo = filters.date_to?.trim() || null;
  const organisationId = filters.organisation_id?.trim() || null;
  const contactId = filters.contact_id?.trim() || null;
  const sessionId = filters.discovery_session_id?.trim() || null;
  const sourceKind = filters.source_kind ?? null;
  const q = filters.q?.trim() || null;
  const pattern = q ? `%${q}%` : null;

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
      e.organisation_id,
      e.contact_id,
      e.evidence_source_id,
      a.statement AS assumption_statement,
      org.name AS organisation_name,
      ct.name AS contact_name,
      ct.role AS contact_role,
      ds.title AS discovery_title,
      ds.session_date::text AS discovery_session_date,
      es.title AS source_title,
      es.type::text AS source_type,
      es.url AS source_url,
      es.description AS source_description
    FROM evidence e
    INNER JOIN assumptions a
      ON a.id = e.assumption_id AND a.workspace_id = e.workspace_id
    LEFT JOIN organisations org ON org.id = e.organisation_id
    LEFT JOIN contacts ct ON ct.id = e.contact_id
    LEFT JOIN discovery_sessions ds ON ds.id = e.discovery_session_id
    LEFT JOIN evidence_sources es ON es.id = e.evidence_source_id
    WHERE e.workspace_id = ${workspaceId}
      AND (${type}::text IS NULL OR e.evidence_type::text = ${type})
      AND (${strength}::int IS NULL OR e.strength = ${strength})
      AND (${direction}::text IS NULL OR e.direction::text = ${direction})
      AND (${assumptionId}::uuid IS NULL OR e.assumption_id = ${assumptionId}::uuid)
      AND (${source}::text IS NULL OR e.source = ${source})
      AND (${dateFrom}::date IS NULL OR e.evidence_date >= ${dateFrom}::date)
      AND (${dateTo}::date IS NULL OR e.evidence_date <= ${dateTo}::date)
      AND (${organisationId}::uuid IS NULL OR e.organisation_id = ${organisationId}::uuid)
      AND (${contactId}::uuid IS NULL OR e.contact_id = ${contactId}::uuid)
      AND (${sessionId}::uuid IS NULL OR e.discovery_session_id = ${sessionId}::uuid)
      AND (
        ${sourceKind}::text IS NULL
        OR (${sourceKind} = 'organisation' AND e.organisation_id IS NOT NULL)
        OR (${sourceKind} = 'contact' AND e.contact_id IS NOT NULL)
        OR (${sourceKind} = 'discovery' AND e.discovery_session_id IS NOT NULL)
        OR (${sourceKind} = 'link' AND es.type = 'link')
        OR (${sourceKind} = 'other' AND es.type = 'free_text')
        OR (
          ${sourceKind} = 'none'
          AND e.organisation_id IS NULL
          AND e.contact_id IS NULL
          AND e.discovery_session_id IS NULL
          AND e.evidence_source_id IS NULL
          AND (e.source IS NULL OR trim(e.source) = '')
        )
      )
      AND (
        ${pattern}::text IS NULL
        OR e.title ILIKE ${pattern}
        OR COALESCE(e.description, '') ILIKE ${pattern}
        OR COALESCE(e.source, '') ILIKE ${pattern}
        OR a.statement ILIKE ${pattern}
        OR COALESCE(org.name, '') ILIKE ${pattern}
        OR COALESCE(ct.name, '') ILIKE ${pattern}
        OR COALESCE(ds.title, '') ILIKE ${pattern}
        OR COALESCE(es.title, '') ILIKE ${pattern}
      )
    ORDER BY e.evidence_date DESC, e.created_at DESC
  `;
}

export async function getEvidence(
  workspaceId: string,
  id: string,
): Promise<Evidence | null> {
  const sql = getDb();
  const rows = await sql<Evidence[]>`
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
      e.organisation_id,
      e.contact_id,
      e.evidence_source_id,
      a.statement AS assumption_statement,
      org.name AS organisation_name,
      ct.name AS contact_name,
      ct.role AS contact_role,
      ds.title AS discovery_title,
      ds.session_date::text AS discovery_session_date,
      es.title AS source_title,
      es.type::text AS source_type,
      es.url AS source_url,
      es.description AS source_description
    FROM evidence e
    INNER JOIN assumptions a
      ON a.id = e.assumption_id AND a.workspace_id = e.workspace_id
    LEFT JOIN organisations org ON org.id = e.organisation_id
    LEFT JOIN contacts ct ON ct.id = e.contact_id
    LEFT JOIN discovery_sessions ds ON ds.id = e.discovery_session_id
    LEFT JOIN evidence_sources es ON es.id = e.evidence_source_id
    WHERE e.workspace_id = ${workspaceId} AND e.id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listEvidenceSources(
  workspaceId: string,
): Promise<string[]> {
  const sql = getDb();
  const rows = await sql<{ source: string }[]>`
    SELECT DISTINCT source
    FROM evidence
    WHERE workspace_id = ${workspaceId}
      AND source IS NOT NULL
      AND trim(source) <> ''
    ORDER BY source ASC
  `;
  return rows.map((row) => row.source);
}

export async function createEvidence(
  workspaceId: string,
  createdBy: string,
  input: EvidenceInput,
): Promise<Evidence> {
  const sql = getDb();

  const assumption = await sql<{ id: string }[]>`
    SELECT id FROM assumptions
    WHERE id = ${input.assumption_id} AND workspace_id = ${workspaceId}
    LIMIT 1
  `;
  if (!assumption[0]) {
    throw new Error("Assumption not found in this workspace.");
  }

  const createdId = await sql.begin(async (tx) => {
    const attribution = await persistAttribution(
      tx as unknown as ReturnType<typeof getDb>,
      workspaceId,
      createdBy,
      input,
    );
    const rows = await tx<{ id: string }[]>`
    INSERT INTO evidence (
      workspace_id,
      assumption_id,
      title,
      description,
      evidence_type,
      strength,
      direction,
      source,
      evidence_date,
      created_by,
      discovery_session_id,
      bet_outcome_id,
      opportunity_id,
      organisation_id,
      contact_id,
      evidence_source_id
    ) VALUES (
      ${workspaceId},
      ${input.assumption_id},
      ${input.title},
      ${input.description ?? null},
      ${input.evidence_type},
      ${input.strength},
      ${input.direction},
      ${input.source ?? null},
      ${input.evidence_date},
      ${createdBy},
      ${attribution.discovery_session_id},
      ${input.bet_outcome_id ?? null},
      ${input.opportunity_id ?? null},
      ${attribution.organisation_id},
      ${attribution.contact_id},
      ${attribution.evidence_source_id}
    )
    RETURNING id
  `;
    return rows[0].id;
  });

  const created = await getEvidence(workspaceId, createdId);
  if (!created) throw new Error("Evidence could not be loaded after save.");
  return created;
}

export async function updateEvidence(
  workspaceId: string,
  id: string,
  input: EvidenceUpdateInput,
): Promise<Evidence | null> {
  const existing = await getEvidence(workspaceId, id);
  if (!existing) return null;

  const sql = getDb();
  await sql.begin(async (tx) => {
    const attribution = await persistAttribution(
      tx as unknown as ReturnType<typeof getDb>,
      workspaceId,
      existing.created_by ?? "unknown",
      {
        organisation_id: input.organisation_id,
        contact_id: input.contact_id,
        discovery_session_id: input.discovery_session_id,
        evidence_source_id: input.evidence_source_id,
        new_source: input.new_source,
      },
    );

    await tx`
      UPDATE evidence SET
        title = ${input.title},
        description = ${input.description ?? null},
        evidence_type = ${input.evidence_type},
        strength = ${input.strength},
        direction = ${input.direction},
        source = ${input.source ?? existing.source},
        evidence_date = ${input.evidence_date},
        organisation_id = ${attribution.organisation_id},
        contact_id = ${attribution.contact_id},
        discovery_session_id = ${attribution.discovery_session_id},
        evidence_source_id = ${attribution.evidence_source_id}
      WHERE workspace_id = ${workspaceId} AND id = ${id}
    `;
  });

  return getEvidence(workspaceId, id);
}

export async function deleteEvidence(
  workspaceId: string,
  id: string,
): Promise<Evidence | null> {
  const existing = await getEvidence(workspaceId, id);
  if (!existing) return null;
  const sql = getDb();
  await sql`
    DELETE FROM evidence
    WHERE workspace_id = ${workspaceId} AND id = ${id}
  `;
  return existing;
}

export async function listEvidenceByAssumptionIds(
  workspaceId: string,
  assumptionIds: string[],
): Promise<Evidence[]> {
  if (assumptionIds.length === 0) return [];
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
      e.organisation_id,
      e.contact_id,
      e.evidence_source_id
    FROM evidence e
    WHERE e.workspace_id = ${workspaceId}
      AND e.assumption_id IN ${sql(assumptionIds)}
  `;
}

export async function listEvidenceForOrganisation(
  workspaceId: string,
  organisationId: string,
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
      e.direction,
      e.strength,
      e.source,
      e.evidence_date::text,
      e.created_by,
      e.created_at::text,
      e.discovery_session_id,
      e.bet_outcome_id,
      e.opportunity_id,
      e.organisation_id,
      e.contact_id,
      e.evidence_source_id,
      a.statement AS assumption_statement,
      org.name AS organisation_name,
      ct.name AS contact_name,
      ct.role AS contact_role,
      ds.title AS discovery_title,
      ds.session_date::text AS discovery_session_date,
      es.title AS source_title,
      es.type::text AS source_type,
      es.url AS source_url,
      es.description AS source_description
    FROM evidence e
    INNER JOIN assumptions a ON a.id = e.assumption_id
    LEFT JOIN organisations org ON org.id = e.organisation_id
    LEFT JOIN contacts ct ON ct.id = e.contact_id
    LEFT JOIN discovery_sessions ds ON ds.id = e.discovery_session_id
    LEFT JOIN evidence_sources es ON es.id = e.evidence_source_id
    LEFT JOIN opportunities opp ON opp.id = e.opportunity_id
    WHERE e.workspace_id = ${workspaceId}
      AND (
        e.organisation_id = ${organisationId}
        OR ct.organisation_id = ${organisationId}
        OR ds.organisation_id = ${organisationId}
        OR opp.organisation_id = ${organisationId}
      )
    ORDER BY e.evidence_date DESC, e.created_at DESC
  `;
}

export async function listEvidenceForContact(
  workspaceId: string,
  contactId: string,
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
      e.direction,
      e.strength,
      e.source,
      e.evidence_date::text,
      e.created_by,
      e.created_at::text,
      e.discovery_session_id,
      e.organisation_id,
      e.contact_id,
      e.evidence_source_id,
      a.statement AS assumption_statement,
      org.name AS organisation_name,
      ct.name AS contact_name,
      ct.role AS contact_role,
      ds.title AS discovery_title,
      ds.session_date::text AS discovery_session_date,
      es.title AS source_title,
      es.type::text AS source_type,
      es.url AS source_url,
      es.description AS source_description
    FROM evidence e
    INNER JOIN assumptions a ON a.id = e.assumption_id
    LEFT JOIN organisations org ON org.id = e.organisation_id
    LEFT JOIN contacts ct ON ct.id = e.contact_id
    LEFT JOIN discovery_sessions ds ON ds.id = e.discovery_session_id
    LEFT JOIN evidence_sources es ON es.id = e.evidence_source_id
    WHERE e.workspace_id = ${workspaceId}
      AND (
        e.contact_id = ${contactId}
        OR ds.contact_id = ${contactId}
      )
    ORDER BY e.evidence_date DESC, e.created_at DESC
  `;
}
