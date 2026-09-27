import { getDb } from "@/lib/db/client";
import { createEvidence } from "@/lib/db/evidence";
import { AI_ACTOR_ID } from "@/lib/domain/actors";
import { canonicaliseUrl } from "@/lib/research/url-canonical";
import type {
  Evidence,
  EvidenceDirection,
  EvidenceType,
  ResearchFinding,
  ResearchFindingAssumption,
  ResearchFindingStatus,
  ResearchType,
} from "@/lib/types";

export type ResearchFindingSourceRow = {
  evidence_source_id: string;
  title: string;
  url: string | null;
  canonical_url: string | null;
  published_at: string | null;
  type: string;
};

export type ResearchFindingDetail = ResearchFinding & {
  organisation_name: string | null;
  assumptions: Array<
    ResearchFindingAssumption & {
      assumption_statement: string;
    }
  >;
  sources: ResearchFindingSourceRow[];
};

export type CreateFindingInput = {
  research_run_id: string;
  research_type: ResearchType;
  organisation_id?: string | null;
  claim: string;
  summary?: string | null;
  ai_confidence?: number | null;
  suggested_strength?: number | null;
  assumptions: Array<{
    assumption_id: string;
    direction: EvidenceDirection;
    relevance?: string | null;
    reason?: string | null;
  }>;
  sources: Array<{
    title: string;
    url: string;
    published_at?: string | null;
    description?: string | null;
  }>;
};

