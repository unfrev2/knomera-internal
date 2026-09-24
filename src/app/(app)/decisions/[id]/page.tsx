import { DecisionDetailActions } from "@/components/decisions/DecisionDetailActions";
import {
  DecisionAssumptionsPanel,
  DecisionEvidencePanel,
  DecisionProblemsPanel,
} from "@/components/decisions/DecisionLinksPanels";
import { HistoryList } from "@/components/history/HistoryList";
import { PageAlert, PageFrame } from "@/components/layout/Page";
import { Badge } from "@/components/ui/Badge";
import { requirePageContext } from "@/lib/auth/context";
import {
  getDecision,
  listAssumptionsForDecision,
  listEvidenceForDecision,
  listProblemsForDecision,
} from "@/lib/db/decisions";
import { listEntityHistory } from "@/lib/db/history";
import { formatDate, formatDateShort } from "@/lib/format";
import { displayName } from "@/lib/labels";
import { notFound } from "next/navigation";

export default async function DecisionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requirePageContext();
  const { id } = await params;

  let decision;
  let assumptions;
  let evidence;
  let problems;
  let history;

  try {
    decision = await getDecision(workspace.id, id);
    if (!decision) notFound();
    [assumptions, evidence, problems, history] = await Promise.all([
      listAssumptionsForDecision(workspace.id, id),
      listEvidenceForDecision(workspace.id, id),
      listProblemsForDecision(workspace.id, id),
      listEntityHistory(workspace.id, "decision", id),
    ]);
  } catch {
    return (
      <PageFrame width="narrow">
        <PageAlert>
          We could not load this decision. Check your connection and try again.
        </PageAlert>
      </PageFrame>
    );
  }

  return (
    <PageFrame width="narrow">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              Decision
            </p>
            <h1 className="text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
              {decision.title}
            </h1>
          </div>
          <DecisionDetailActions decision={decision} />
        </div>

        <Badge variant="decision-status" value={decision.status} />

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Decision date</dt>
            <dd className="font-medium text-navy">
              {formatDateShort(decision.decision_date)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Decided by</dt>
            <dd className="font-medium text-navy">
              {displayName(decision.decided_by)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Created</dt>
            <dd className="font-medium text-navy">
              {formatDate(decision.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Revisit date</dt>
            <dd className="font-medium text-navy">
              {decision.revisit_date
                ? formatDateShort(decision.revisit_date)
                : "Not set"}
            </dd>
          </div>
        </dl>
      </header>

      <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
        <h2 className="text-lg font-semibold text-navy">What did we decide?</h2>
        <p className="text-sm leading-relaxed text-navy/85 whitespace-pre-wrap">
          {decision.decision}
        </p>
      </section>

      <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
        <h2 className="text-lg font-semibold text-navy">Context</h2>
        <p className="text-sm leading-relaxed text-navy/85 whitespace-pre-wrap">
          {decision.context ?? "No context recorded."}
        </p>
      </section>

      <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
        <h2 className="text-lg font-semibold text-navy">Why?</h2>
        <p className="text-sm leading-relaxed text-navy/85 whitespace-pre-wrap">
          {decision.rationale ?? "No rationale recorded."}
        </p>
      </section>

      <DecisionAssumptionsPanel
        decisionId={decision.id}
        assumptions={assumptions}
      />
      <DecisionEvidencePanel decisionId={decision.id} evidence={evidence} />
      <DecisionProblemsPanel decisionId={decision.id} problems={problems} />

      <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
        <h2 className="text-lg font-semibold text-navy">
          What would cause us to reconsider?
        </h2>
        <p className="text-sm leading-relaxed text-navy/85 whitespace-pre-wrap">
          {decision.revisit_trigger ?? "Not specified yet."}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy">History</h2>
        <HistoryList items={history} />
      </section>
    </PageFrame>
  );
}
