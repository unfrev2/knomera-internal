import { getDb } from "@/lib/db/client";
import type { Assumption, Idea, IdeaStatus, Problem } from "@/lib/types";

export type IdeaFilters = {
  search?: string;
  status?: IdeaStatus;
  submitted_by?: string;
};

export type IdeaInput = {
  title: string;
  description?: string | null;
  status?: IdeaStatus;
  submitted_by?: string | null;
  seed_key?: string | null;
};

export async function listIdeas(
  workspaceId: string,
  filters: IdeaFilters = {},
): Promise<Idea[]> {
  const sql = getDb();
  const search = filters.search?.trim() ?? "";
  const status = filters.status ?? null;
  const submittedBy = filters.submitted_by?.trim() ?? "";

  return sql<Idea[]>`
    SELECT
      i.id,
      i.workspace_id,
      i.seed_key,
      i.title,
      i.description,
      i.status,
      i.submitted_by,
      i.created_at::text,
      i.updated_at::text,
      COUNT(DISTINCT ip.problem_id)::int AS linked_problem_count,
      COUNT(DISTINCT ia.assumption_id)::int AS linked_assumption_count
    FROM ideas i
    LEFT JOIN idea_problems ip
      ON ip.idea_id = i.id AND ip.workspace_id = i.workspace_id
    LEFT JOIN idea_assumptions ia
      ON ia.idea_id = i.id AND ia.workspace_id = i.workspace_id
    WHERE i.workspace_id = ${workspaceId}
      AND (
        ${search} = ''
        OR i.title ILIKE ${"%" + search + "%"}
        OR COALESCE(i.description, '') ILIKE ${"%" + search + "%"}
      )
      AND (${status}::text IS NULL OR i.status::text = ${status})
      AND (${submittedBy === ""} OR i.submitted_by ILIKE ${submittedBy})
    GROUP BY i.id
    ORDER BY i.created_at DESC
  `;
}

export async function getIdea(
  workspaceId: string,
  id: string,
): Promise<Idea | null> {
  const sql = getDb();
  const rows = await sql<Idea[]>`
    SELECT
      i.id,
      i.workspace_id,
      i.seed_key,
      i.title,
      i.description,
      i.status,
      i.submitted_by,
      i.created_at::text,
      i.updated_at::text,
      COUNT(DISTINCT ip.problem_id)::int AS linked_problem_count,
      COUNT(DISTINCT ia.assumption_id)::int AS linked_assumption_count
    FROM ideas i
    LEFT JOIN idea_problems ip
      ON ip.idea_id = i.id AND ip.workspace_id = i.workspace_id
    LEFT JOIN idea_assumptions ia
      ON ia.idea_id = i.id AND ia.workspace_id = i.workspace_id
    WHERE i.workspace_id = ${workspaceId} AND i.id = ${id}
    GROUP BY i.id
  `;
  return rows[0] ?? null;
}

export async function createIdea(
  workspaceId: string,
  createdBy: string,
  input: IdeaInput,
): Promise<Idea> {
  const sql = getDb();
  const rows = await sql<Idea[]>`
    INSERT INTO ideas (
      workspace_id,
      seed_key,
      title,
      description,
      status,
      submitted_by
    ) VALUES (
      ${workspaceId},
      ${input.seed_key ?? null},
      ${input.title},
      ${input.description ?? null},
      ${input.status ?? "inbox"},
      ${input.submitted_by ?? createdBy}
    )
    RETURNING
      id,
      workspace_id,
      seed_key,
      title,
      description,
      status,
      submitted_by,
      created_at::text,
      updated_at::text
  `;
  return {
    ...rows[0],
    linked_problem_count: 0,
    linked_assumption_count: 0,
  };
}

export async function updateIdea(
  workspaceId: string,
  id: string,
  input: Partial<IdeaInput>,
): Promise<Idea | null> {
  const current = await getIdea(workspaceId, id);
  if (!current) return null;
  const sql = getDb();
  const rows = await sql<Idea[]>`
    UPDATE ideas SET
      title = ${input.title ?? current.title},
      description = ${
        input.description === undefined ? current.description : input.description
      },
      status = ${input.status ?? current.status},
      submitted_by = ${
        input.submitted_by === undefined
          ? current.submitted_by
          : input.submitted_by
      }
    WHERE workspace_id = ${workspaceId} AND id = ${id}
    RETURNING
      id,
      workspace_id,
      seed_key,
      title,
      description,
      status,
      submitted_by,
      created_at::text,
      updated_at::text
  `;
  return rows[0]
    ? {
        ...rows[0],
        linked_problem_count: current.linked_problem_count,
        linked_assumption_count: current.linked_assumption_count,
      }
    : null;
}

