import { z } from "zod4";
import type { McpServer } from "@modelcontextprotocol/server";
import { getEvidence, listEvidence } from "@/lib/db/evidence";
import { getResearchFinding } from "@/lib/db/research-findings";
import type {
  EvidenceClass,
  EvidenceDirection,
  EvidenceType,
} from "@/lib/types";
import { clampLimit } from "@/lib/mcp/limits";
import { absoluteRecordUrl } from "@/lib/mcp/urls";
import { withMcpTool } from "@/lib/mcp/tools/_helpers";

export function registerEvidenceTools(server: McpServer) {
  server.registerTool(
    "search_evidence",
    {
      title: "Search evidence",
      description:
        "Search evidence with filters. Deduplicated by evidence id.",
      inputSchema: z.object({
        query: z.string().optional(),
        assumption: z.string().uuid().optional(),
        problem: z.string().uuid().optional(),
        organisation: z.string().uuid().optional(),
        person: z.string().uuid().optional(),
        discovery_session: z.string().uuid().optional(),
        direction: z.enum(["supports", "challenges", "neutral"]).optional(),
        strength: z.number().int().min(1).max(5).optional(),
        evidence_type: z
          .enum([
            "founder_reasoning",
            "customer_interview",
            "data_analysis",
            "prototype",
            "competitor_research",
            "market_research",
            "behavioural",
            "commercial",
            "bet_outcome",
            "other",
          ])
          .optional(),
        evidence_class: z.enum(["direct", "secondary", "internal"]).optional(),
        created_by: z.string().optional(),
        date_from: z.string().optional(),
        date_to: z.string().optional(),
        limit: z.number().int().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("search_evidence", async (ctx, args) => {
      const limit = clampLimit(
        typeof args.limit === "number" ? args.limit : undefined,
      );
      let rows = await listEvidence(ctx.workspaceId, {
        q: typeof args.query === "string" ? args.query : undefined,
        assumption_id:
          typeof args.assumption === "string" ? args.assumption : undefined,
        organisation_id:
          typeof args.organisation === "string" ? args.organisation : undefined,
        contact_id: typeof args.person === "string" ? args.person : undefined,
        discovery_session_id:
          typeof args.discovery_session === "string"
            ? args.discovery_session
            : undefined,
        direction: args.direction as EvidenceDirection | undefined,
        strength: typeof args.strength === "number" ? args.strength : undefined,
        evidence_type: args.evidence_type as EvidenceType | undefined,
        date_from: typeof args.date_from === "string" ? args.date_from : undefined,
        date_to: typeof args.date_to === "string" ? args.date_to : undefined,
      });

      if (typeof args.evidence_class === "string") {
        rows = rows.filter(
          (e) => e.evidence_class === (args.evidence_class as EvidenceClass),
        );
      }
      if (typeof args.created_by === "string") {
        rows = rows.filter((e) => e.created_by === args.created_by);
      }
      if (typeof args.problem === "string") {
        const { listEvidenceForProblem } = await import("@/lib/db/problems");
        const forProblem = await listEvidenceForProblem(
          ctx.workspaceId,
          args.problem,
        );
        const ids = new Set(forProblem.map((e) => e.id));
        rows = rows.filter((e) => ids.has(e.id));
      }

      // Dedupe by id
      const seen = new Set<string>();
      const unique = rows.filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });

      const sliced = unique.slice(0, limit);
      return {
        data: {
          count: sliced.length,
          total_matched: unique.length,
          evidence: sliced.map((e) => ({
            id: e.id,
            title: e.title,
            assumption_id: e.assumption_id,
            assumption: e.assumption_statement ?? null,
            direction: e.direction,
            strength: e.strength,
            class: e.evidence_class,
            type: e.evidence_type,
            created_by: e.created_by,
            date: e.evidence_date,
            organisation: e.organisation_name ?? null,
            person: e.contact_name ?? null,
            url: absoluteRecordUrl("evidence", e.id),
          })),
        },
        targetIds: sliced.map((e) => e.id),
      };
    }),
  );

  server.registerTool(
    "get_evidence",
    {
      title: "Get evidence",
      description: "Evidence detail with provenance and research finding links.",
      inputSchema: z.object({
        evidence_id: z.string().uuid(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("get_evidence", async (ctx, args) => {
      const id = String(args.evidence_id);
      const evidence = await getEvidence(ctx.workspaceId, id);
      if (!evidence) throw new Error("Evidence not found");

      let researchFinding = null;
      if (evidence.research_finding_id) {
        researchFinding = await getResearchFinding(
          ctx.workspaceId,
          evidence.research_finding_id,
        );
      }

      return {
        data: {
          id: evidence.id,
          title: evidence.title,
          description: evidence.description,
          assumption_id: evidence.assumption_id,
          assumption: evidence.assumption_statement ?? null,
          direction: evidence.direction,
          strength: evidence.strength,
          class: evidence.evidence_class,
          type: evidence.evidence_type,
          author: evidence.created_by,
          ai_assisted: evidence.ai_assisted,
          ai_confidence: evidence.ai_confidence,
          reviewed_by: evidence.reviewed_by,
          date: evidence.evidence_date,
          organisation: evidence.organisation_name
            ? {
                id: evidence.organisation_id,
                name: evidence.organisation_name,
              }
            : null,
          person: evidence.contact_name
            ? {
                id: evidence.contact_id,
                name: evidence.contact_name,
                role: evidence.contact_role ?? null,
              }
            : null,
          discovery: evidence.discovery_title
            ? {
                id: evidence.discovery_session_id,
                title: evidence.discovery_title,
                date: evidence.discovery_session_date ?? null,
              }
            : null,
          external_source: evidence.source_title
            ? {
                id: evidence.evidence_source_id,
                title: evidence.source_title,
                type: evidence.source_type,
                url: evidence.source_url,
              }
            : evidence.source
              ? { title: evidence.source, url: null }
              : null,
          research_finding: researchFinding
            ? {
                id: researchFinding.id,
                claim: researchFinding.claim,
                status: researchFinding.status,
                sources: researchFinding.sources.map((s) => ({
                  title: s.title,
                  url: s.url,
                })),
              }
            : null,
          url: absoluteRecordUrl("evidence", id),
        },
        targetIds: [id],
      };
    }),
  );
}
