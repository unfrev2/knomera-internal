import { z } from "zod4";
import type { McpServer } from "@modelcontextprotocol/server";
import { getAssumption } from "@/lib/db/assumptions";
import { getBet } from "@/lib/db/bets";
import { getContact } from "@/lib/db/contacts";
import { getDecision } from "@/lib/db/decisions";
import { getDiscoverySession } from "@/lib/db/discovery";
import { getEvidence } from "@/lib/db/evidence";
import { getOrganisation } from "@/lib/db/organisations";
import { getProblem } from "@/lib/db/problems";
import { getResearchFinding } from "@/lib/db/research-findings";
import { searchWorkspaceObjects } from "@/lib/db/search";
import { getStrategyItem } from "@/lib/db/strategy";
import {
  SEARCHABLE_OBJECT_TYPES,
  type SearchableObjectType,
} from "@/lib/domain/linkable";
import { getDb } from "@/lib/db/client";
import { clampLimit } from "@/lib/mcp/limits";
import { absoluteAppPath, absoluteRecordUrl } from "@/lib/mcp/urls";
import { withMcpTool } from "@/lib/mcp/tools/_helpers";

const searchTypesSchema = z
  .array(
    z.enum([
      "strategy",
      "problem",
      "assumption",
      "evidence",
      "organisation",
      "person",
      "discovery",
      "idea",
      "bet",
      "decision",
      "opportunity",
      "research_finding",
      // aliases used by searchWorkspaceObjects
      "contact",
      "discovery_session",
    ]),
  )
  .optional();

function mapSearchType(
  type: string,
): SearchableObjectType | "research_finding" | "strategy" | null {
  switch (type) {
    case "person":
      return "contact";
    case "discovery":
      return "discovery_session";
    case "strategy":
      return "strategy";
    case "research_finding":
      return "research_finding";
    case "assumption":
    case "evidence":
    case "problem":
    case "organisation":
    case "contact":
    case "discovery_session":
    case "decision":
    case "idea":
    case "bet":
    case "opportunity":
      return type;
    default:
      return null;
  }
}

