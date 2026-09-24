import { getWorkspaceForUser } from "@/lib/db/workspaces";
import { requireSessionUser, getSessionUser } from "@/lib/auth/session";
import type { SessionUser, Workspace } from "@/lib/types";
import { redirect } from "next/navigation";

export type RequestContext = {
  user: SessionUser;
  workspace: Workspace;
};

export async function getRequestContext(): Promise<RequestContext> {
  const user = await requireSessionUser();
  const workspace = await getWorkspaceForUser(user.workspaceSlug);
  return { user, workspace };
}

export async function requirePageContext(): Promise<RequestContext> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const workspace = await getWorkspaceForUser(user.workspaceSlug);
  return { user, workspace };
}
