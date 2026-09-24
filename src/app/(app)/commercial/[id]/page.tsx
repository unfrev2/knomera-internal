import { OpportunityDetailActions } from "@/components/commercial/OpportunityDetailActions";
import { HistoryList } from "@/components/history/HistoryList";
import { PageAlert, PageFrame } from "@/components/layout/Page";
import { Badge } from "@/components/ui/Badge";
import { requirePageContext } from "@/lib/auth/context";
import {
  getOpportunity,
  listEvidenceForOpportunity,
} from "@/lib/db/opportunities";
import { listEntityHistory } from "@/lib/db/history";
import { hrefForLinkable } from "@/lib/domain/linkable";
import { formatDate, formatDateShort } from "@/lib/format";
import { displayName } from "@/lib/labels";
import Link from "next/link";
import { notFound } from "next/navigation";

function formatValue(value: number | null, currency: string): string {
  if (value == null) return "Not set";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requirePageContext();
  const { id } = await params;

  let opportunity;
  let evidence;
  let history;

  try {
    opportunity = await getOpportunity(workspace.id, id);
    if (!opportunity) notFound();
    [evidence, history] = await Promise.all([
      listEvidenceForOpportunity(workspace.id, id),
      listEntityHistory(workspace.id, "opportunity", id),
    ]);
  } catch {
    return (
      <PageFrame width="narrow">
        <PageAlert>
          We could not load this opportunity. Check your connection and try
          again.
        </PageAlert>
      </PageFrame>
    );
  }

  return (
    <PageFrame width="narrow">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              Opportunity
            </p>
            <h1 className="text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
              {opportunity.title}
            </h1>
            {opportunity.organisation_name ? (
              <p className="text-sm text-muted">
                <Link
                  href={`/organisations/${opportunity.organisation_id}`}
                  className="hover:underline"
                >
                  {opportunity.organisation_name}
                </Link>
              </p>
            ) : null}
          </div>
          <OpportunityDetailActions opportunity={opportunity} />
        </div>

        <Badge variant="opportunity-stage" value={opportunity.stage} />

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Potential value</dt>
            <dd className="font-medium text-navy">
              {formatValue(opportunity.potential_value, opportunity.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Owner</dt>
            <dd className="font-medium text-navy">
              {displayName(opportunity.owner)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Next action</dt>
            <dd className="font-medium text-navy">
              {opportunity.next_action ?? "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Next action date</dt>
            <dd className="font-medium text-navy">
              {opportunity.next_action_date
                ? formatDateShort(opportunity.next_action_date)
                : "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Created</dt>
            <dd className="font-medium text-navy">
              {formatDate(opportunity.created_at)}
            </dd>
          </div>
        </dl>
      </header>

      {(opportunity.stage === "won" || opportunity.stage === "lost") &&
      opportunity.outcome_reason ? (
        <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
          <h2 className="text-lg font-semibold text-navy">Outcome reason</h2>
          <p className="text-sm leading-relaxed text-navy/85 whitespace-pre-wrap">
            {opportunity.outcome_reason}
          </p>
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-navy">
            Commercial evidence
          </h2>
          <p className="mt-1 text-sm text-muted">
            Evidence linked from this opportunity. Stage changes alone never
            create evidence.
          </p>
        </div>
        {evidence.length === 0 ? (
          <p className="text-sm text-muted">
            No evidence yet. Use Add evidence when commercial behaviour supports
            or challenges an assumption.
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {evidence.map((item) => (
              <li key={item.id} className="space-y-2 py-3">
                <Link
                  href={hrefForLinkable("evidence", item.id)}
                  className="text-sm font-medium text-navy hover:underline"
                >
                  {item.title}
                </Link>
                {item.assumption_statement ? (
                  <p className="text-xs text-muted">
                    → {item.assumption_statement}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="direction" value={item.direction} />
                  <Badge variant="neutral" label={`Strength ${item.strength}`} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy">History</h2>
        <HistoryList items={history} />
      </section>
    </PageFrame>
  );
}
