import { AssumptionDetailActions } from "@/components/assumptions/AssumptionDetailActions";
import { ConfidencePrompt } from "@/components/assumptions/ConfidencePrompt";
import { EvidenceTimeline } from "@/components/assumptions/EvidenceTimeline";
import { HistoryList } from "@/components/history/HistoryList";
import { LinkedObjectList } from "@/components/links/LinkedObjectList";
import { RelationshipCounts } from "@/components/links/RelationshipCounts";
import { PageAlert, PageFrame } from "@/components/layout/Page";
import { Badge } from "@/components/ui/Badge";
import { requirePageContext } from "@/lib/auth/context";
import { getAssumption } from "@/lib/db/assumptions";
import { listEvidenceForAssumption, listEvidenceSources } from "@/lib/db/evidence";
import { listAssumptionHistory } from "@/lib/db/history";
import { getAssumptionRelationshipCounts } from "@/lib/db/relationship-counts";
import { listProblemsForAssumption } from "@/lib/db/problems";
import { listDiscoverySessionsForAssumption } from "@/lib/db/discovery";
import { listDecisionsForAssumption } from "@/lib/db/decisions";
import { listBetsForAssumption } from "@/lib/db/bets";
import { listIdeasForAssumption } from "@/lib/db/ideas";
import { hrefForLinkable } from "@/lib/domain/linkable";
import { suggestConfidence } from "@/lib/domain/suggested-confidence";
import { formatDate, formatDateShort } from "@/lib/format";
import {
  BET_RELATIONSHIP_LABELS,
  CONFIDENCE_LABELS,
  displayName,
} from "@/lib/labels";
import { notFound } from "next/navigation";

