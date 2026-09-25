import { getDb } from "@/lib/db/client";
import { weekStartISO } from "@/lib/format";
import type { Bet, FocusItem } from "@/lib/types";

export type HomeAttentionItem = {
  kind:
    | "critical_low"
    | "awaiting_validation"
    | "challenging_evidence"
    | "overdue_action"
    | "active_bet"
    | "commercial_due";
  id: string;
  title: string;
  href: string;
  meta?: string | null;
};

export type HomeLearningItem = {
  kind:
    | "evidence"
    | "discovery"
    | "confidence_change"
    | "status_change"
    | "bet_outcome";
  id: string;
  title: string;
  href: string;
  meta?: string | null;
  at: string;
};

export type HomeCloserMetrics = {
  discovery_sessions: number;
  organisations: number;
  active_opportunities: number;
  proposal_or_pilot: number;
  commercial_evidence: number;
  pipeline_value: number | null;
  pipeline_currency: string;
};

export type HomeDashboard = {
  attention: HomeAttentionItem[];
  learning: HomeLearningItem[];
  activeBets: Bet[];
  jonFocus: FocusItem[];
  ahmedFocus: FocusItem[];
  closer: HomeCloserMetrics;
  activity: HomeLearningItem[];
};

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function getHomeDashboard(
  workspaceId: string,
): Promise<HomeDashboard> {
  const sql = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const since = daysAgoISO(21);
  const week = weekStartISO();

  const [
    criticalLow,
    awaitingValidation,
    overdueActions,
    recentChallenging,
    activeBets,
    commercialDue,
    recentEvidence,
    recentDiscovery,
    confidenceChanges,
    statusChanges,
    recentOutcomes,
    jonFocus,
    ahmedFocus,
    closerRows,
  ] = await Promise.all([
    sql<{ id: string; statement: string; confidence: string }[]>`
      SELECT id, statement, confidence::text
      FROM assumptions
      WHERE workspace_id = ${workspaceId}
        AND importance = 'critical'
        AND confidence IN ('low', 'medium')
        AND status NOT IN ('supported', 'disproved')
      ORDER BY
        CASE confidence WHEN 'low' THEN 0 ELSE 1 END,
        updated_at DESC
      LIMIT 5
    `,
    sql<{ id: string; statement: string; importance: string; status: string }[]>`
      SELECT id, statement, importance::text, status::text
      FROM assumptions
      WHERE workspace_id = ${workspaceId}
        AND status IN ('untested', 'testing')
        AND importance IN ('critical', 'high')
      ORDER BY
        CASE importance WHEN 'critical' THEN 0 ELSE 1 END,
        updated_at DESC
      LIMIT 5
    `,
    sql<
      {
        id: string;
        statement: string;
        next_action: string | null;
        target_date: string | null;
      }[]
    >`
      SELECT id, statement, next_action, target_date::text
      FROM assumptions
      WHERE workspace_id = ${workspaceId}
        AND target_date IS NOT NULL
        AND target_date < ${today}::date
        AND status NOT IN ('supported', 'disproved')
      ORDER BY target_date ASC
      LIMIT 5
    `,
    sql<
      {
        id: string;
        assumption_id: string;
        title: string;
        assumption_statement: string;
      }[]
    >`
      SELECT
        e.id,
        e.assumption_id,
        e.title,
        a.statement AS assumption_statement
      FROM evidence e
      INNER JOIN assumptions a ON a.id = e.assumption_id
      WHERE e.workspace_id = ${workspaceId}
        AND e.direction = 'challenges'
        AND e.evidence_date >= ${since}::date
      ORDER BY e.evidence_date DESC, e.created_at DESC
      LIMIT 5
    `,
    sql<Bet[]>`
      SELECT
        id, workspace_id, seed_key, title, description, hypothesis,
        status, owner, started_at::text, target_date::text,
        success_criteria, expected_outcome, created_by,
        created_at::text, updated_at::text
      FROM bets
      WHERE workspace_id = ${workspaceId}
        AND status IN ('active', 'proposed')
      ORDER BY
        CASE status WHEN 'active' THEN 0 ELSE 1 END,
        target_date ASC NULLS LAST,
        updated_at DESC
      LIMIT 6
    `,
    sql<
      {
        id: string;
        title: string;
        next_action: string | null;
        organisation_name: string;
      }[]
    >`
      SELECT
        o.id, o.title, o.next_action, org.name AS organisation_name
      FROM opportunities o
      INNER JOIN organisations org ON org.id = o.organisation_id
      WHERE o.workspace_id = ${workspaceId}
        AND o.stage NOT IN ('won', 'lost')
        AND o.next_action_date IS NOT NULL
        AND o.next_action_date <= ${today}::date
      ORDER BY o.next_action_date ASC
      LIMIT 5
    `,
    sql<
      {
        id: string;
        title: string;
        direction: string;
        evidence_date: string;
        created_at: string;
        created_by: string | null;
        assumption_statement: string;
      }[]
    >`
      SELECT
        e.id, e.title, e.direction::text, e.evidence_date::text,
        e.created_at::text, e.created_by,
        a.statement AS assumption_statement
      FROM evidence e
      INNER JOIN assumptions a ON a.id = e.assumption_id
      WHERE e.workspace_id = ${workspaceId}
      ORDER BY e.evidence_date DESC, e.created_at DESC
      LIMIT 6
    `,
    sql<
      {
        id: string;
        title: string;
        session_date: string;
        organisation_name: string;
      }[]
    >`
      SELECT
        s.id, s.title, s.session_date::text, o.name AS organisation_name
      FROM discovery_sessions s
      INNER JOIN organisations o ON o.id = s.organisation_id
      WHERE s.workspace_id = ${workspaceId}
      ORDER BY s.session_date DESC, s.created_at DESC
      LIMIT 5
    `,
    sql<
      {
        id: string;
        assumption_id: string;
        statement: string;
        old_value: string | null;
        new_value: string | null;
        changed_by: string | null;
        changed_at: string;
      }[]
    >`
      SELECT
        h.id,
        h.assumption_id,
        a.statement,
        h.old_value,
        h.new_value,
        h.changed_by,
        h.changed_at::text
      FROM assumption_history h
      INNER JOIN assumptions a ON a.id = h.assumption_id
      WHERE h.workspace_id = ${workspaceId}
        AND h.field_changed = 'confidence'
        AND h.changed_at >= ${since}::timestamptz
      ORDER BY h.changed_at DESC
      LIMIT 5
    `,
    sql<
      {
        id: string;
        assumption_id: string;
        statement: string;
        old_value: string | null;
        new_value: string | null;
        changed_by: string | null;
        changed_at: string;
      }[]
    >`
      SELECT
        h.id,
        h.assumption_id,
        a.statement,
        h.old_value,
        h.new_value,
        h.changed_by,
        h.changed_at::text
      FROM assumption_history h
      INNER JOIN assumptions a ON a.id = h.assumption_id
      WHERE h.workspace_id = ${workspaceId}
        AND h.field_changed = 'status'
        AND h.new_value IN ('supported', 'challenged', 'disproved')
        AND h.changed_at >= ${since}::timestamptz
      ORDER BY h.changed_at DESC
      LIMIT 5
    `,
    sql<
      {
        id: string;
        bet_id: string;
        summary: string;
        result: string;
        outcome_date: string;
        created_at: string;
        bet_title: string;
      }[]
    >`
      SELECT
        bo.id, bo.bet_id, bo.summary, bo.result::text, bo.outcome_date::text,
        bo.created_at::text, b.title AS bet_title
      FROM bet_outcomes bo
      INNER JOIN bets b ON b.id = bo.bet_id
      WHERE bo.workspace_id = ${workspaceId}
      ORDER BY bo.outcome_date DESC, bo.created_at DESC
      LIMIT 5
    `,
    sql<FocusItem[]>`
      SELECT
        id, workspace_id, title, owner, week_start::text, status,
        linked_assumption_id, linked_bet_id, linked_opportunity_id,
        created_by, created_at::text
      FROM focus_items
      WHERE workspace_id = ${workspaceId}
        AND owner = 'jon'
        AND week_start = ${week}::date
        AND status IN ('active', 'planned')
      ORDER BY
        CASE status WHEN 'active' THEN 0 ELSE 1 END,
        created_at ASC
      LIMIT 4
    `,
    sql<FocusItem[]>`
      SELECT
        id, workspace_id, title, owner, week_start::text, status,
        linked_assumption_id, linked_bet_id, linked_opportunity_id,
        created_by, created_at::text
      FROM focus_items
      WHERE workspace_id = ${workspaceId}
        AND owner = 'ahmed'
        AND week_start = ${week}::date
        AND status IN ('active', 'planned')
      ORDER BY
        CASE status WHEN 'active' THEN 0 ELSE 1 END,
        created_at ASC
      LIMIT 4
    `,
    sql<
      {
        discovery_sessions: number;
        organisations: number;
        active_opportunities: number;
        proposal_or_pilot: number;
        commercial_evidence: number;
        pipeline_value: string | null;
      }[]
    >`
      SELECT
        (SELECT COUNT(*)::int FROM discovery_sessions WHERE workspace_id = ${workspaceId})
          AS discovery_sessions,
        (SELECT COUNT(*)::int FROM organisations WHERE workspace_id = ${workspaceId})
          AS organisations,
        (SELECT COUNT(*)::int FROM opportunities
          WHERE workspace_id = ${workspaceId} AND stage NOT IN ('won', 'lost'))
          AS active_opportunities,
        (SELECT COUNT(*)::int FROM opportunities
          WHERE workspace_id = ${workspaceId} AND stage IN ('proposal', 'pilot'))
          AS proposal_or_pilot,
        (SELECT COUNT(*)::int FROM evidence
          WHERE workspace_id = ${workspaceId} AND evidence_type = 'commercial')
          AS commercial_evidence,
        (SELECT SUM(potential_value)::text FROM opportunities
          WHERE workspace_id = ${workspaceId}
            AND stage NOT IN ('won', 'lost')
            AND potential_value IS NOT NULL)
          AS pipeline_value
    `,
  ]);

  const attention: HomeAttentionItem[] = [];
  const seen = new Set<string>();

  function pushAttention(item: HomeAttentionItem) {
    if (seen.has(item.href)) return;
    seen.add(item.href);
    attention.push(item);
  }

  for (const a of criticalLow) {
    pushAttention({
      kind: "critical_low",
      id: a.id,
      title: a.statement,
      href: `/assumptions/${a.id}`,
      meta: `Critical · ${a.confidence} confidence`,
    });
  }
  for (const a of overdueActions) {
    pushAttention({
      kind: "overdue_action",
      id: a.id,
      title: a.statement,
      href: `/assumptions/${a.id}`,
      meta: a.next_action
        ? `Overdue: ${a.next_action}`
        : `Target ${a.target_date}`,
    });
  }
  for (const e of recentChallenging) {
    pushAttention({
      kind: "challenging_evidence",
      id: e.assumption_id,
      title: e.assumption_statement,
      href: `/assumptions/${e.assumption_id}`,
      meta: `Challenged: ${e.title}`,
    });
  }
  for (const a of awaitingValidation) {
    pushAttention({
      kind: "awaiting_validation",
      id: a.id,
      title: a.statement,
      href: `/assumptions/${a.id}`,
      meta: `${a.importance} · ${a.status}`,
    });
  }
  for (const b of activeBets.filter((bet) => bet.status === "active")) {
    pushAttention({
      kind: "active_bet",
      id: b.id,
      title: b.title,
      href: `/bets/${b.id}`,
      meta: b.target_date ? `Target ${b.target_date}` : "Active bet",
    });
  }
  for (const o of commercialDue) {
    pushAttention({
      kind: "commercial_due",
      id: o.id,
      title: o.title,
      href: `/commercial/${o.id}`,
      meta: o.next_action
        ? `${o.organisation_name}: ${o.next_action}`
        : o.organisation_name,
    });
  }

  const learning: HomeLearningItem[] = [];
  for (const e of recentEvidence) {
    learning.push({
      kind: "evidence",
      id: e.id,
      title: e.title,
      href: `/evidence#${e.id}`,
      meta: `${e.direction} · ${e.assumption_statement}`,
      at: e.evidence_date,
    });
  }
  for (const s of recentDiscovery) {
    learning.push({
      kind: "discovery",
      id: s.id,
      title: s.title,
      href: `/discovery/${s.id}`,
      meta: s.organisation_name,
      at: s.session_date,
    });
  }
  for (const h of confidenceChanges) {
    learning.push({
      kind: "confidence_change",
      id: h.id,
      title: h.statement,
      href: `/assumptions/${h.assumption_id}`,
      meta: `Confidence ${h.old_value ?? "?"} → ${h.new_value ?? "?"}`,
      at: h.changed_at,
    });
  }
  for (const h of statusChanges) {
    learning.push({
      kind: "status_change",
      id: h.id,
      title: h.statement,
      href: `/assumptions/${h.assumption_id}`,
      meta: `Status → ${h.new_value}`,
      at: h.changed_at,
    });
  }
  for (const o of recentOutcomes) {
    learning.push({
      kind: "bet_outcome",
      id: o.id,
      title: o.summary,
      href: `/bets/${o.bet_id}`,
      meta: `${o.bet_title} · ${o.result}`,
      at: o.outcome_date,
    });
  }
  learning.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  const activity: HomeLearningItem[] = [
    ...confidenceChanges.map((h) => ({
      kind: "confidence_change" as const,
      id: h.id,
      title: h.statement,
      href: `/assumptions/${h.assumption_id}`,
      meta: `${h.changed_by ?? "Someone"}: confidence ${h.old_value ?? "?"} → ${h.new_value ?? "?"}`,
      at: h.changed_at,
    })),
    ...recentEvidence.slice(0, 4).map((e) => ({
      kind: "evidence" as const,
      id: e.id,
      title: e.title,
      href: `/evidence#${e.id}`,
      meta: `${e.created_by ?? "Someone"} added ${e.direction} evidence`,
      at: e.created_at,
    })),
    ...recentOutcomes.slice(0, 3).map((o) => ({
      kind: "bet_outcome" as const,
      id: o.id,
      title: o.bet_title,
      href: `/bets/${o.bet_id}`,
      meta: `Outcome: ${o.result}`,
      at: o.created_at,
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, 8);

  const closerRow = closerRows[0];
  const closer: HomeCloserMetrics = {
    discovery_sessions: closerRow?.discovery_sessions ?? 0,
    organisations: closerRow?.organisations ?? 0,
    active_opportunities: closerRow?.active_opportunities ?? 0,
    proposal_or_pilot: closerRow?.proposal_or_pilot ?? 0,
    commercial_evidence: closerRow?.commercial_evidence ?? 0,
    pipeline_value:
      closerRow?.pipeline_value != null
        ? Number(closerRow.pipeline_value)
        : null,
    pipeline_currency: "GBP",
  };

  return {
    attention: attention.slice(0, 10),
    learning: learning.slice(0, 10),
    activeBets,
    jonFocus,
    ahmedFocus,
    closer,
    activity,
  };
}
