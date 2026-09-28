import type { McpClientHint } from "@/lib/mcp/auth/tokens";
import type { ResearchType } from "@/lib/types";

export const MCP_RESEARCH_REQUEST_KIND = "mcp_research_request" as const;
export const MCP_SUBMITTED_FINDING_KIND = "mcp_submitted_finding" as const;

export type McpResearchRequestNotes = {
  kind: typeof MCP_RESEARCH_REQUEST_KIND;
  v: 1;
  title: string;
  reason_for_research: string;
  questions: string[];
  suggested_assumption_ids: string[];
  suggested_problem_ids: string[];
  suggested_search_scope: string | null;
  priority: string;
  mcp_client: McpClientHint;
  research_type: ResearchType;
};

export type McpSubmittedFindingNotes = {
  kind: typeof MCP_SUBMITTED_FINDING_KIND;
  v: 1;
  mcp_client: McpClientHint;
  claim: string;
};

export function encodeResearchRequestNotes(
  notes: McpResearchRequestNotes,
): string {
  return JSON.stringify(notes);
}

export function encodeSubmittedFindingNotes(
  notes: McpSubmittedFindingNotes,
): string {
  return JSON.stringify(notes);
}

export function parseMcpResearchNotes(
  raw: string | null | undefined,
): McpResearchRequestNotes | McpSubmittedFindingNotes | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as { kind?: string };
    if (
      parsed.kind === MCP_RESEARCH_REQUEST_KIND ||
      parsed.kind === MCP_SUBMITTED_FINDING_KIND
    ) {
      return parsed as McpResearchRequestNotes | McpSubmittedFindingNotes;
    }
    return null;
  } catch {
    return null;
  }
}

export function isMcpResearchRequest(
  notes: ReturnType<typeof parseMcpResearchNotes>,
): notes is McpResearchRequestNotes {
  return notes?.kind === MCP_RESEARCH_REQUEST_KIND;
}
