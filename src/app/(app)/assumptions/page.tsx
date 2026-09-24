import { AssumptionsTable } from "@/components/assumptions/AssumptionsTable";
import type { AssumptionsTableFilters } from "@/components/assumptions/AssumptionsTable";
import { requirePageContext } from "@/lib/auth/context";
import { listAssumptions } from "@/lib/db/assumptions";
import { listEvidenceByAssumptionIds } from "@/lib/db/evidence";
import { rankAssumptionsForValidation } from "@/lib/domain/priority";
import {
  ASSUMPTION_STATUSES,
  CONFIDENCE_LEVELS,
  IMPORTANCE_LEVELS,
  type Assumption,
} from "@/lib/types";

function parseEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AssumptionsTableFilters {
  const pick = (key: string) => {
    const raw = searchParams[key];
    return typeof raw === "string" ? raw.trim() : undefined;
  };

  return {
    search: pick("search"),
    category: pick("category"),
    importance: parseEnum(pick("importance"), IMPORTANCE_LEVELS),
    confidence: parseEnum(pick("confidence"), CONFIDENCE_LEVELS),
    status: parseEnum(pick("status"), ASSUMPTION_STATUSES),
    owner: pick("owner"),
  };
}

export default async function AssumptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requirePageContext();
  const params = await searchParams;
  const filters = parseFilters(params);

  let dbError: string | null = null;
  let assumptions: Assumption[] = [];

  try {
    assumptions = await listAssumptions(workspace.id, {
      search: filters.search,
      category: filters.category,
      importance: filters.importance,
      confidence: filters.confidence,
      status: filters.status,
      owner: filters.owner,
    });
  } catch (error) {
    console.error("Assumptions list load failed:", error);
    dbError =
      "We could not load assumptions. Check your database connection and try again.";
    assumptions = [];
  }

  const allForRank = dbError
    ? []
    : await listAssumptions(workspace.id).catch(() => []);

  const evidence = dbError
    ? []
    : await listEvidenceByAssumptionIds(
        workspace.id,
        allForRank.map((item) => item.id),
      ).catch(() => []);

  const evidenceByAssumption = new Map<string, typeof evidence>();
  for (const item of evidence) {
    const list = evidenceByAssumption.get(item.assumption_id) ?? [];
    list.push(item);
    evidenceByAssumption.set(item.assumption_id, list);
  }

  const ranked = rankAssumptionsForValidation(
    allForRank.map((assumption) => ({
      assumption,
      evidence: evidenceByAssumption.get(assumption.id) ?? [],
    })),
  );

  const rankOrder = ranked.map((item) => item.assumptionId);

  return (
    <div className="mx-auto max-w-[1400px]">
      {dbError ? (
        <p className="mb-6 rounded border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-navy">
          {dbError}
        </p>
      ) : null}
      <AssumptionsTable
        assumptions={assumptions}
        filters={filters}
        rankOrder={rankOrder}
      />
    </div>
  );
}
