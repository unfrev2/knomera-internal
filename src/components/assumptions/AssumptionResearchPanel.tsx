"use client";

import { researchAssumptionExternallyAction } from "@/app/actions/research";
import { Button } from "@/components/ui/Button";
import type { ResearchFindingDetail } from "@/lib/db/research-findings";
import { RESEARCH_TYPE_LABELS } from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AssumptionResearchPanel({
  assumptionId,
  pendingFindings,
  directCount,
  secondaryCount,
  supportingCount,
  challengingCount,
  webConfigured,
}: {
  assumptionId: string;
  pendingFindings: ResearchFindingDetail[];
  directCount: number;
  secondaryCount: number;
  supportingCount: number;
  challengingCount: number;
  webConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(mode: "market" | "competitor" | "both") {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const results = await researchAssumptionExternallyAction({
          assumptionId,
          mode,
        });
        setMessage(results.map((r) => r.message).join(" · "));
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Research failed.");
      }
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-navy">Research</h2>
        <p className="mt-1 text-sm text-muted">
          Secondary public research — review before it becomes Evidence.
        </p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-muted">Direct evidence</dt>
          <dd className="font-medium tabular-nums text-navy">{directCount}</dd>
        </div>
        <div>
          <dt className="text-muted">Secondary research</dt>
          <dd className="font-medium tabular-nums text-navy">{secondaryCount}</dd>
        </div>
        <div>
          <dt className="text-muted">Supporting</dt>
          <dd className="font-medium tabular-nums text-navy">{supportingCount}</dd>
        </div>
        <div>
          <dt className="text-muted">Challenging</dt>
          <dd className="font-medium tabular-nums text-navy">{challengingCount}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || !webConfigured}
          loading={pending}
          onClick={() => run("market")}
        >
          Research externally · Market
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending || !webConfigured}
          loading={pending}
          onClick={() => run("competitor")}
        >
          Competitor
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending || !webConfigured}
          loading={pending}
          onClick={() => run("both")}
        >
          Both
        </Button>
        <Link
          href="/evidence/research"
          className="inline-flex items-center text-sm text-blue hover:underline"
        >
          View research queue
        </Link>
      </div>

      {!webConfigured ? (
        <p className="text-sm text-muted">
          Configure web research credentials to run external searches.
        </p>
      ) : null}

      {pendingFindings.length > 0 ? (
        <ul className="divide-y divide-line border-y border-line">
          {pendingFindings.map((finding) => (
            <li key={finding.id} className="py-2.5">
              <p className="text-[11px] font-medium tracking-wide text-blue uppercase">
                {RESEARCH_TYPE_LABELS[finding.research_type]} · Pending
              </p>
              <p className="text-sm text-navy">{finding.claim}</p>
              <Link
                href="/evidence/research"
                className="mt-1 inline-block text-xs text-blue hover:underline"
              >
                Review in queue
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No pending research findings.</p>
      )}

      {message ? <p className="text-sm text-navy">{message}</p> : null}
      {error ? (
        <p className="text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