async function searchResearchFindings(
  workspaceId: string,
  query: string,
  limit: number,
) {
  const sql = getDb();
  const pattern = query ? `%${query}%` : "%";
  return sql<
    {
      id: string;
      claim: string;
      status: string;
      research_type: string;
    }[]
  >`
    SELECT id, claim, status::text, research_type::text
    FROM research_findings
    WHERE workspace_id = ${workspaceId}
      AND (
        ${query} = ''
        OR claim ILIKE ${pattern}
        OR COALESCE(summary, '') ILIKE ${pattern}
      )
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

async function searchStrategy(
  workspaceId: string,
  query: string,
  limit: number,
) {
  const sql = getDb();
  const pattern = query ? `%${query}%` : "%";
  return sql<{ id: string; title: string; type: string; status: string }[]>`
    SELECT id, title, type::text, status::text
    FROM strategy_items
    WHERE workspace_id = ${workspaceId}
      AND (
        ${query} = ''
        OR title ILIKE ${pattern}
        OR content ILIKE ${pattern}
      )
    ORDER BY sort_order ASC
    LIMIT ${limit}
  `;
}

export function registerSearchTools(server: McpServer) {
  server.registerTool(
    "search_knomera",
    {
      title: "Search Knomera",
      description:
        "Search Knomera domain objects by text. Deterministic database search — not an LLM.",
      inputSchema: z.object({
        query: z.string().describe("Search text"),
        types: searchTypesSchema.describe("Optional type filter"),
        limit: z.number().int().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("search_knomera", async (ctx, args) => {
      const query = String(args.query ?? "");
      const limit = clampLimit(
        typeof args.limit === "number" ? args.limit : undefined,
      );
      const rawTypes = Array.isArray(args.types)
        ? (args.types as string[])
        : undefined;

      const mapped = (rawTypes ?? []).map(mapSearchType).filter(Boolean);
      const includeFindings =
        !rawTypes ||
        mapped.includes("research_finding") ||
        rawTypes.includes("research_finding");
      const includeStrategy =
        !rawTypes ||
        mapped.includes("strategy") ||
        rawTypes.includes("strategy");

      const searchable = (
        mapped.filter(
          (t): t is SearchableObjectType =>
            t != null &&
            (SEARCHABLE_OBJECT_TYPES as readonly string[]).includes(t),
        ) as SearchableObjectType[]
      );

      const results: Array<Record<string, unknown>> = [];

      if (!rawTypes || searchable.length > 0 || (!includeFindings && !includeStrategy && searchable.length === 0)) {
        const types =
          searchable.length > 0
            ? searchable
            : rawTypes
              ? searchable
              : undefined;
        if (!rawTypes || (types && types.length > 0)) {
          const rows = await searchWorkspaceObjects(ctx.workspaceId, {
            query,
            types: types && types.length > 0 ? types : undefined,
            limit,
          });
          for (const row of rows) {
            results.push({
              type: row.type === "contact" ? "person" : row.type === "discovery_session" ? "discovery" : row.type,
              id: row.id,
              title: row.title,
              subtitle: row.subtitle,
              meta: row.meta,
              url: absoluteAppPath(row.href),
            });
          }
        }
      }

      if (includeFindings) {
        const findings = await searchResearchFindings(
          ctx.workspaceId,
          query,
          limit,
        );
        for (const f of findings) {
          results.push({
            type: "research_finding",
            id: f.id,
            title: f.claim,
            subtitle: f.research_type,
            meta: f.status,
            url: absoluteAppPath("/evidence/research"),
          });
        }
      }

      if (includeStrategy) {
        const items = await searchStrategy(ctx.workspaceId, query, limit);
        for (const s of items) {
          results.push({
            type: "strategy",
            id: s.id,
            title: s.title,
            subtitle: s.type,
            meta: s.status,
            url: absoluteAppPath("/strategy"),
          });
        }
      }

      return {
        data: { query, count: results.slice(0, limit).length, results: results.slice(0, limit) },
      };
    }),
  );

  server.registerTool(
    "search",
    {
      title: "Search",
      description:
        "Standard MCP search compatibility. Maps onto Knomera domain search.",
      inputSchema: z.object({
        query: z.string(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("search", async (ctx, args) => {
      const query = String(args.query ?? "");
      const rows = await searchWorkspaceObjects(ctx.workspaceId, {
        query,
        limit: 20,
      });
      return {
        data: {
          results: rows.map((row) => ({
            id: `${row.type}:${row.id}`,
            title: row.title,
            url: absoluteAppPath(row.href),
            text: [row.subtitle, row.meta].filter(Boolean).join(" · "),
          })),
        },
      };
    }),
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch",
      description:
        "Standard MCP fetch compatibility. id format: type:uuid (e.g. assumption:<id>).",
      inputSchema: z.object({
        id: z.string().describe("Composite id type:uuid"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("fetch", async (ctx, args) => {
      const raw = String(args.id ?? "");
      const idx = raw.indexOf(":");
      if (idx < 0) throw new Error("id must be type:uuid");
      const type = raw.slice(0, idx);
      const id = raw.slice(idx + 1);
      if (!id) throw new Error("Missing record id");

      let title = "";
      let text = "";
      let url = absoluteAppPath("/");

      switch (type) {
        case "assumption": {
          const row = await getAssumption(ctx.workspaceId, id);
          if (!row) throw new Error("Assumption not found");
          title = row.statement;
          text = JSON.stringify({
            statement: row.statement,
            description: row.description,
            category: row.category,
            importance: row.importance,
            confidence: row.confidence,
            status: row.status,
          });
          url = absoluteRecordUrl("assumption", id);
          break;
        }
        case "evidence": {
          const row = await getEvidence(ctx.workspaceId, id);
          if (!row) throw new Error("Evidence not found");
          title = row.title;
          text = JSON.stringify({
            title: row.title,
            description: row.description,
            direction: row.direction,
            strength: row.strength,
            evidence_class: row.evidence_class,
          });
          url = absoluteRecordUrl("evidence", id);
          break;
        }
        case "problem": {
          const row = await getProblem(ctx.workspaceId, id);
          if (!row) throw new Error("Problem not found");
          title = row.title;
          text = JSON.stringify(row);
          url = absoluteRecordUrl("problem", id);
          break;
        }
        case "organisation": {
          const row = await getOrganisation(ctx.workspaceId, id);
          if (!row) throw new Error("Organisation not found");
          title = row.name;
          text = JSON.stringify(row);
          url = absoluteRecordUrl("organisation", id);
          break;
        }
        case "person":
        case "contact": {
          const row = await getContact(ctx.workspaceId, id);
          if (!row) throw new Error("Person not found");
          title = row.name;
          text = JSON.stringify(row);
          url = absoluteRecordUrl("contact", id);
          break;
        }
        case "discovery":
        case "discovery_session": {
          const row = await getDiscoverySession(ctx.workspaceId, id);
          if (!row) throw new Error("Discovery session not found");
          title = row.title;
          text = JSON.stringify({
            title: row.title,
            summary: row.summary,
            session_date: row.session_date,
          });
          url = absoluteRecordUrl("discovery_session", id);
          break;
        }
        case "bet": {
          const row = await getBet(ctx.workspaceId, id);
          if (!row) throw new Error("Bet not found");
          title = row.title;
          text = JSON.stringify(row);
          url = absoluteRecordUrl("bet", id);
          break;
        }
        case "decision": {
          const row = await getDecision(ctx.workspaceId, id);
          if (!row) throw new Error("Decision not found");
          title = row.title;
          text = JSON.stringify(row);
          url = absoluteRecordUrl("decision", id);
          break;
        }
        case "strategy": {
          const row = await getStrategyItem(ctx.workspaceId, id);
          if (!row) throw new Error("Strategy item not found");
          title = row.title;
          text = JSON.stringify(row);
          url = absoluteAppPath("/strategy");
          break;
        }
        case "research_finding": {
          const row = await getResearchFinding(ctx.workspaceId, id);
          if (!row) throw new Error("Research finding not found");
          title = row.claim;
          text = JSON.stringify({
            claim: row.claim,
            summary: row.summary,
            status: row.status,
            assumptions: row.assumptions,
            sources: row.sources,
          });
          url = absoluteAppPath("/evidence/research");
          break;
        }
        default:
          throw new Error(`Unsupported fetch type: ${type}`);
      }

      return {
        data: { id: raw, title, text, url, metadata: { type } },
        targetIds: [id],
      };
    }),
  );
}
