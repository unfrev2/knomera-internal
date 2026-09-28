import { getDb } from "@/lib/db/client";
import type { McpClientHint } from "@/lib/mcp/auth/tokens";

export type McpAuditInput = {
  workspaceId: string;
  actor: string;
  mcpClient: McpClientHint;
  toolName: string;
  success: boolean;
  targetIds?: string[];
  requestId?: string | null;
  error?: string | null;
};

/** Lightweight MCP activity log — no secrets or full payloads. */
export async function recordMcpAudit(input: McpAuditInput): Promise<void> {
  try {
    const sql = getDb();
    await sql`
      INSERT INTO mcp_audit_events (
        workspace_id,
        actor,
        mcp_client,
        tool_name,
        success,
        target_ids,
        request_id,
        error
      ) VALUES (
        ${input.workspaceId},
        ${input.actor},
        ${input.mcpClient},
        ${input.toolName},
        ${input.success},
        ${JSON.stringify(input.targetIds ?? [])}::jsonb,
        ${input.requestId ?? null},
        ${input.error ?? null}
      )
    `;
  } catch (error) {
    // Audit must not break tool responses.
    console.error(
      "[mcp-audit]",
      error instanceof Error ? error.message : "failed to write audit event",
    );
  }
}
