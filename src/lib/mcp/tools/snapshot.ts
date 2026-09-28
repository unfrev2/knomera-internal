import { z } from "zod4";
import type { McpServer } from "@modelcontextprotocol/server";
import { listAssumptions } from "@/lib/db/assumptions";
import { listBets } from "@/lib/db/bets";
import { getDb } from "@/lib/db/client";
import { getHomeDashboard } from "@/lib/db/home";
import { listOpportunities } from "@/lib/db/opportunities";
import { listResearchFindingDetails } from "@/lib/db/research-findings";
import { listResearchRuns } from "@/lib/db/research";
import { listStrategyItems } from "@/lib/db/strategy";
import {
  isMcpResearchRequest,
  parseMcpResearchNotes,
} from "@/lib/mcp/research-queue";
import { takeCap } from "@/lib/mcp/limits";
import { absoluteAppPath, absoluteRecordUrl } from "@/lib/mcp/urls";
import { withMcpTool } from "@/lib/mcp/tools/_helpers";

export function registerSnapshotTools(server: McpServer) {
  server.registerTool(
    "get_business_snapshot",
    {
      title: "Get business snapshot",
      description:
        "Bounded strategic snapshot for the start of an investigation.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("get_business_snapshot", async (ctx) => {
      const [
        home,
        strategy,
        assumptions,
        bets,
        opportunities,
        pendingFindings,
        runs,
      ] = await Promise.all([
        getHomeDashboard(ctx.workspaceId),
        listStrategyItems(ctx.workspaceId),
        listAssumptions(ctx.workspaceId),
        listBets(ctx.workspaceId),
        listOpportunities(ctx.workspaceId),
        listResearchFindingDetails(ctx.workspaceId, "pending"),
        listResearchRuns(ctx.workspaceId, 50),
      ]);

      const activeStrategy = strategy.filter((s) => s.status === "active");
      const byType = (type: string) =>
        activeStrategy.find((s) => s.type === type) ??
        strategy.find((s) => s.type === type) ??
        null;

      const sql = getDb();
      const evidenceClasses = await sql<
        { assumption_id: string; evidence_class: string }[]
      >`
        SELECT assumption_id, evidence_class::text
        FROM evidence
        WHERE workspace_id = ${ctx.workspaceId}
      `;
      const hasDirect = new Set(
        evidenceClasses
          .filter((e) => e.evidence_class === "direct")
          .map((e) => e.assumption_id),
      );

      const criticalLow = assumptions.filter(
        (a) => a.importance === "critical" && a.confidence === "low",
      );
      const lackingDirect = assumptions.filter(
        (a) => a.importance === "critical" && !hasDirect.has(a.id),
      );

      const pendingRequests = runs.filter((r) => {
        if (r.status !== "queued") return false;
        return isMcpResearchRequest(parseMcpResearchNotes(r.notes));
      });

      return {
        data: {
          url: absoluteAppPath("/"),
          positioning: byType("positioning")
            ? {
                title: byType("positioning")!.title,
                content: byType("positioning")!.content,
              }
            : null,
          vision: byType("vision")
            ? {
                title: byType("vision")!.title,
                content: byType("vision")!.content,
              }
            : null,
          wedge: byType("initial_wedge")
            ? {
                title: byType("initial_wedge")!.title,
                content: byType("initial_wedge")!.content,
              }
            : null,
          assumption_counts: {
            total: assumptions.length,
            by_confidence: {
              low: assumptions.filter((a) => a.confidence === "low").length,
              medium: assumptions.filter((a) => a.confidence === "medium")
                .length,
              high: assumptions.filter((a) => a.confidence === "high").length,
              proven: assumptions.filter((a) => a.confidence === "proven")
                .length,
            },
            by_importance: {
              critical: assumptions.filter((a) => a.importance === "critical")
                .length,
              high: assumptions.filter((a) => a.importance === "high").length,
              medium: assumptions.filter((a) => a.importance === "medium")
                .length,
              low: assumptions.filter((a) => a.importance === "low").length,
            },
          },
          critical_low_confidence: takeCap(
            criticalLow.map((a) => ({
              id: a.id,
              statement: a.statement,
              url: absoluteRecordUrl("assumption", a.id),
            })),
          ),
          assumptions_lacking_direct_evidence: takeCap(
            lackingDirect.map((a) => ({
              id: a.id,
              statement: a.statement,
              url: absoluteRecordUrl("assumption", a.id),
            })),
          ),
          recent_evidence: takeCap(
            home.learning
              .filter((l) => l.kind === "evidence")
              .map((l) => ({
                id: l.id,
                title: l.title,
                at: l.at,
                url: absoluteAppPath(l.href),
              })),
          ),
          active_or_proposed_bets: takeCap(
            bets
              .filter((b) => b.status === "active" || b.status === "proposed")
              .map((b) => ({
                id: b.id,
                title: b.title,
                status: b.status,
                url: absoluteRecordUrl("bet", b.id),
              })),
          ),
          commercial_activity: {
            active_opportunities: opportunities.filter(
              (o) => !["won", "lost"].includes(o.stage),
            ).length,
            closer: home.closer,
          },
          pending_research: {
            queue_requests: pendingRequests.length,
            pending_findings: pendingFindings.length,
          },
          attention: takeCap(
            home.attention.map((a) => ({
              kind: a.kind,
              title: a.title,
              url: absoluteAppPath(a.href),
            })),
            10,
          ),
        },
      };
    }),
  );
}
