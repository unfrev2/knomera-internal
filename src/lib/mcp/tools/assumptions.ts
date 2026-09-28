import { z } from "zod4";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  getAssumption,
  listAssumptions,
} from "@/lib/db/assumptions";
import { listBetsForAssumption } from "@/lib/db/bets";
import { getDb } from "@/lib/db/client";
import { listDecisionsForAssumption } from "@/lib/db/decisions";
import {
  listEvidenceForAssumption,
} from "@/lib/db/evidence";
import { listAssumptionHistory } from "@/lib/db/history";
import { listProblemsForAssumption } from "@/lib/db/problems";
import {
  listPendingFindingsForAssumption,
  listResearchFindingDetails,
} from "@/lib/db/research-findings";
import { suggestConfidence } from "@/lib/domain/suggested-confidence";
import { calculateValidationPriority } from "@/lib/domain/priority";
import type {
  AssumptionStatus,
  Confidence,
  EvidenceClass,
  Importance,
} from "@/lib/types";
import { clampLimit, takeCap } from "@/lib/mcp/limits";
import { absoluteRecordUrl } from "@/lib/mcp/urls";
import { withMcpTool } from "@/lib/mcp/tools/_helpers";

function compactEvidence(e: {
  id: string;
  title: string;
  direction: string;
  strength: number;
  evidence_class: string;
  evidence_type: string;
  source?: string | null;
  source_title?: string | null;
  source_url?: string | null;
  organisation_name?: string | null;
  created_by?: string | null;
  evidence_date?: string;
}) {
  return {
    id: e.id,
    title: e.title,
    direction: e.direction,
    strength: e.strength,
    class: e.evidence_class,
    type: e.evidence_type,
    source: e.source_title ?? e.source ?? null,
    source_url: e.source_url ?? null,
    organisation: e.organisation_name ?? null,
    created_by: e.created_by ?? null,
    date: e.evidence_date ?? null,
    url: absoluteRecordUrl("evidence", e.id),
  };
}