export default async function AssumptionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requirePageContext();
  const { id } = await params;
  const query = await searchParams;
  const evidenceAdded = query.evidenceAdded === "1";

  let assumption;
  let evidence;
  let history;
  let counts;
  let sourceOptions: string[] = [];
  let relatedProblems: Awaited<ReturnType<typeof listProblemsForAssumption>> =
    [];
  let relatedDiscovery: Awaited<
    ReturnType<typeof listDiscoverySessionsForAssumption>
  > = [];
  let relatedDecisions: Awaited<ReturnType<typeof listDecisionsForAssumption>> =
    [];
  let relatedBets: Awaited<ReturnType<typeof listBetsForAssumption>> = [];
  let relatedIdeas: Awaited<ReturnType<typeof listIdeasForAssumption>> = [];

  try {
    assumption = await getAssumption(workspace.id, id);
    if (!assumption) notFound();

    [
      evidence,
      history,
      counts,
      sourceOptions,
      relatedProblems,
      relatedDiscovery,
      relatedDecisions,
      relatedBets,
      relatedIdeas,
    ] = await Promise.all([
      listEvidenceForAssumption(workspace.id, id),
      listAssumptionHistory(workspace.id, id),
      getAssumptionRelationshipCounts(workspace.id, id),
      listEvidenceSources(workspace.id),
      listProblemsForAssumption(workspace.id, id),
      listDiscoverySessionsForAssumption(workspace.id, id),
      listDecisionsForAssumption(workspace.id, id),
      listBetsForAssumption(workspace.id, id),
      listIdeasForAssumption(workspace.id, id),
    ]);
  } catch {
    return (
      <PageFrame width="narrow">
        <PageAlert>
          We could not load this assumption. Check your connection and try again.
        </PageAlert>
      </PageFrame>
    );
  }

  const suggestion = suggestConfidence(evidence);

  return (
    <PageFrame width="narrow">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              {assumption.category}
            </p>
            <h1 className="text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
              {assumption.statement}
            </h1>
          </div>
          <AssumptionDetailActions
            assumption={assumption}
            sourceOptions={sourceOptions}
          />
        </div>

        <ConfidencePrompt assumption={assumption} show={evidenceAdded} />

        <div className="flex flex-wrap gap-2">
          <Badge variant="importance" value={assumption.importance} />
          <Badge variant="confidence" value={assumption.confidence} />
          <Badge variant="status" value={assumption.status} />
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Owner</dt>
            <dd className="font-medium text-navy">{displayName(assumption.owner)}</dd>
          </div>
          <div>
            <dt className="text-muted">Target date</dt>
            <dd className="font-medium text-navy">
              {assumption.target_date
                ? formatDateShort(assumption.target_date)
                : "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Created by</dt>
            <dd className="font-medium text-navy">
              {displayName(assumption.created_by)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Created</dt>
            <dd className="font-medium text-navy">
              {formatDate(assumption.created_at)}
            </dd>
          </div>
        </dl>

        <RelationshipCounts
          items={[
            {
              label: "Supporting evidence",
              value: counts.supporting_evidence,
            },
            {
              label: "Challenging evidence",
              value: counts.challenging_evidence,
            },
            {
              label: "Discovery conversations",
              value: counts.discovery_sessions,
            },
            { label: "Active bets", value: counts.active_bets },
          ]}
        />

        {assumption.description ? (
          <div className="rounded border border-line bg-white/60 px-4 py-3">
            <h2 className="text-xs font-medium tracking-wide text-muted uppercase">
              Description
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-navy/85">
              {assumption.description}
            </p>
          </div>
        ) : null}
      </header>

      <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
        <h2 className="text-lg font-semibold text-navy">Validation</h2>
        {assumption.next_action ? (
          <p className="text-base leading-relaxed text-navy">
            {assumption.next_action}
          </p>
        ) : (
          <p className="text-sm text-muted">
            No next action recorded. Edit the assumption to add one.
          </p>
        )}
        {assumption.target_date ? (
          <p className="text-sm text-muted">
            Target: {formatDateShort(assumption.target_date)}
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-navy">Evidence</h2>
        <EvidenceTimeline items={evidence} sourceOptions={sourceOptions} />
      </section>

      <LinkedObjectList
        title="Related problems"
        emptyMessage="Not linked to a problem yet."
        items={relatedProblems.map((problem) => ({
          type: "problem" as const,
          id: problem.id,
          title: problem.title,
          subtitle: problem.status,
          meta: problem.severity,
          href: hrefForLinkable("problem", problem.id),
        }))}
      />

      <LinkedObjectList
        title="Related discovery"
        emptyMessage="No discovery conversations have generated evidence for this assumption yet."
        items={relatedDiscovery.map((session) => ({
          type: "discovery_session" as const,
          id: session.id,
          title: session.title,
          subtitle: session.organisation_name,
          meta: session.session_date,
          href: hrefForLinkable("discovery_session", session.id),
        }))}
      />

      <LinkedObjectList
        title="Related decisions"
        emptyMessage="Not linked to a decision yet."
        items={relatedDecisions.map((decision) => ({
          type: "decision" as const,
          id: decision.id,
          title: decision.title,
          subtitle: decision.status,
          meta: decision.decision_date,
          href: hrefForLinkable("decision", decision.id),
        }))}
      />

      <LinkedObjectList
        title="Related bets"
        emptyMessage="Not linked to a bet yet."
        items={relatedBets.map((bet) => ({
          type: "bet" as const,
          id: bet.id,
          title: bet.title,
          subtitle: bet.status,
          meta: BET_RELATIONSHIP_LABELS[bet.relationship_type],
          href: hrefForLinkable("bet", bet.id),
        }))}
      />

      <LinkedObjectList
        title="Related ideas"
        emptyMessage="Not linked to an idea yet."
        items={relatedIdeas.map((idea) => ({
          type: "idea" as const,
          id: idea.id,
          title: idea.title,
          subtitle: idea.status,
          href: hrefForLinkable("idea", idea.id),
        }))}
      />

      <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
        <h2 className="text-lg font-semibold text-navy">Suggested confidence</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              Founder confidence
            </p>
            <p className="mt-1 text-lg font-semibold text-navy">
              {CONFIDENCE_LABELS[assumption.confidence]}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              Evidence suggests
            </p>
            <p className="mt-1 text-lg font-semibold text-navy">
              {suggestion.level
                ? CONFIDENCE_LABELS[suggestion.level]
                : "Not enough data"}
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted">{suggestion.explanation}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy">History</h2>
        <HistoryList items={history} />
      </section>
    </PageFrame>
  );
}
