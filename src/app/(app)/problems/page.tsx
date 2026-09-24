import { ProblemsTable } from "@/components/problems/ProblemsTable";
import type { ProblemsTableFilters } from "@/components/problems/ProblemsTable";
import { requirePageContext } from "@/lib/auth/context";
import { listProblems } from "@/lib/db/problems";
import {
  CONFIDENCE_LEVELS,
  IMPORTANCE_LEVELS,
  PROBLEM_STATUSES,
  type Problem,
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
): ProblemsTableFilters {
  const pick = (key: string) => {
    const raw = searchParams[key];
    return typeof raw === "string" ? raw.trim() : undefined;
  };

  return {
    search: pick("search"),
    status: pick("status"),
    severity: pick("severity"),
    confidence: pick("confidence"),
    owner: pick("owner"),
  };
}

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requirePageContext();
  const params = await searchParams;
  const filters = parseFilters(params);

  let dbError: string | null = null;
  let problems: Problem[] = [];

  try {
    problems = await listProblems(workspace.id, {
      search: filters.search,
      status: parseEnum(filters.status, PROBLEM_STATUSES),
      severity: parseEnum(filters.severity, IMPORTANCE_LEVELS),
      confidence: parseEnum(filters.confidence, CONFIDENCE_LEVELS),
      owner: filters.owner,
    });
  } catch (error) {
    console.error("Problems list load failed:", error);
    dbError =
      "We could not load problems. Check your database connection and try again.";
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      {dbError ? (
        <p className="mb-6 rounded border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-navy">
          {dbError}
        </p>
      ) : null}
      <ProblemsTable problems={problems} filters={filters} />
    </div>
  );
}
