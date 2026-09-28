import { EXTERNAL_AI_ACTOR_ID } from "@/lib/domain/actors";
import { getWorkspaceBySlug } from "@/lib/db/workspaces";
import type { McpClientHint } from "@/lib/mcp/auth/tokens";
import { getWorkspaceSlug } from "@/lib/mcp/config";

export type McpRequestContext = {
  workspaceId: string;
  workspaceSlug: string;
  actor: typeof EXTERNAL_AI_ACTOR_ID;
  mcpClient: McpClientHint;
  requestId: string;
};

export async function resolveMcpWorkspaceContext(input?: {
  mcpClient?: McpClientHint;
  requestId?: string;
}): Promise<McpRequestContext> {
  const slug = getWorkspaceSlug();
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    throw new Error(`Workspace not found for slug: ${slug}`);
  }
  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    actor: EXTERNAL_AI_ACTOR_ID,
    mcpClient: input?.mcpClient ?? "unknown",
    requestId: input?.requestId ?? crypto.randomUUID(),
  };
}

export function mcpClientFromAuthExtra(
  extra: Record<string, unknown> | undefined,
): McpClientHint {
  const value = extra?.mcpClient;
  if (value === "claude" || value === "chatgpt" || value === "unknown") {
    return value;
  }
  return "unknown";
}

/** Compact JSON tool result helper. */
export function toolJson(data: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function toolError(message: string): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}
