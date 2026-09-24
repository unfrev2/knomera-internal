import { ConfidenceMatrix } from "@/components/overview/ConfidenceMatrix";
import { PriorityList } from "@/components/overview/PriorityList";
import { StatsStrip } from "@/components/overview/StatsStrip";
import { requirePageContext } from "@/lib/auth/context";
import { countAssumptions, listAssumptions } from "@/lib/db/assumptions";
import { listEvidenceByAssumptionIds } from "@/lib/db/evidence";
import {
  explainPriority,
  rankAssumptionsForValidation,
} from "@/lib/domain/priority";
import type { Assumption, Evidence } from "@/lib/types";
import Link from "next/link";

function groupEvidenceByAssumption<
  T extends { assumption_id: string },
>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.assumption_id) ?? [];
    list.push(item);
    map.set(item.assumption_id, list);
  }
  return map;
}

export default async function OverviewPage() {
  const { workspace } = await requirePageContext();

  let stats: Awaited<ReturnType<typeof countAssumptions>>;
  let assumptions: Assumption[];
  let dbError: string | null = null;

  try {
    [stats, assumptions] = await Promise.all([
      countAssumptions(workspace.id),
      listAssumptions(workspace.id),
    ]);
  } catch {
    dbError =
      "We could not load assumptions from the database. Check your connection and try again.";
    stats = {
      total: 0,
      critical: 0,
      critical_low: 0,
      testing: 0,
      supported: 0,
      disproved: 0,
    };
    assumptions = [];
  }

  let evidence: Evidence[] = [];
  if (!dbError) {
    try {
      evidence = await listEvidenceByAssumptionIds(
        workspace.id,
        assumptions.map((item) => item.id),
      );
    } catch {
      evidence = [];
    }
  }

  const evidenceByAssumption = groupEvidenceByAssumption(evidence);

  const ranked = rankAssumptionsForValidation(
    assumptions.map((assumption) => ({
      assumption,
      evidence: evidenceByAssumption.get(assumption.id) ?? [],
    })),
  );

  const topPriority = ranked[0];
  const provenOrSupported = assumptions.filter(
    (item) => item.confidence === "proven" || item.status === "supported",
  ).length;

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-navy md:text-3xl">
          Overview
        </h1>
        {dbError ? (
          <p className="rounded border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-navy">
            {dbError}
          </p>
        ) : (
          <p className="max-w-3xl text-sm leading-relaxed text-muted md:text-base">
            {assumptions.length === 0 ? (
              "No assumptions logged yet. Add your first assumption to start tracking what you believe and what to validate."
            ) : topPriority ? (
              <>
                We are tracking{" "}
                <span className="font-medium text-navy">
                  {assumptions.length} assumptions
                </span>
                , with{" "}
                <span className="font-medium text-navy">
                  {provenOrSupported} well supported or proven
                </span>
                . The highest priority to test next is{" "}
                <Link
                  href={`/assumptions/${topPriority.assumptionId}`}
                  className="font-medium text-blue underline-offset-2 hover:underline"
                >
                  {topPriority.statement}
                </Link>
                {explainPriority(topPriority)
                  ? ` — ${explainPriority(topPriority)}.`
                  : "."}
              </>
            ) : (
              "Assumptions are loaded. Review the matrix and priority list below."
            )}
          </p>
        )}
      </header>

      <StatsStrip
        total={stats.total}
        critical={stats.critical}
        criticalLowConfidence={stats.critical_low}
        testing={stats.testing}
        supported={stats.supported}
        disproved={stats.disproved}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy">
          Confidence matrix
        </h2>
        {assumptions.length === 0 && !dbError ? (
          <p className="text-sm text-muted">
            The matrix will populate once you add assumptions.
          </p>
        ) : (
          <ConfidenceMatrix assumptions={assumptions} />
        )}
      </section>

      <PriorityList
        items={ranked.map((item) => ({
          assumptionId: item.assumptionId,
          statement: item.statement,
          reasons: item.reasons,
          importance: item.importance,
          confidence: item.confidence,
        }))}
      />
    </div>
  );
}