/** Create pending finding with assumption + source links. */
export async function insertPendingResearchFinding(
  workspaceId: string,
  createdBy: string,
  input: CreateFindingInput,
): Promise<ResearchFinding> {
  const sql = getDb();

  const createdId = await sql.begin(async (tx) => {
    const findingRows = await tx<{ id: string }[]>`
      INSERT INTO research_findings (
        workspace_id,
        research_run_id,
        research_type,
        organisation_id,
        claim,
        summary,
        status,
        ai_confidence,
        suggested_strength
      ) VALUES (
        ${workspaceId},
        ${input.research_run_id},
        ${input.research_type},
        ${input.organisation_id ?? null},
        ${input.claim.trim()},
        ${input.summary?.trim() || null},
        'pending',
        ${input.ai_confidence ?? null},
        ${input.suggested_strength ?? null}
      )
      RETURNING id
    `;
    const findingId = findingRows[0].id;

    for (const link of input.assumptions) {
      await tx`
        INSERT INTO research_finding_assumptions (
          research_finding_id,
          assumption_id,
          workspace_id,
          direction,
          relevance,
          reason
        ) VALUES (
          ${findingId},
          ${link.assumption_id},
          ${workspaceId},
          ${link.direction},
          ${link.relevance ?? null},
          ${link.reason ?? null}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    for (const source of input.sources) {
      const canonical = canonicaliseUrl(source.url);
      let sourceId: string | null = null;
      if (canonical) {
        const existing = await tx<{ id: string }[]>`
          SELECT id FROM evidence_sources
          WHERE workspace_id = ${workspaceId}
            AND canonical_url = ${canonical}
          LIMIT 1
        `;
        sourceId = existing[0]?.id ?? null;
      }
      if (!sourceId) {
        const inserted = await tx<{ id: string }[]>`
          INSERT INTO evidence_sources (
            workspace_id,
            type,
            title,
            url,
            description,
            canonical_url,
            published_at,
            retrieved_at,
            created_by
          ) VALUES (
            ${workspaceId},
            'link',
            ${source.title.trim()},
            ${source.url.trim()},
            ${source.description?.trim() || null},
            ${canonical},
            ${source.published_at ?? null},
            now(),
            ${createdBy}
          )
          RETURNING id
        `;
        sourceId = inserted[0].id;
      }
      await tx`
        INSERT INTO research_finding_sources (
          research_finding_id,
          evidence_source_id,
          workspace_id
        ) VALUES (
          ${findingId},
          ${sourceId},
          ${workspaceId}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    return findingId;
  });

  const detail = await getResearchFinding(workspaceId, createdId);
  if (!detail) throw new Error("Finding could not be loaded after create.");
  return detail;
}

export async function getResearchFinding(
  workspaceId: string,
  findingId: string,
): Promise<ResearchFindingDetail | null> {
  const sql = getDb();
  const rows = await sql<
    Array<
      ResearchFinding & {
        organisation_name: string | null;
      }
    >
  >`
    SELECT
      f.id,
      f.workspace_id,
      f.research_run_id,
      f.research_type,
      f.organisation_id,
      f.claim,
      f.summary,
      f.status,
      f.ai_confidence,
      f.suggested_strength,
      f.created_at::text,
      f.reviewed_by,
      f.reviewed_at::text,
      f.rejection_reason,
      o.name AS organisation_name
    FROM research_findings f
    LEFT JOIN organisations o ON o.id = f.organisation_id
    WHERE f.workspace_id = ${workspaceId} AND f.id = ${findingId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  const assumptions = await sql<
    Array<
      ResearchFindingAssumption & { assumption_statement: string }
    >
  >`
    SELECT
      rfa.research_finding_id,
      rfa.assumption_id,
      rfa.workspace_id,
      rfa.direction,
      rfa.relevance,
      rfa.reason,
      rfa.created_at::text,
      a.statement AS assumption_statement
    FROM research_finding_assumptions rfa
    INNER JOIN assumptions a
      ON a.id = rfa.assumption_id AND a.workspace_id = rfa.workspace_id
    WHERE rfa.workspace_id = ${workspaceId}
      AND rfa.research_finding_id = ${findingId}
    ORDER BY a.statement ASC
  `;

  const sources = await sql<ResearchFindingSourceRow[]>`
    SELECT
      rfs.evidence_source_id,
      es.title,
      es.url,
      es.canonical_url,
      es.published_at::text AS published_at,
      es.type::text AS type
    FROM research_finding_sources rfs
    INNER JOIN evidence_sources es
      ON es.id = rfs.evidence_source_id AND es.workspace_id = rfs.workspace_id
    WHERE rfs.workspace_id = ${workspaceId}
      AND rfs.research_finding_id = ${findingId}
    ORDER BY es.title ASC
  `;

  return { ...row, assumptions, sources };
}

export async function listResearchFindingDetails(
  workspaceId: string,
  status?: ResearchFindingStatus,
): Promise<ResearchFindingDetail[]> {
  const sql = getDb();
  const statusFilter = status ?? null;
  const ids = await sql<{ id: string }[]>`
    SELECT id
    FROM research_findings
    WHERE workspace_id = ${workspaceId}
      AND (${statusFilter}::text IS NULL OR status::text = ${statusFilter})
    ORDER BY created_at DESC
    LIMIT 100
  `;
  const details: ResearchFindingDetail[] = [];
  for (const row of ids) {
    const detail = await getResearchFinding(workspaceId, row.id);
    if (detail) details.push(detail);
  }
  return details;
}

export async function listPendingFindingsForAssumption(
  workspaceId: string,
  assumptionId: string,
): Promise<ResearchFindingDetail[]> {
  const sql = getDb();
  const ids = await sql<{ id: string }[]>`
    SELECT f.id
    FROM research_findings f
    INNER JOIN research_finding_assumptions rfa
      ON rfa.research_finding_id = f.id AND rfa.workspace_id = f.workspace_id
    WHERE f.workspace_id = ${workspaceId}
      AND f.status = 'pending'
      AND rfa.assumption_id = ${assumptionId}
    GROUP BY f.id, f.created_at
    ORDER BY f.created_at DESC
    LIMIT 40
  `;
  const details: ResearchFindingDetail[] = [];
  for (const row of ids) {
    const detail = await getResearchFinding(workspaceId, row.id);
    if (detail) details.push(detail);
  }
  return details;
}

export async function findExistingSourceByCanonicalUrl(
  workspaceId: string,
  url: string,
): Promise<{ id: string; canonical_url: string | null } | null> {
  const canonical = canonicaliseUrl(url);
  if (!canonical) return null;
  const sql = getDb();
  const rows = await sql<{ id: string; canonical_url: string | null }[]>`
    SELECT id, canonical_url
    FROM evidence_sources
    WHERE workspace_id = ${workspaceId}
      AND canonical_url = ${canonical}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listAnalysedCanonicalUrls(
  workspaceId: string,
): Promise<Set<string>> {
  const sql = getDb();
  const rows = await sql<{ canonical_url: string }[]>`
    SELECT DISTINCT es.canonical_url
    FROM evidence_sources es
    INNER JOIN research_finding_sources rfs
      ON rfs.evidence_source_id = es.id AND rfs.workspace_id = es.workspace_id
    WHERE es.workspace_id = ${workspaceId}
      AND es.canonical_url IS NOT NULL
  `;
  return new Set(rows.map((r) => r.canonical_url).filter(Boolean));
}

export async function rejectResearchFinding(
  workspaceId: string,
  findingId: string,
  reviewedBy: string,
  reason: string | null,
  status: Extract<ResearchFindingStatus, "rejected" | "duplicate"> = "rejected",
): Promise<ResearchFindingDetail | null> {
  const sql = getDb();
  await sql`
    UPDATE research_findings SET
      status = ${status},
      reviewed_by = ${reviewedBy},
      reviewed_at = now(),
      rejection_reason = ${reason}
    WHERE workspace_id = ${workspaceId}
      AND id = ${findingId}
      AND status = 'pending'
  `;
  return getResearchFinding(workspaceId, findingId);
}

export type AcceptFindingInput = {
  assumption_id: string;
  title: string;
  description?: string | null;
  direction: EvidenceDirection;
  strength: number;
  evidence_type: EvidenceType;
  evidence_date: string;
};

/**
 * Accept a finding as Evidence.
 * Authored by Knomera AI; reviewing founder recorded separately.
 * Does not change assumption confidence/status.
 */
export async function acceptResearchFinding(
  workspaceId: string,
  findingId: string,
  reviewedBy: string,
  input: AcceptFindingInput,
): Promise<{ finding: ResearchFindingDetail; evidence: Evidence }> {
  const finding = await getResearchFinding(workspaceId, findingId);
  if (!finding) throw new Error("Research finding not found.");
  if (finding.status !== "pending") {
    throw new Error("Only pending findings can be accepted.");
  }

  const linked = finding.assumptions.some(
    (a) => a.assumption_id === input.assumption_id,
  );
  if (!linked) {
    throw new Error("Selected assumption is not linked to this finding.");
  }

  const primarySource = finding.sources[0] ?? null;

  const evidence = await createEvidence(workspaceId, AI_ACTOR_ID, {
    assumption_id: input.assumption_id,
    title: input.title.trim(),
    description: input.description?.trim() || finding.summary,
    evidence_type: input.evidence_type,
    evidence_class: "secondary",
    strength: input.strength,
    direction: input.direction,
    evidence_date: input.evidence_date,
    organisation_id: finding.organisation_id,
    evidence_source_id: primarySource?.evidence_source_id ?? null,
    source: primarySource?.title ?? null,
    research_finding_id: finding.id,
    reviewed_by: reviewedBy,
    ai_assisted: false,
  });

  const sql = getDb();
  await sql`
    UPDATE research_findings SET
      status = 'accepted',
      reviewed_by = ${reviewedBy},
      reviewed_at = now(),
      rejection_reason = NULL
    WHERE workspace_id = ${workspaceId} AND id = ${findingId}
  `;

  const updated = await getResearchFinding(workspaceId, findingId);
  if (!updated) throw new Error("Finding missing after acceptance.");
  return { finding: updated, evidence };
}
