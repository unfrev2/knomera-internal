import { z } from "zod4";
import type { McpServer } from "@modelcontextprotocol/server";
import { getAssumption } from "@/lib/db/assumptions";
import { getProblem } from "@/lib/db/problems";
import { getOrganisation } from "@/lib/db/organisations";
import {
  completeResearchRun,
  createResearchRun,
  listResearchRuns,
} from "@/lib/db/research";
import {
  getResearchFinding,
  insertPendingResearchFinding,
  listResearchFindingDetails,
  promoteResearchFindingViaMcp,
} from "@/lib/db/research-findings";
import { isHttpUrl } from "@/lib/domain/evidence-attribution";
import type {
  EvidenceDirection,
  EvidenceType,
  ResearchFindingStatus,
  ResearchType,
} from "@/lib/types";
import { clampLimit } from "@/lib/mcp/limits";
import {
  encodeResearchRequestNotes,
  encodeSubmittedFindingNotes,
  isMcpResearchRequest,
  parseMcpResearchNotes,
} from "@/lib/mcp/research-queue";
import { absoluteAppPath, absoluteRecordUrl } from "@/lib/mcp/urls";
import { withMcpTool } from "@/lib/mcp/tools/_helpers";

export function registerResearchTools(server: McpServer) {
  server.registerTool(
    "get_research_queue",
    {
      title: "Get research queue",
      description:
        "List MCP research requests (queued runs) and research findings. Clearly distinguished.",
      inputSchema: z.object({
        research_type: z.enum(["competitor", "market", "assumption"]).optional(),
        assumption: z.string().uuid().optional(),
        problem: z.string().uuid().optional(),
        status: z
          .enum(["pending", "accepted", "rejected", "duplicate", "queued"])
          .optional(),
        created_by: z.string().optional(),
        priority: z.string().optional(),
        limit: z.number().int().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("get_research_queue", async (ctx, args) => {
      const limit = clampLimit(
        typeof args.limit === "number" ? args.limit : undefined,
      );
      const runs = await listResearchRuns(ctx.workspaceId, 100);
      let requests = runs
        .map((run) => {
          const notes = parseMcpResearchNotes(run.notes);
          if (!isMcpResearchRequest(notes)) return null;
          if (run.status !== "queued" && args.status === "queued") return null;
          return { run, notes };
        })
        .filter((x): x is NonNullable<typeof x> => x != null);

      if (typeof args.research_type === "string") {
        requests = requests.filter(
          (r) => r.notes.research_type === args.research_type,
        );
      }
      if (typeof args.assumption === "string") {
        requests = requests.filter((r) =>
          r.notes.suggested_assumption_ids.includes(args.assumption as string),
        );
      }
      if (typeof args.problem === "string") {
        requests = requests.filter((r) =>
          r.notes.suggested_problem_ids.includes(args.problem as string),
        );
      }
      if (typeof args.priority === "string") {
        requests = requests.filter((r) => r.notes.priority === args.priority);
      }
      if (typeof args.created_by === "string") {
        requests = requests.filter(
          (r) => r.run.triggered_by === args.created_by,
        );
      }

      const includeFindings = args.status !== "queued";
      const findingStatus: ResearchFindingStatus | undefined =
        args.status && args.status !== "queued"
          ? (args.status as ResearchFindingStatus)
          : undefined;

      let findings = includeFindings
        ? await listResearchFindingDetails(ctx.workspaceId, findingStatus)
        : [];

      if (typeof args.research_type === "string") {
        findings = findings.filter((f) => f.research_type === args.research_type);
      }
      if (typeof args.assumption === "string") {
        findings = findings.filter((f) =>
          f.assumptions.some((a) => a.assumption_id === args.assumption),
        );
      }

      // When no status filter, prefer pending findings in the queue view.
      if (!args.status) {
        findings = findings.filter((f) => f.status === "pending");
      }

      return {
        data: {
          research_requests: requests.slice(0, limit).map(({ run, notes }) => ({
            kind: "research_request" as const,
            id: run.id,
            title: notes.title,
            reason_for_research: notes.reason_for_research,
            questions: notes.questions,
            research_type: notes.research_type,
            priority: notes.priority,
            status: run.status,
            suggested_assumption_ids: notes.suggested_assumption_ids,
            suggested_problem_ids: notes.suggested_problem_ids,
            created_by: run.triggered_by,
            mcp_client: notes.mcp_client,
            created_at: run.created_at,
            url: absoluteAppPath("/evidence/research"),
          })),
          research_findings: findings.slice(0, limit).map((f) => ({
            kind: "research_finding" as const,
            id: f.id,
            claim: f.claim,
            summary: f.summary,
            status: f.status,
            research_type: f.research_type,
            organisation_id: f.organisation_id,
            assumptions: f.assumptions.map((a) => ({
              assumption_id: a.assumption_id,
              direction: a.direction,
              statement: a.assumption_statement,
            })),
            sources: f.sources.map((s) => ({
              title: s.title,
              url: s.url,
            })),
            created_at: f.created_at,
            url: absoluteAppPath("/evidence/research"),
          })),
        },
      };
    }),
  );

  server.registerTool(
    "add_research_queue_item",
    {
      title: "Add research queue item",
      description:
        "Add work/questions to the research queue as a queued research run. Does not auto-execute research.",
      inputSchema: z.object({
        title: z.string().min(1),
        reason_for_research: z.string().min(1),
        research_type: z.enum(["competitor", "market", "assumption"]),
        suggested_assumption_ids: z.array(z.string().uuid()).optional(),
        suggested_problem_ids: z.array(z.string().uuid()).optional(),
        questions: z.array(z.string()).optional(),
        suggested_search_scope: z.string().optional(),
        priority: z.string().optional(),
        notes: z.string().optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    withMcpTool("add_research_queue_item", async (ctx, args) => {
      const assumptionIds = Array.isArray(args.suggested_assumption_ids)
        ? (args.suggested_assumption_ids as string[])
        : [];
      const problemIds = Array.isArray(args.suggested_problem_ids)
        ? (args.suggested_problem_ids as string[])
        : [];

      for (const id of assumptionIds) {
        const a = await getAssumption(ctx.workspaceId, id);
        if (!a) throw new Error(`Assumption not found: ${id}`);
      }
      for (const id of problemIds) {
        const p = await getProblem(ctx.workspaceId, id);
        if (!p) throw new Error(`Problem not found: ${id}`);
      }

      const questions = Array.isArray(args.questions)
        ? (args.questions as string[]).map((q) => q.trim()).filter(Boolean)
        : [];

      const notesPayload = encodeResearchRequestNotes({
        kind: "mcp_research_request",
        v: 1,
        title: String(args.title).trim(),
        reason_for_research: String(args.reason_for_research).trim(),
        questions,
        suggested_assumption_ids: assumptionIds,
        suggested_problem_ids: problemIds,
        suggested_search_scope:
          typeof args.suggested_search_scope === "string"
            ? args.suggested_search_scope
            : typeof args.notes === "string"
              ? args.notes
              : null,
        priority:
          typeof args.priority === "string" ? args.priority : "normal",
        mcp_client: ctx.mcpClient,
        research_type: args.research_type as ResearchType,
      });

      const run = await createResearchRun(ctx.workspaceId, {
        research_type: args.research_type as ResearchType,
        trigger_type: "manual",
        triggered_by: ctx.actor,
        notes: notesPayload,
      });

      return {
        data: {
          kind: "research_request",
          id: run.id,
          status: run.status,
          title: String(args.title).trim(),
          url: absoluteAppPath("/evidence/research"),
        },
        targetIds: [run.id],
      };
    }),
  );

  server.registerTool(
    "submit_research_finding",
    {
      title: "Submit research finding",
      description:
        "Submit a sourced research finding for founder review. Source URLs required.",
      inputSchema: z.object({
        claim: z.string().min(1),
        summary: z.string().min(1),
        source_urls: z.array(z.string().url()).min(1),
        source_titles: z.array(z.string()).min(1),
        suggested_assumption_relationships: z
          .array(
            z.object({
              assumption_id: z.string().uuid(),
              direction: z.enum(["supports", "challenges", "neutral"]),
              reason: z.string().optional(),
            }),
          )
          .min(1),
        organisation_id: z.string().uuid().optional(),
        research_type: z.enum(["competitor", "market", "assumption"]),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    withMcpTool("submit_research_finding", async (ctx, args) => {
      const urls = args.source_urls as string[];
      const titles = args.source_titles as string[];
      if (titles.length < urls.length) {
        throw new Error("Each source URL requires a matching source title.");
      }
      for (const url of urls) {
        if (!isHttpUrl(url)) {
          throw new Error(`Invalid source URL: ${url}`);
        }
      }

      const relationships = args.suggested_assumption_relationships as Array<{
        assumption_id: string;
        direction: EvidenceDirection;
        reason?: string;
      }>;

      for (const rel of relationships) {
        const a = await getAssumption(ctx.workspaceId, rel.assumption_id);
        if (!a) throw new Error(`Assumption not found: ${rel.assumption_id}`);
      }

      if (typeof args.organisation_id === "string") {
        const org = await getOrganisation(ctx.workspaceId, args.organisation_id);
        if (!org) throw new Error("Organisation not found");
      }

      const run = await createResearchRun(ctx.workspaceId, {
        research_type: args.research_type as ResearchType,
        trigger_type: "manual",
        triggered_by: ctx.actor,
        notes: encodeSubmittedFindingNotes({
          kind: "mcp_submitted_finding",
          v: 1,
          mcp_client: ctx.mcpClient,
          claim: String(args.claim).trim(),
        }),
      });

      const finding = await insertPendingResearchFinding(
        ctx.workspaceId,
        ctx.actor,
        {
          research_run_id: run.id,
          research_type: args.research_type as ResearchType,
          organisation_id:
            typeof args.organisation_id === "string"
              ? args.organisation_id
              : null,
          claim: String(args.claim).trim(),
          summary: String(args.summary).trim(),
          assumptions: relationships.map((r) => ({
            assumption_id: r.assumption_id,
            direction: r.direction,
            reason: r.reason ?? null,
          })),
          sources: urls.map((url, i) => ({
            title: titles[i]?.trim() || url,
            url,
          })),
        },
      );

      await completeResearchRun(ctx.workspaceId, run.id, "completed", {
        findings_created: 1,
        sources_examined: urls.length,
        notes: encodeSubmittedFindingNotes({
          kind: "mcp_submitted_finding",
          v: 1,
          mcp_client: ctx.mcpClient,
          claim: finding.claim,
        }),
      });

      return {
        data: {
          kind: "research_finding",
          id: finding.id,
          status: finding.status,
          claim: finding.claim,
          url: absoluteAppPath("/evidence/research"),
        },
        targetIds: [finding.id, run.id],
      };
    }),
  );

  server.registerTool(
    "promote_research_finding_to_evidence",
    {
      title: "Promote research finding to evidence",
      description:
        "Promote an existing sourced research finding into canonical Evidence. Does not change assumption confidence or status.",
      inputSchema: z.object({
        research_finding_id: z.string().uuid(),
        assumption_id: z.string().uuid(),
        title: z.string().min(1),
        description: z.string().optional(),
        direction: z.enum(["supports", "challenges", "neutral"]),
        strength: z.number().int().min(1).max(5),
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
          .default("market_research"),
        evidence_date: z.string().optional(),
        confirm: z
          .literal(true)
          .describe("Must be true — explicit promotion request"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    withMcpTool("promote_research_finding_to_evidence", async (ctx, args) => {
      if (args.confirm !== true) {
        throw new Error("Promotion requires confirm=true.");
      }

      const findingId = String(args.research_finding_id);
      const finding = await getResearchFinding(ctx.workspaceId, findingId);
      if (!finding) throw new Error("Research finding not found");

      const reviewedBy = `${ctx.actor}:${ctx.mcpClient}`;
      const result = await promoteResearchFindingViaMcp(
        ctx.workspaceId,
        findingId,
        reviewedBy,
        {
          assumption_id: String(args.assumption_id),
          title: String(args.title),
          description:
            typeof args.description === "string" ? args.description : null,
          direction: args.direction as EvidenceDirection,
          strength: Number(args.strength),
          evidence_type: (args.evidence_type as EvidenceType) ?? "market_research",
          evidence_date:
            typeof args.evidence_date === "string"
              ? args.evidence_date
              : new Date().toISOString().slice(0, 10),
        },
      );

      return {
        data: {
          finding: {
            id: result.finding.id,
            status: result.finding.status,
          },
          evidence: {
            id: result.evidence.id,
            title: result.evidence.title,
            class: result.evidence.evidence_class,
            created_by: result.evidence.created_by,
            reviewed_by: result.evidence.reviewed_by,
            url: absoluteRecordUrl("evidence", result.evidence.id),
          },
          note: "Assumption confidence and status were not changed.",
        },
        targetIds: [result.finding.id, result.evidence.id],
      };
    }),
  );
}
