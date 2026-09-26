import { getDb } from "@/lib/db/client";
import type {
  ResearchFinding,
  ResearchFindingStatus,
  ResearchRun,
  ResearchRunStatus,
  ResearchTriggerType,
  ResearchType,
} from "@/lib/types";

export type CreateResearchRunInput = {
  research_type: ResearchType;
  trigger_type?: ResearchTriggerType;
  triggered_by?: string | null;
  notes?: string | null;
};

export type UpdateResearchRunUsageInput = {
  assumptions_considered?: number;
  sources_examined?: number;
  findings_created?: number;
  search_queries_used?: number;
  ai_calls?: number;
  search_calls?: number;
  input_tokens?: number;
  output_tokens?: number;
  estimated_cost?: number | null;
  notes?: string | null;
  error?: string | null;
};

function mapRun(row: ResearchRun): ResearchRun {
  return {
    ...row,
    estimated_cost:
      row.estimated_cost === null || row.estimated_cost === undefined
        ? null
        : Number(row.estimated_cost),
  };
}

export async function createResearchRun(
  workspaceId: string,
  input: CreateResearchRunInput,
): Promise<ResearchRun> {
  const sql = getDb();
  const rows = await sql<ResearchRun[]>`
    INSERT INTO research_runs (
      workspace_id,
      research_type,
      trigger_type,
      status,
      triggered_by,
      notes
    ) VALUES (
      ${workspaceId},
      ${input.research_type},
      ${input.trigger_type ?? "manual"},
      'queued',
      ${input.triggered_by ?? null},
      ${input.notes ?? null}
    )
    RETURNING
      id,
      workspace_id,
      research_type,
      trigger_type,
      status,
      started_at::text,
      completed_at::text,
      triggered_by,
      assumptions_considered,
      sources_examined,
      findings_created,
      search_queries_used,
      ai_calls,
      search_calls,
      input_tokens,
      output_tokens,
      estimated_cost,
      error,
      notes,
      created_at::text
  `;
  return mapRun(rows[0]);
}

export async function markResearchRunRunning(
  workspaceId: string,
  runId: string,
): Promise<ResearchRun | null> {
  const sql = getDb();
  const rows = await sql<ResearchRun[]>`
    UPDATE research_runs SET
      status = 'running',
      started_at = COALESCE(started_at, now()),
      error = NULL
    WHERE workspace_id = ${workspaceId} AND id = ${runId}
    RETURNING
      id,
      workspace_id,
      research_type,
      trigger_type,
      status,
      started_at::text,
      completed_at::text,
      triggered_by,
      assumptions_considered,
      sources_examined,
      findings_created,
      search_queries_used,
      ai_calls,
      search_calls,
      input_tokens,
      output_tokens,
      estimated_cost,
      error,
      notes,
      created_at::text
  `;
  return rows[0] ? mapRun(rows[0]) : null;
}

export async function completeResearchRun(
  workspaceId: string,
  runId: string,
  status: Extract<ResearchRunStatus, "completed" | "partial" | "failed">,
  usage: UpdateResearchRunUsageInput = {},
): Promise<ResearchRun | null> {
  const sql = getDb();
  const rows = await sql<ResearchRun[]>`
    UPDATE research_runs SET
      status = ${status},
      completed_at = now(),
      assumptions_considered = COALESCE(${usage.assumptions_considered ?? null}, assumptions_considered),
      sources_examined = COALESCE(${usage.sources_examined ?? null}, sources_examined),
      findings_created = COALESCE(${usage.findings_created ?? null}, findings_created),
      search_queries_used = COALESCE(${usage.search_queries_used ?? null}, search_queries_used),
      ai_calls = COALESCE(${usage.ai_calls ?? null}, ai_calls),
      search_calls = COALESCE(${usage.search_calls ?? null}, search_calls),
      input_tokens = COALESCE(${usage.input_tokens ?? null}, input_tokens),
      output_tokens = COALESCE(${usage.output_tokens ?? null}, output_tokens),
      estimated_cost = COALESCE(${usage.estimated_cost ?? null}, estimated_cost),
      notes = COALESCE(${usage.notes ?? null}, notes),
      error = ${usage.error ?? null}
    WHERE workspace_id = ${workspaceId} AND id = ${runId}
    RETURNING
      id,
      workspace_id,
      research_type,
      trigger_type,
      status,
      started_at::text,
      completed_at::text,
      triggered_by,
      assumptions_considered,
      sources_examined,
      findings_created,
      search_queries_used,
      ai_calls,
      search_calls,
      input_tokens,
      output_tokens,
      estimated_cost,
      error,
      notes,
      created_at::text
  `;
  return rows[0] ? mapRun(rows[0]) : null;
}

export async function getResearchRun(
  workspaceId: string,
  runId: string,
): Promise<ResearchRun | null> {
  const sql = getDb();
  const rows = await sql<ResearchRun[]>`
    SELECT
      id,
      workspace_id,
      research_type,
      trigger_type,
      status,
      started_at::text,
      completed_at::text,
      triggered_by,
      assumptions_considered,
      sources_examined,
      findings_created,
      search_queries_used,
      ai_calls,
      search_calls,
      input_tokens,
      output_tokens,
      estimated_cost,
      error,
      notes,
      created_at::text
    FROM research_runs
    WHERE workspace_id = ${workspaceId} AND id = ${runId}
    LIMIT 1
  `;
  return rows[0] ? mapRun(rows[0]) : null;
}

export async function listResearchRuns(
  workspaceId: string,
  limit = 50,
): Promise<ResearchRun[]> {
  const sql = getDb();
  const rows = await sql<ResearchRun[]>`
    SELECT
      id,
      workspace_id,
      research_type,
      trigger_type,
      status,
      started_at::text,
      completed_at::text,
      triggered_by,
      assumptions_considered,
      sources_examined,
      findings_created,
      search_queries_used,
      ai_calls,
      search_calls,
      input_tokens,
      output_tokens,
      estimated_cost,
      error,
      notes,
      created_at::text
    FROM research_runs
    WHERE workspace_id = ${workspaceId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(mapRun);
}

export async function listResearchFindings(
  workspaceId: string,
  status?: ResearchFindingStatus,
): Promise<ResearchFinding[]> {
  const sql = getDb();
  const statusFilter = status ?? null;
  return sql<ResearchFinding[]>`
    SELECT
      id,
      workspace_id,
      research_run_id,
      research_type,
      organisation_id,
      claim,
      summary,
      status,
      ai_confidence,
      suggested_strength,
      created_at::text,
      reviewed_by,
      reviewed_at::text,
      rejection_reason
    FROM research_findings
    WHERE workspace_id = ${workspaceId}
      AND (${statusFilter}::text IS NULL OR status::text = ${statusFilter})
    ORDER BY created_at DESC
  `;
}
