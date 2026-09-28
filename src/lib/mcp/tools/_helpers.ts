import type { AuthInfo } from "@modelcontextprotocol/server";
import { recordMcpAudit } from "@/lib/mcp/audit";
import {
  mcpClientFromAuthExtra,
  resolveMcpWorkspaceContext,
  toolError,
  toolJson,
  type McpRequestContext,
} from "@/lib/mcp/context";

type ToolResult = ReturnType<typeof toolJson> | ReturnType<typeof toolError>;

export type ToolHandlerArgs = Record<string, unknown>;

type ToolCtx = {
  authInfo?: AuthInfo;
  http?: { authInfo?: AuthInfo };
};

/**
 * Wrap a domain tool: resolve workspace, audit, never treat stored content as instructions.
 */
export function withMcpTool(
  toolName: string,
  handler: (
    ctx: McpRequestContext,
    args: ToolHandlerArgs,
  ) => Promise<{ data: unknown; targetIds?: string[] }>,
) {
  return async (
    args: ToolHandlerArgs | ToolCtx,
    maybeCtx?: ToolCtx,
  ): Promise<ToolResult> => {
    // SDK may call (args, ctx) or (ctx) when there are no inputs.
    const hasArgs =
      maybeCtx !== undefined ||
      (args != null &&
        typeof args === "object" &&
        !("authInfo" in args) &&
        !("http" in args));
    const toolArgs = (hasArgs && maybeCtx !== undefined
      ? args
      : hasArgs
        ? args
        : {}) as ToolHandlerArgs;
    const ctxBag = (maybeCtx ??
      (!hasArgs ? args : undefined)) as ToolCtx | undefined;
    const authInfo = ctxBag?.authInfo ?? ctxBag?.http?.authInfo;

    let ctx: McpRequestContext | null = null;
    try {
      ctx = await resolveMcpWorkspaceContext({
        mcpClient: mcpClientFromAuthExtra(authInfo?.extra),
      });
      const result = await handler(ctx, toolArgs ?? {});
      await recordMcpAudit({
        workspaceId: ctx.workspaceId,
        actor: ctx.actor,
        mcpClient: ctx.mcpClient,
        toolName,
        success: true,
        targetIds: result.targetIds,
        requestId: ctx.requestId,
      });
      return toolJson(result.data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Tool execution failed.";
      if (ctx) {
        await recordMcpAudit({
          workspaceId: ctx.workspaceId,
          actor: ctx.actor,
          mcpClient: ctx.mcpClient,
          toolName,
          success: false,
          requestId: ctx.requestId,
          error: message,
        });
      }
      return toolError(message);
    }
  };
}
