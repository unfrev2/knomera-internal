import { BetDetailActions } from "@/components/bets/BetDetailActions";
import {
  BetAssumptionsPanel,
  BetOutcomesPanel,
  BetProblemsPanel,
} from "@/components/bets/BetLinksPanels";
import { LinkedObjectList } from "@/components/links/LinkedObjectList";
import { Badge } from "@/components/ui/Badge";
import { requirePageContext } from "@/lib/auth/context";
import {
  getBet,
  listAssumptionsForBet,
  listDecisionsForBet,
  listOutcomesForBet,
  listProblemsForBet,
} from "@/lib/db/bets";
import { hrefForLinkable } from "@/lib/domain/linkable";
import { formatDate, formatDateShort } from "@/lib/format";
import { displayName } from "@/lib/labels";
import { notFound } from "next/navigation";

export default async function BetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requirePageContext();
  const { id } = await params;
  const query = await searchParams;
  const promptOutcome =
    typeof query.outcome === "string" ? query.outcome : null;

  let bet;
  let problems;
  let assumptionLinks;
  let outcomes;
  let decisions;

  try {
    bet = await getBet(workspace.id, id);
    if (!bet) notFound();
    [problems, assumptionLinks, outcomes, decisions] = await Promise.all([
      listProblemsForBet(workspace.id, id),
      listAssumptionsForBet(workspace.id, id),
      listOutcomesForBet(workspace.id, id),
      listDecisionsForBet(workspace.id, id),
    ]);
  } catch {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="rounded border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-navy">
          We could not load this bet. Check your connection and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              Bet
            </p>
            <h1 className="text-2xl font-semibold leading-snug text-navy md:text-3xl">
              {bet.title}
            </h1>
          </div>
          <BetDetailActions bet={bet} />
        </div>

        <Badge variant="bet-status" value={bet.status} />

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Owner</dt>
            <dd className="font-medium text-navy">{displayName(bet.owner)}</dd>
          </div>
          <div>
            <dt className="text-muted">Started</dt>
            <dd className="font-medium text-navy">
              {bet.started_at ? formatDateShort(bet.started_at) : "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Target</dt>
            <dd className="font-medium text-navy">
              {bet.target_date ? formatDateShort(bet.target_date) : "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Created</dt>
            <dd className="font-medium text-navy">
              {formatDate(bet.created_at)}
            </dd>
          </div>
        </dl>
      </header>

      <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
        <h2 className="text-lg font-semibold text-navy">Hypothesis</h2>
        <p className="text-sm leading-relaxed text-navy/85 whitespace-pre-wrap">
          {bet.hypothesis ?? "No hypothesis recorded."}
        </p>
      </section>

      {bet.description ? (
        <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
          <h2 className="text-lg font-semibold text-navy">Description</h2>
          <p className="text-sm leading-relaxed text-navy/85 whitespace-pre-wrap">
            {bet.description}
          </p>
        </section>
      ) : null}

      <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
        <h2 className="text-lg font-semibold text-navy">Success criteria</h2>
        <p className="text-sm leading-relaxed text-navy/85 whitespace-pre-wrap">
          {bet.success_criteria ?? "Not specified."}
        </p>
      </section>

      <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
        <h2 className="text-lg font-semibold text-navy">Expected outcome</h2>
        <p className="text-sm leading-relaxed text-navy/85 whitespace-pre-wrap">
          {bet.expected_outcome ?? "Not specified."}
        </p>
      </section>

      <BetProblemsPanel betId={bet.id} problems={problems} />
      <BetAssumptionsPanel betId={bet.id} links={assumptionLinks} />
      <BetOutcomesPanel
        betId={bet.id}
        betTitle={bet.title}
        outcomes={outcomes}
        linkedAssumptions={assumptionLinks}
        promptOutcomeId={promptOutcome}
      />

      <LinkedObjectList
        title="Related decisions"
        emptyMessage="No decisions linked to this bet yet."
        items={decisions.map((decision) => ({
          type: "decision" as const,
          id: decision.id,
          title: decision.title,
          subtitle: decision.status,
          meta: decision.decision_date,
          href: hrefForLinkable("decision", decision.id),
        }))}
      />
    </div>
  );
}