export function registerAssumptionTools(server: McpServer) {
  server.registerTool(
    "search_assumptions",
    {
      title: "Search assumptions",
      description: "Filter assumptions with deterministic SQL/domain logic.",
      inputSchema: z.object({
        query: z.string().optional(),
        category: z.string().optional(),
        importance: z
          .enum(["critical", "high", "medium", "low"])
          .optional(),
        confidence: z
          .enum(["low", "medium", "high", "proven"])
          .optional(),
        status: z
          .enum([
            "untested",
            "testing",
            "supported",
            "challenged",
            "disproved",
          ])
          .optional(),
        owner: z.string().optional(),
        problem: z.string().uuid().optional(),
        bet: z.string().uuid().optional(),
        evidence_class: z.enum(["direct", "secondary", "internal"]).optional(),
        has_direct_evidence: z.boolean().optional(),
        has_secondary_evidence: z.boolean().optional(),
        has_challenging_evidence: z.boolean().optional(),
        limit: z.number().int().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("search_assumptions", async (ctx, args) => {
      const limit = clampLimit(
        typeof args.limit === "number" ? args.limit : undefined,
      );
      let rows = await listAssumptions(ctx.workspaceId, {
        search: typeof args.query === "string" ? args.query : undefined,
        category: typeof args.category === "string" ? args.category : undefined,
        importance: args.importance as Importance | undefined,
        confidence: args.confidence as Confidence | undefined,
        status: args.status as AssumptionStatus | undefined,
        owner: typeof args.owner === "string" ? args.owner : undefined,
      });

      if (typeof args.problem === "string") {
        const sql = getDb();
        const ids = await sql<{ assumption_id: string }[]>`
          SELECT assumption_id FROM problem_assumptions
          WHERE workspace_id = ${ctx.workspaceId}
            AND problem_id = ${args.problem}
        `;
        const set = new Set(ids.map((r) => r.assumption_id));
        rows = rows.filter((r) => set.has(r.id));
      }

      if (typeof args.bet === "string") {
        const sql = getDb();
        const ids = await sql<{ assumption_id: string }[]>`
          SELECT assumption_id FROM bet_assumptions
          WHERE workspace_id = ${ctx.workspaceId}
            AND bet_id = ${args.bet}
        `;
        const set = new Set(ids.map((r) => r.assumption_id));
        rows = rows.filter((r) => set.has(r.id));
      }

      const needsEvidenceFilter =
        args.has_direct_evidence != null ||
        args.has_secondary_evidence != null ||
        args.has_challenging_evidence != null ||
        typeof args.evidence_class === "string";

      if (needsEvidenceFilter && rows.length > 0) {
        const sql = getDb();
        const evidenceRows = await sql<
          {
            assumption_id: string;
            evidence_class: string;
            direction: string;
          }[]
        >`
          SELECT assumption_id, evidence_class::text, direction::text
          FROM evidence
          WHERE workspace_id = ${ctx.workspaceId}
            AND assumption_id IN ${sql(rows.map((r) => r.id))}
        `;
        const byAssumption = new Map<
          string,
          { classes: Set<string>; challenging: boolean }
        >();
        for (const e of evidenceRows) {
          const entry = byAssumption.get(e.assumption_id) ?? {
            classes: new Set<string>(),
            challenging: false,
          };
          entry.classes.add(e.evidence_class);
          if (e.direction === "challenges") entry.challenging = true;
          byAssumption.set(e.assumption_id, entry);
        }

        rows = rows.filter((r) => {
          const info = byAssumption.get(r.id) ?? {
            classes: new Set<string>(),
            challenging: false,
          };
          if (
            typeof args.evidence_class === "string" &&
            !info.classes.has(args.evidence_class as EvidenceClass)
          ) {
            return false;
          }
          if (
            args.has_direct_evidence === true &&
            !info.classes.has("direct")
          ) {
            return false;
          }
          if (
            args.has_direct_evidence === false &&
            info.classes.has("direct")
          ) {
            return false;
          }
          if (
            args.has_secondary_evidence === true &&
            !info.classes.has("secondary")
          ) {
            return false;
          }
          if (
            args.has_secondary_evidence === false &&
            info.classes.has("secondary")
          ) {
            return false;
          }
          if (
            args.has_challenging_evidence === true &&
            !info.challenging
          ) {
            return false;
          }
          if (
            args.has_challenging_evidence === false &&
            info.challenging
          ) {
            return false;
          }
          return true;
        });
      }

      const sliced = rows.slice(0, limit);
      return {
        data: {
          count: sliced.length,
          total_matched: rows.length,
          assumptions: sliced.map((a) => ({
            id: a.id,
            statement: a.statement,
            category: a.category,
            importance: a.importance,
            confidence: a.confidence,
            status: a.status,
            owner: a.owner,
            evidence_count: a.evidence_count ?? null,
            url: absoluteRecordUrl("assumption", a.id),
          })),
        },
        targetIds: sliced.map((a) => a.id),
      };
    }),
  );

  server.registerTool(
    "get_assumption_context",
    {
      title: "Get assumption context",
      description:
        "Full assumption context: problems, evidence (grouped), research, bets, decisions, recent history.",
      inputSchema: z.object({
        assumption_id: z.string().uuid(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("get_assumption_context", async (ctx, args) => {
      const id = String(args.assumption_id);
      const assumption = await getAssumption(ctx.workspaceId, id);
      if (!assumption) throw new Error("Assumption not found");

      const [
        problems,
        evidence,
        pendingFindings,
        allFindings,
        bets,
        decisions,
        history,
      ] = await Promise.all([
        listProblemsForAssumption(ctx.workspaceId, id),
        listEvidenceForAssumption(ctx.workspaceId, id),
        listPendingFindingsForAssumption(ctx.workspaceId, id),
        listResearchFindingDetails(ctx.workspaceId),
        listBetsForAssumption(ctx.workspaceId, id),
        listDecisionsForAssumption(ctx.workspaceId, id),
        listAssumptionHistory(ctx.workspaceId, id),
      ]);

      const relatedFindings = allFindings.filter(
        (f) =>
          f.status !== "pending" &&
          f.assumptions.some((a) => a.assumption_id === id),
      );

      const grouped = {
        supporting: evidence
          .filter((e) => e.direction === "supports")
          .map(compactEvidence),
        challenging: evidence
          .filter((e) => e.direction === "challenges")
          .map(compactEvidence),
        neutral: evidence
          .filter((e) => e.direction === "neutral")
          .map(compactEvidence),
      };

      const byClass = {
        direct: evidence.filter((e) => e.evidence_class === "direct").length,
        secondary: evidence.filter((e) => e.evidence_class === "secondary")
          .length,
        internal: evidence.filter((e) => e.evidence_class === "internal")
          .length,
      };

      const suggested = suggestConfidence(evidence);
      const recentHistory = takeCap(
        [...history].reverse().map((h) => ({
          field: h.field_changed,
          from: h.old_value,
          to: h.new_value,
          by: h.changed_by,
          at: h.changed_at,
        })),
        10,
      );

      return {
        data: {
          assumption: {
            id: assumption.id,
            statement: assumption.statement,
            description: assumption.description,
            category: assumption.category,
            importance: assumption.importance,
            confidence: assumption.confidence,
            suggested_confidence: suggested.level,
            suggested_confidence_explanation: suggested.explanation,
            status: assumption.status,
            owner: assumption.owner,
            next_action: assumption.next_action,
            target_date: assumption.target_date,
            url: absoluteRecordUrl("assumption", id),
          },
          problems: takeCap(
            problems.map((p) => ({
              id: p.id,
              title: p.title,
              status: p.status,
              severity: p.severity,
              url: absoluteRecordUrl("problem", p.id),
            })),
          ),
          evidence: {
            counts: {
              total: evidence.length,
              by_direction: {
                supporting: grouped.supporting.length,
                challenging: grouped.challenging.length,
                neutral: grouped.neutral.length,
              },
              by_class: byClass,
            },
            supporting: takeCap(grouped.supporting),
            challenging: takeCap(grouped.challenging),
            neutral: takeCap(grouped.neutral),
          },
          research: {
            pending: takeCap(
              pendingFindings.map((f) => ({
                id: f.id,
                claim: f.claim,
                summary: f.summary,
                status: f.status,
                sources: f.sources.map((s) => ({
                  title: s.title,
                  url: s.url,
                })),
              })),
            ),
            reviewed: takeCap(
              relatedFindings.map((f) => ({
                id: f.id,
                claim: f.claim,
                status: f.status,
                summary: f.summary,
              })),
            ),
          },
          bets: takeCap(
            bets.map((b) => ({
              id: b.id,
              title: b.title,
              status: b.status,
              url: absoluteRecordUrl("bet", b.id),
            })),
          ),
          decisions: takeCap(
            decisions.map((d) => ({
              id: d.id,
              title: d.title,
              status: d.status,
              url: absoluteRecordUrl("decision", d.id),
            })),
          ),
          history: recentHistory,
        },
        targetIds: [id],
      };
    }),
  );

  server.registerTool(
    "find_validation_gaps",
    {
      title: "Find validation gaps",
      description:
        "Deterministic gaps: critical without direct evidence, low-confidence secondary-only, conflicting evidence, weak assumptions under active bets.",
      inputSchema: z.object({
        limit: z.number().int().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("find_validation_gaps", async (ctx, args) => {
      const limit = clampLimit(
        typeof args.limit === "number" ? args.limit : undefined,
      );
      const assumptions = await listAssumptions(ctx.workspaceId);
      const sql = getDb();
      const evidence = await sql<
        {
          assumption_id: string;
          evidence_type: string;
          evidence_class: string;
          strength: number;
          direction: string;
        }[]
      >`
        SELECT assumption_id, evidence_type::text, evidence_class::text,
               strength, direction::text
        FROM evidence
        WHERE workspace_id = ${ctx.workspaceId}
      `;
      const byAssumption = new Map<
        string,
        Array<{
          assumption_id: string;
          evidence_type: string;
          evidence_class: string;
          strength: number;
          direction: string;
        }>
      >();
      for (const e of evidence) {
        const list = byAssumption.get(e.assumption_id) ?? [];
        list.push(e);
        byAssumption.set(e.assumption_id, list);
      }

      const activeBetLinks = await sql<{ assumption_id: string; bet_id: string; bet_title: string }[]>`
        SELECT ba.assumption_id, b.id AS bet_id, b.title AS bet_title
        FROM bet_assumptions ba
        INNER JOIN bets b ON b.id = ba.bet_id AND b.workspace_id = ba.workspace_id
        WHERE ba.workspace_id = ${ctx.workspaceId}
          AND b.status IN ('active', 'proposed')
      `;
      const activeBetAssumptions = new Set(
        activeBetLinks.map((r) => r.assumption_id),
      );

      const criticalNoDirect: unknown[] = [];
      const lowConfSecondaryOnly: unknown[] = [];
      const conflicting: unknown[] = [];
      const weakUnderBets: unknown[] = [];

      for (const a of assumptions) {
        const ev = byAssumption.get(a.id) ?? [];
        const hasDirect = ev.some((e) => e.evidence_class === "direct");
        const hasSecondary = ev.some((e) => e.evidence_class === "secondary");
        const supports = ev.some((e) => e.direction === "supports");
        const challenges = ev.some((e) => e.direction === "challenges");

        if (a.importance === "critical" && !hasDirect) {
          criticalNoDirect.push({
            id: a.id,
            statement: a.statement,
            confidence: a.confidence,
            url: absoluteRecordUrl("assumption", a.id),
          });
        }
        if (
          a.confidence === "low" &&
          hasSecondary &&
          !hasDirect
        ) {
          lowConfSecondaryOnly.push({
            id: a.id,
            statement: a.statement,
            url: absoluteRecordUrl("assumption", a.id),
          });
        }
        if (supports && challenges) {
          conflicting.push({
            id: a.id,
            statement: a.statement,
            url: absoluteRecordUrl("assumption", a.id),
          });
        }
        if (
          activeBetAssumptions.has(a.id) &&
          (a.confidence === "low" || !hasDirect)
        ) {
          const bets = activeBetLinks
            .filter((l) => l.assumption_id === a.id)
            .map((l) => ({ id: l.bet_id, title: l.bet_title }));
          weakUnderBets.push({
            id: a.id,
            statement: a.statement,
            confidence: a.confidence,
            has_direct_evidence: hasDirect,
            bets,
            url: absoluteRecordUrl("assumption", a.id),
          });
        }
      }

      const ranked = assumptions
        .map((a) =>
          calculateValidationPriority({
            assumption: a,
            evidence: (byAssumption.get(a.id) ?? []).map((e) => ({
              evidence_type: e.evidence_type as import("@/lib/types").EvidenceType,
              strength: e.strength,
              direction: e.direction as import("@/lib/types").EvidenceDirection,
            })),
          }),
        )
        .sort((x, y) => y.score - x.score)
        .slice(0, limit)
        .map((r) => ({
          id: r.assumptionId,
          statement: r.statement,
          score: r.score,
          reasons: r.reasons,
          url: absoluteRecordUrl("assumption", r.assumptionId),
        }));

      return {
        data: {
          critical_without_direct_evidence: takeCap(criticalNoDirect),
          low_confidence_secondary_only: takeCap(lowConfSecondaryOnly),
          conflicting_evidence: takeCap(conflicting),
          weak_assumptions_under_active_bets: takeCap(weakUnderBets),
          priority_ranked: ranked,
        },
      };
    }),
  );
}
