import { z } from "zod4";
import type { McpServer } from "@modelcontextprotocol/server";
import {
  getBet,
  listAssumptionsForBet,
  listDecisionsForBet,
  listOutcomesForBet,
  listProblemsForBet,
} from "@/lib/db/bets";
import {
  getDecision,
  listAssumptionsForDecision,
  listEvidenceForDecision,
  listProblemsForDecision,
} from "@/lib/db/decisions";
import { listEvidenceForAssumption } from "@/lib/db/evidence";
import {
  getProblem,
  listAssumptionsForProblem,
  listEvidenceForProblem,
} from "@/lib/db/problems";
import { listBetsForProblem } from "@/lib/db/bets";
import { listDecisionsForProblem } from "@/lib/db/decisions";
import { listIdeas } from "@/lib/db/ideas";
import { getDb } from "@/lib/db/client";
import { listStrategyItems } from "@/lib/db/strategy";
import { takeCap } from "@/lib/mcp/limits";
import { absoluteRecordUrl, absoluteAppPath } from "@/lib/mcp/urls";
import { withMcpTool } from "@/lib/mcp/tools/_helpers";

export function registerStrategyExecutionTools(server: McpServer) {
  server.registerTool(
    "get_strategy",
    {
      title: "Get strategy",
      description: "Current strategy items ordered by sort_order. Lightweight.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("get_strategy", async (ctx) => {
      const items = await listStrategyItems(ctx.workspaceId);
      const active = items.filter((i) => i.status === "active");
      const list = (active.length > 0 ? active : items).map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        content: i.content,
        status: i.status,
        sort_order: i.sort_order,
      }));
      return {
        data: {
          url: absoluteAppPath("/strategy"),
          items: list,
        },
      };
    }),
  );

  server.registerTool(
    "get_problem_context",
    {
      title: "Get problem context",
      description:
        "Problem context answering what we believe about this problem and why.",
      inputSchema: z.object({
        problem_id: z.string().uuid(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("get_problem_context", async (ctx, args) => {
      const id = String(args.problem_id);
      const problem = await getProblem(ctx.workspaceId, id);
      if (!problem) throw new Error("Problem not found");

      const [assumptions, evidence, bets, decisions, ideas] = await Promise.all([
        listAssumptionsForProblem(ctx.workspaceId, id),
        listEvidenceForProblem(ctx.workspaceId, id),
        listBetsForProblem(ctx.workspaceId, id),
        listDecisionsForProblem(ctx.workspaceId, id),
        listIdeas(ctx.workspaceId, { search: problem.title }),
      ]);

      const sql = getDb();
      const orgs = await sql<{ id: string; name: string }[]>`
        SELECT DISTINCT o.id, o.name
        FROM organisations o
        INNER JOIN discovery_sessions s
          ON s.organisation_id = o.id AND s.workspace_id = o.workspace_id
        INNER JOIN discovery_problems dp
          ON dp.discovery_session_id = s.id AND dp.workspace_id = s.workspace_id
        WHERE o.workspace_id = ${ctx.workspaceId}
          AND dp.problem_id = ${id}
        ORDER BY o.name ASC
      `;

      const discovery = await sql<{ id: string; title: string; session_date: string }[]>`
        SELECT s.id, s.title, s.session_date::text
        FROM discovery_sessions s
        INNER JOIN discovery_problems dp
          ON dp.discovery_session_id = s.id AND dp.workspace_id = s.workspace_id
        WHERE s.workspace_id = ${ctx.workspaceId}
          AND dp.problem_id = ${id}
        ORDER BY s.session_date DESC
      `;

      const evidenceSeen = new Set<string>();
      const uniqueEvidence = evidence.filter((e) => {
        if (evidenceSeen.has(e.id)) return false;
        evidenceSeen.add(e.id);
        return true;
      });

      return {
        data: {
          problem: {
            id: problem.id,
            title: problem.title,
            description: problem.description,
            severity: problem.severity,
            confidence: problem.confidence,
            status: problem.status,
            target_customer: problem.target_customer,
            owner: problem.owner,
            url: absoluteRecordUrl("problem", id),
          },
          linked_assumptions: takeCap(
            assumptions.map((a) => ({
              id: a.assumption_id,
              statement: a.assumption_statement,
              importance: a.assumption_importance,
              confidence: a.assumption_confidence,
              status: a.assumption_status,
              url: absoluteRecordUrl("assumption", a.assumption_id),
            })),
          ),
          evidence_summary: {
            total: uniqueEvidence.length,
            supporting: uniqueEvidence.filter((e) => e.direction === "supports")
              .length,
            challenging: uniqueEvidence.filter(
              (e) => e.direction === "challenges",
            ).length,
            items: takeCap(
              uniqueEvidence.map((e) => ({
                id: e.id,
                title: e.title,
                direction: e.direction,
                url: absoluteRecordUrl("evidence", e.id),
              })),
            ),
          },
          contributing_organisations: takeCap(
            orgs.map((o) => ({
              id: o.id,
              name: o.name,
              url: absoluteRecordUrl("organisation", o.id),
            })),
          ),
          discovery: takeCap(
            discovery.map((d) => ({
              id: d.id,
              title: d.title,
              date: d.session_date,
              url: absoluteRecordUrl("discovery_session", d.id),
            })),
          ),
          linked_ideas: takeCap(
            ideas.slice(0, 10).map((i) => ({
              id: i.id,
              title: i.title,
              status: i.status,
              url: absoluteRecordUrl("idea", i.id),
            })),
          ),
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
        },
        targetIds: [id],
      };
    }),
  );

  server.registerTool(
    "get_bet_context",
    {
      title: "Get bet context",
      description: "Bet detail with hypotheses, links, outcomes, and evidence.",
      inputSchema: z.object({
        bet_id: z.string().uuid(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("get_bet_context", async (ctx, args) => {
      const id = String(args.bet_id);
      const bet = await getBet(ctx.workspaceId, id);
      if (!bet) throw new Error("Bet not found");

      const [problems, assumptions, outcomes, decisions] = await Promise.all([
        listProblemsForBet(ctx.workspaceId, id),
        listAssumptionsForBet(ctx.workspaceId, id),
        listOutcomesForBet(ctx.workspaceId, id),
        listDecisionsForBet(ctx.workspaceId, id),
      ]);

      const evidenceLists = await Promise.all(
        assumptions.map((a) =>
          listEvidenceForAssumption(ctx.workspaceId, a.assumption_id),
        ),
      );
      const evidenceMap = new Map<string, (typeof evidenceLists)[0][number]>();
      for (const list of evidenceLists) {
        for (const e of list) evidenceMap.set(e.id, e);
      }
      const evidence = [...evidenceMap.values()];

      return {
        data: {
          bet: {
            id: bet.id,
            title: bet.title,
            description: bet.description,
            hypothesis: bet.hypothesis,
            status: bet.status,
            owner: bet.owner,
            target_date: bet.target_date,
            success_criteria: bet.success_criteria,
            expected_outcome: bet.expected_outcome,
            url: absoluteRecordUrl("bet", id),
          },
          linked_problems: takeCap(
            problems.map((p) => ({
              id: p.id,
              title: p.title,
              url: absoluteRecordUrl("problem", p.id),
            })),
          ),
          linked_assumptions: takeCap(
            assumptions.map((a) => ({
              id: a.assumption_id,
              statement: a.assumption_statement,
              confidence: a.assumption_confidence,
              importance: a.assumption_importance,
              url: absoluteRecordUrl("assumption", a.assumption_id),
            })),
          ),
          outcomes: takeCap(
            outcomes.map((o) => ({
              id: o.id,
              summary: o.summary,
              result: o.result,
              learning: o.learning,
              date: o.outcome_date,
            })),
          ),
          decisions: takeCap(
            decisions.map((d) => ({
              id: d.id,
              title: d.title,
              url: absoluteRecordUrl("decision", d.id),
            })),
          ),
          relevant_evidence: takeCap(
            evidence.map((e) => ({
              id: e.id,
              title: e.title,
              direction: e.direction,
              class: e.evidence_class,
              url: absoluteRecordUrl("evidence", e.id),
            })),
          ),
        },
        targetIds: [id],
      };
    }),
  );

  server.registerTool(
    "get_decision_context",
    {
      title: "Get decision context",
      description: "Decision with historical context and linked objects.",
      inputSchema: z.object({
        decision_id: z.string().uuid(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    withMcpTool("get_decision_context", async (ctx, args) => {
      const id = String(args.decision_id);
      const decision = await getDecision(ctx.workspaceId, id);
      if (!decision) throw new Error("Decision not found");

      const [assumptions, evidence, problems] = await Promise.all([
        listAssumptionsForDecision(ctx.workspaceId, id),
        listEvidenceForDecision(ctx.workspaceId, id),
        listProblemsForDecision(ctx.workspaceId, id),
      ]);

      const { listBetsForDecision } = await import("@/lib/db/bets");
      const bets = await listBetsForDecision(ctx.workspaceId, id);

      return {
        data: {
          decision: {
            id: decision.id,
            title: decision.title,
            decision: decision.decision,
            context: decision.context,
            rationale: decision.rationale,
            status: decision.status,
            date: decision.decision_date,
            decided_by: decision.decided_by,
            revisit_trigger: decision.revisit_trigger,
            revisit_date: decision.revisit_date,
            url: absoluteRecordUrl("decision", id),
          },
          linked_assumptions: takeCap(
            assumptions.map((a) => ({
              id: a.id,
              statement: a.statement,
              url: absoluteRecordUrl("assumption", a.id),
            })),
          ),
          problems: takeCap(
            problems.map((p) => ({
              id: p.id,
              title: p.title,
              url: absoluteRecordUrl("problem", p.id),
            })),
          ),
          evidence: takeCap(
            evidence.map((e) => ({
              id: e.id,
              title: e.title,
              url: absoluteRecordUrl("evidence", e.id),
            })),
          ),
          bets: takeCap(
            bets.map((b) => ({
              id: b.id,
              title: b.title,
              url: absoluteRecordUrl("bet", b.id),
            })),
          ),
        },
        targetIds: [id],
      };
    }),
  );
}
