import { z } from "zod4";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  getContactDetail,
  listContacts,
} from "@/lib/db/contacts";
import { getDb } from "@/lib/db/client";
import {
  getDiscoverySession,
  listEvidenceForDiscoverySession,
  listProblemsForDiscoverySession,
} from "@/lib/db/discovery";
import {
  getOrganisationDetail,
  listOrganisations,
} from "@/lib/db/organisations";
import { listResearchFindingDetails } from "@/lib/db/research-findings";
import type { OrganisationType } from "@/lib/types";
import { clampLimit, takeCap } from "@/lib/mcp/limits";
import { absoluteRecordUrl } from "@/lib/mcp/urls";
import { withMcpTool } from "@/lib/mcp/tools/_helpers";

export function registerOrgPeopleTools(server: McpServer) {
  server.registerTool(
    "search_organisations",
    {
      title: "Search organisations",
      description: "Search organisations with optional type and activity filters.",
      inputSchema: z.object({
        query: z.string().optional(),
        organisation_type: z
          .enum(["prospect", "customer", "partner", "competitor", "other"])
          .optional(),
        has_evidence: z.boolean().optional(),
        has_opportunity: z.boolean().optional(),
        limit: z.number().int().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("search_organisations", async (ctx, args) => {
      const limit = clampLimit(
        typeof args.limit === "number" ? args.limit : undefined,
      );
      let rows = await listOrganisations(
        ctx.workspaceId,
        typeof args.query === "string" ? args.query : undefined,
      );
      if (typeof args.organisation_type === "string") {
        rows = rows.filter(
          (o) =>
            o.organisation_type === (args.organisation_type as OrganisationType),
        );
      }
      if (args.has_evidence === true) {
        rows = rows.filter((o) => (o.evidence_count ?? 0) > 0);
      }
      if (args.has_evidence === false) {
        rows = rows.filter((o) => (o.evidence_count ?? 0) === 0);
      }
      if (args.has_opportunity === true) {
        rows = rows.filter((o) => (o.opportunity_count ?? 0) > 0);
      }
      if (args.has_opportunity === false) {
        rows = rows.filter((o) => (o.opportunity_count ?? 0) === 0);
      }
      const sliced = rows.slice(0, limit);
      return {
        data: {
          count: sliced.length,
          organisations: sliced.map((o) => ({
            id: o.id,
            name: o.name,
            type: o.organisation_type,
            website: o.website,
            evidence_count: o.evidence_count ?? null,
            opportunity_count: o.opportunity_count ?? null,
            url: absoluteRecordUrl("organisation", o.id),
          })),
        },
        targetIds: sliced.map((o) => o.id),
      };
    }),
  );

  server.registerTool(
    "get_organisation_context",
    {
      title: "Get organisation context",
      description:
        "Organisation detail with people, discovery, evidence, opportunities, research.",
      inputSchema: z.object({
        organisation_id: z.string().uuid(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("get_organisation_context", async (ctx, args) => {
      const id = String(args.organisation_id);
      const detail = await getOrganisationDetail(ctx.workspaceId, id);
      if (!detail) throw new Error("Organisation not found");

      const findings = (await listResearchFindingDetails(ctx.workspaceId)).filter(
        (f) => f.organisation_id === id,
      );

      const evidenceIds = new Set<string>();
      const evidence = detail.evidence.filter((e) => {
        if (evidenceIds.has(e.id)) return false;
        evidenceIds.add(e.id);
        return true;
      });

      const assumptionIds = [...new Set(evidence.map((e) => e.assumption_id))];
      const sql = getDb();
      const assumptions =
        assumptionIds.length === 0
          ? []
          : await sql<{ id: string; statement: string }[]>`
              SELECT id, statement FROM assumptions
              WHERE workspace_id = ${ctx.workspaceId}
                AND id IN ${sql(assumptionIds)}
            `;

      return {
        data: {
          organisation: {
            id: detail.organisation.id,
            name: detail.organisation.name,
            type: detail.organisation.organisation_type,
            website: detail.organisation.website,
            notes: detail.organisation.notes,
            url: absoluteRecordUrl("organisation", id),
          },
          people: takeCap(
            detail.contacts.map((c) => ({
              id: c.id,
              name: c.name,
              role: c.role,
              url: absoluteRecordUrl("contact", c.id),
            })),
          ),
          discovery: takeCap(
            detail.sessions.map((s) => ({
              id: s.id,
              title: s.title,
              date: s.session_date,
              url: absoluteRecordUrl("discovery_session", s.id),
            })),
          ),
          evidence: takeCap(
            evidence.map((e) => ({
              id: e.id,
              title: e.title,
              direction: e.direction,
              class: e.evidence_class,
              url: absoluteRecordUrl("evidence", e.id),
            })),
          ),
          assumptions_informed: takeCap(
            assumptions.map((a) => ({
              id: a.id,
              statement: a.statement,
              url: absoluteRecordUrl("assumption", a.id),
            })),
          ),
          commercial_opportunities: takeCap(
            detail.opportunities.map((o) => ({
              id: o.id,
              title: o.title,
              stage: o.stage,
              url: absoluteRecordUrl("opportunity", o.id),
            })),
          ),
          research_findings: takeCap(
            findings.map((f) => ({
              id: f.id,
              claim: f.claim,
              status: f.status,
              research_type: f.research_type,
            })),
          ),
          competitor_research:
            detail.organisation.organisation_type === "competitor"
              ? takeCap(
                  evidence
                    .filter((e) => e.evidence_type === "competitor_research")
                    .map((e) => ({
                      id: e.id,
                      title: e.title,
                      url: absoluteRecordUrl("evidence", e.id),
                    })),
                )
              : null,
        },
        targetIds: [id],
      };
    }),
  );

  server.registerTool(
    "search_people",
    {
      title: "Search people",
      description: "Search contacts (people) linked to organisations.",
      inputSchema: z.object({
        query: z.string().optional(),
        organisation: z.string().uuid().optional(),
        role: z.string().optional(),
        has_evidence: z.boolean().optional(),
        limit: z.number().int().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("search_people", async (ctx, args) => {
      const limit = clampLimit(
        typeof args.limit === "number" ? args.limit : undefined,
      );
      let rows = await listContacts(
        ctx.workspaceId,
        typeof args.query === "string" ? args.query : undefined,
      );
      if (typeof args.organisation === "string") {
        rows = rows.filter((c) => c.organisation_id === args.organisation);
      }
      if (typeof args.role === "string") {
        const role = args.role.toLowerCase();
        rows = rows.filter((c) => (c.role ?? "").toLowerCase().includes(role));
      }
      if (args.has_evidence === true) {
        rows = rows.filter((c) => (c.evidence_count ?? 0) > 0);
      }
      if (args.has_evidence === false) {
        rows = rows.filter((c) => (c.evidence_count ?? 0) === 0);
      }
      const sliced = rows.slice(0, limit);
      return {
        data: {
          count: sliced.length,
          people: sliced.map((c) => ({
            id: c.id,
            name: c.name,
            role: c.role,
            organisation_id: c.organisation_id,
            organisation_name: c.organisation_name ?? null,
            evidence_count: c.evidence_count ?? null,
            url: absoluteRecordUrl("contact", c.id),
          })),
        },
        targetIds: sliced.map((c) => c.id),
      };
    }),
  );

  server.registerTool(
    "get_person_context",
    {
      title: "Get person context",
      description: "Person/contact context with org, discovery, evidence, assumptions.",
      inputSchema: z.object({
        person_id: z.string().uuid(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("get_person_context", async (ctx, args) => {
      const id = String(args.person_id);
      const detail = await getContactDetail(ctx.workspaceId, id);
      if (!detail) throw new Error("Person not found");

      const assumptionIds = [
        ...new Set(detail.evidence.map((e) => e.assumption_id)),
      ];
      const sql = getDb();
      const assumptions =
        assumptionIds.length === 0
          ? []
          : await sql<{ id: string; statement: string }[]>`
              SELECT id, statement FROM assumptions
              WHERE workspace_id = ${ctx.workspaceId}
                AND id IN ${sql(assumptionIds)}
            `;

      return {
        data: {
          person: {
            id: detail.contact.id,
            name: detail.contact.name,
            role: detail.contact.role,
            email: detail.contact.email,
            url: absoluteRecordUrl("contact", id),
          },
          organisation: {
            id: detail.organisation.id,
            name: detail.organisation.name,
            type: detail.organisation.organisation_type,
            url: absoluteRecordUrl("organisation", detail.organisation.id),
          },
          discovery: takeCap(
            detail.sessions.map((s) => ({
              id: s.id,
              title: s.title,
              date: s.session_date,
              url: absoluteRecordUrl("discovery_session", s.id),
            })),
          ),
          evidence: takeCap(
            detail.evidence.map((e) => ({
              id: e.id,
              title: e.title,
              direction: e.direction,
              url: absoluteRecordUrl("evidence", e.id),
            })),
          ),
          assumptions_informed: takeCap(
            assumptions.map((a) => ({
              id: a.id,
              statement: a.statement,
              url: absoluteRecordUrl("assumption", a.id),
            })),
          ),
        },
        targetIds: [id],
      };
    }),
  );

  server.registerTool(
    "get_discovery_context",
    {
      title: "Get discovery context",
      description:
        "Discovery session context. Returns stored summary/notes; does not invoke AI.",
      inputSchema: z.object({
        discovery_session_id: z.string().uuid(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("get_discovery_context", async (ctx, args) => {
      const id = String(args.discovery_session_id);
      const session = await getDiscoverySession(ctx.workspaceId, id);
      if (!session) throw new Error("Discovery session not found");

      const [problems, evidence] = await Promise.all([
        listProblemsForDiscoverySession(ctx.workspaceId, id),
        listEvidenceForDiscoverySession(ctx.workspaceId, id),
      ]);

      const assumptionIds = [...new Set(evidence.map((e) => e.assumption_id))];
      const sql = getDb();
      const assumptions =
        assumptionIds.length === 0
          ? []
          : await sql<{ id: string; statement: string }[]>`
              SELECT id, statement FROM assumptions
              WHERE workspace_id = ${ctx.workspaceId}
                AND id IN ${sql(assumptionIds)}
            `;

      return {
        data: {
          session: {
            id: session.id,
            title: session.title,
            date: session.session_date,
            conducted_by: session.conducted_by,
            summary: session.summary,
            notes: session.raw_notes,
            url: absoluteRecordUrl("discovery_session", id),
          },
          organisation: {
            id: session.organisation_id,
            name: session.organisation_name ?? null,
          },
          participants: session.contact_id
            ? [
                {
                  id: session.contact_id,
                  name: session.contact_name ?? null,
                  role: session.contact_role ?? null,
                },
              ]
            : [],
          problems_discussed: takeCap(
            problems.map((p) => ({
              id: p.id,
              title: p.title,
              url: absoluteRecordUrl("problem", p.id),
            })),
          ),
          evidence_generated: takeCap(
            evidence.map((e) => ({
              id: e.id,
              title: e.title,
              direction: e.direction,
              url: absoluteRecordUrl("evidence", e.id),
            })),
          ),
          assumptions_informed: takeCap(
            assumptions.map((a) => ({
              id: a.id,
              statement: a.statement,
              url: absoluteRecordUrl("assumption", a.id),
            })),
          ),
        },
        targetIds: [id],
      };
    }),
  );
}
