import { getDb } from "@/lib/db/client";
import type { Workspace } from "@/lib/types";

export async function getWorkspaceBySlug(slug: string): Promise<Workspace> {
  const sql = getDb();
  const rows = await sql<Workspace[]>`
    SELECT id, name, slug, created_at::text
    FROM workspaces
    WHERE slug = ${slug}
    LIMIT 1
  `;
  if (!rows[0]) {
    throw new Error(`Workspace "${slug}" not found. Run the database seed.`);
  }
  return rows[0];
}

export async function getWorkspaceForUser(workspaceSlug: string): Promise<Workspace> {
  return getWorkspaceBySlug(workspaceSlug);
}