export async function listProblemsForIdea(
  workspaceId: string,
  ideaId: string,
): Promise<Problem[]> {
  const sql = getDb();
  return sql<Problem[]>`
    SELECT
      p.id,
      p.workspace_id,
      p.seed_key,
      p.title,
      p.description,
      p.status,
      p.severity,
      p.confidence,
      p.target_customer,
      p.owner,
      p.created_by,
      p.created_at::text,
      p.updated_at::text
    FROM problems p
    INNER JOIN idea_problems ip ON ip.problem_id = p.id
    WHERE ip.workspace_id = ${workspaceId}
      AND ip.idea_id = ${ideaId}
    ORDER BY p.title ASC
  `;
}

export async function listAssumptionsForIdea(
  workspaceId: string,
  ideaId: string,
): Promise<Assumption[]> {
  const sql = getDb();
  return sql<Assumption[]>`
    SELECT
      a.id,
      a.workspace_id,
      a.seed_key,
      a.statement,
      a.description,
      a.category,
      a.importance,
      a.confidence,
      a.status,
      a.owner,
      a.next_action,
      a.target_date::text,
      a.created_by,
      a.created_at::text,
      a.updated_at::text
    FROM assumptions a
    INNER JOIN idea_assumptions ia ON ia.assumption_id = a.id
    WHERE ia.workspace_id = ${workspaceId}
      AND ia.idea_id = ${ideaId}
    ORDER BY a.statement ASC
  `;
}

export async function listIdeasForProblem(
  workspaceId: string,
  problemId: string,
): Promise<Idea[]> {
  const sql = getDb();
  return sql<Idea[]>`
    SELECT
      i.id,
      i.workspace_id,
      i.seed_key,
      i.title,
      i.description,
      i.status,
      i.submitted_by,
      i.created_at::text,
      i.updated_at::text
    FROM ideas i
    INNER JOIN idea_problems ip ON ip.idea_id = i.id
    WHERE ip.workspace_id = ${workspaceId}
      AND ip.problem_id = ${problemId}
    ORDER BY i.created_at DESC
  `;
}

export async function listIdeasForAssumption(
  workspaceId: string,
  assumptionId: string,
): Promise<Idea[]> {
  const sql = getDb();
  return sql<Idea[]>`
    SELECT
      i.id,
      i.workspace_id,
      i.seed_key,
      i.title,
      i.description,
      i.status,
      i.submitted_by,
      i.created_at::text,
      i.updated_at::text
    FROM ideas i
    INNER JOIN idea_assumptions ia ON ia.idea_id = i.id
    WHERE ia.workspace_id = ${workspaceId}
      AND ia.assumption_id = ${assumptionId}
    ORDER BY i.created_at DESC
  `;
}

export async function linkIdeaProblem(
  workspaceId: string,
  ideaId: string,
  problemId: string,
  createdBy: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO idea_problems (idea_id, problem_id, workspace_id, created_by)
    VALUES (${ideaId}, ${problemId}, ${workspaceId}, ${createdBy})
    ON CONFLICT (idea_id, problem_id) DO NOTHING
  `;
}

export async function unlinkIdeaProblem(
  workspaceId: string,
  ideaId: string,
  problemId: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    DELETE FROM idea_problems
    WHERE workspace_id = ${workspaceId}
      AND idea_id = ${ideaId}
      AND problem_id = ${problemId}
  `;
}

export async function linkIdeaAssumption(
  workspaceId: string,
  ideaId: string,
  assumptionId: string,
  createdBy: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO idea_assumptions (
      idea_id, assumption_id, workspace_id, created_by
    ) VALUES (
      ${ideaId}, ${assumptionId}, ${workspaceId}, ${createdBy}
    )
    ON CONFLICT (idea_id, assumption_id) DO NOTHING
  `;
}

export async function unlinkIdeaAssumption(
  workspaceId: string,
  ideaId: string,
  assumptionId: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    DELETE FROM idea_assumptions
    WHERE workspace_id = ${workspaceId}
      AND idea_id = ${ideaId}
      AND assumption_id = ${assumptionId}
  `;
}

export async function upsertIdeaBySeedKey(
  workspaceId: string,
  createdBy: string,
  input: IdeaInput & { seed_key: string },
): Promise<Idea> {
  const sql = getDb();
  const rows = await sql<Idea[]>`
    INSERT INTO ideas (
      workspace_id,
      seed_key,
      title,
      description,
      status,
      submitted_by
    ) VALUES (
      ${workspaceId},
      ${input.seed_key},
      ${input.title},
      ${input.description ?? null},
      ${input.status ?? "inbox"},
      ${input.submitted_by ?? createdBy}
    )
    ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      status = EXCLUDED.status,
      submitted_by = COALESCE(EXCLUDED.submitted_by, ideas.submitted_by)
    RETURNING
      id,
      workspace_id,
      seed_key,
      title,
      description,
      status,
      submitted_by,
      created_at::text,
      updated_at::text
  `;
  return {
    ...rows[0],
    linked_problem_count: 0,
    linked_assumption_count: 0,
  };
}
