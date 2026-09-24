import { ProblemAssumptionsPanel } from "@/components/problems/ProblemAssumptionsPanel";
import { ProblemDetailActions } from "@/components/problems/ProblemDetailActions";
import { LinkedObjectList } from "@/components/links/LinkedObjectList";
import { PageAlert, PageFrame } from "@/components/layout/Page";
import { Badge } from "@/components/ui/Badge";
import { requirePageContext } from "@/lib/auth/context";
import { listDecisionsForProblem } from "@/lib/db/decisions";
import { listBetsForProblem } from "@/lib/db/bets";
import { listIdeasForProblem } from "@/lib/db/ideas";
import {
  getProblem,
  listAssumptionsForProblem,
  listEvidenceForProblem,
} from "@/lib/db/problems";
import { hrefForLinkable } from "@/lib/domain/linkable";
import { displayName } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requirePageContext();
  const { id } = await params;

  let problem;
  let links;
  let evidence;
  let decisions;
  let bets;
  let ideas;

  try {
    problem = await getProblem(workspace.id, id);
    if (!problem) notFound();
    [links, evidence, decisions, bets, ideas] = await Promise.all([
      listAssumptionsForProblem(workspace.id, id),
      listEvidenceForProblem(workspace.id, id),
      listDecisionsForProblem(workspace.id, id),
      listBetsForProblem(workspace.id, id),
      listIdeasForProblem(workspace.id, id),
    ]);
  } catch {
    return (
      <PageFrame width="narrow">
        <PageAlert>
          We could not load this problem. Check your connection and try again.
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
              Problem
            </p>
            <h1 className="text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
              {problem.title}
            </h1>
          </div>
          <ProblemDetailActions problem={problem} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="importance" value={problem.severity} />
          <Badge variant="confidence" value={problem.confidence} />
          <Badge variant="problem-status" value={problem.status} />
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Owner</dt>
            <dd className="font-medium text-navy">
              {displayName(problem.owner)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Created</dt>
            <dd className="font-medium text-navy">
              {formatDate(problem.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Linked assumptions</dt>
            <dd className="font-medium text-navy">
              {problem.linked_assumption_count ?? links.length}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Evidence via assumptions</dt>
            <dd className="font-medium text-navy">
              {problem.evidence_count ?? evidence.length}
            </dd>
          </div>
        </dl>
      </header>

      <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
        <h2 className="text-lg font-semibold text-navy">Problem statement</h2>
        <p className="text-sm leading-relaxed text-navy/85">
          {problem.description ?? "No description yet."}
        </p>
      </section>

      <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
        <h2 className="text-lg font-semibold text-navy">Who experiences it</h2>
        <p className="text-sm leading-relaxed text-navy/85">
          {problem.target_customer ?? "Not specified yet."}
        </p>
      </section>

      <ProblemAssumptionsPanel problemId={problem.id} links={links} />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-navy">
            What evidence do we have?
          </h2>
          <p className="mt-1 text-sm text-muted">
            Evidence attached to linked assumptions — not duplicated here.
          </p>
        </div>
        {evidence.length === 0 ? (
          <p className="text-sm text-muted">
            No evidence yet on the linked assumptions.
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {evidence.map((item) => (
              <li key={item.id} className="space-y-1 py-3">
                <Link
                  href={`/assumptions/${item.assumption_id}`}
                  className="text-sm font-medium text-navy hover:underline"
                >
                  {item.title}
                </Link>
                <p className="text-xs text-muted">
                  On assumption: {item.assumption_statement}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge
                    variant="direction"
                    value={
                      item.direction as "supports" | "challenges" | "neutral"
                    }
                  />
                  <Badge
                    variant="neutral"
                    label={`Strength ${item.strength}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LinkedObjectList
        title="Related decisions"
        emptyMessage="No decisions linked to this problem yet."
        items={decisions.map((decision) => ({
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
        emptyMessage="No bets linked to this problem yet."
        items={bets.map((bet) => ({
          type: "bet" as const,
          id: bet.id,
          title: bet.title,
          subtitle: bet.status,
          href: hrefForLinkable("bet", bet.id),
        }))}
      />

      <LinkedObjectList
        title="Related ideas"
        emptyMessage="No ideas linked to this problem yet."
        items={ideas.map((idea) => ({
          type: "idea" as const,
          id: idea.id,
          title: idea.title,
          subtitle: idea.status,
          href: hrefForLinkable("idea", idea.id),
        }))}
      />
    </PageFrame>
  );
}
