import { DecisionsTable } from "@/components/decisions/DecisionsTable";
import type { DecisionsTableFilters } from "@/components/decisions/DecisionsTable";
import { requirePageContext } from "@/lib/auth/context";
import { listDecisions } from "@/lib/db/decisions";
import { DECISION_STATUSES, type Decision } from "@/lib/types";

function parseEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): DecisionsTableFilters {
  const pick = (key: string) => {
    const raw = searchParams[key];
    return typeof raw === "string" ? raw.trim() : undefined;
  };
  return {
    search: pick("search"),
    status: pick("status"),
    decided_by: pick("decided_by"),
  };
}

export default async function DecisionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requirePageContext();
  const params = await searchParams;
  const filters = parseFilters(params);

  let dbError: string | null = null;
  let decisions: Decision[] = [];

  try {
    decisions = await listDecisions(workspace.id, {
      search: filters.search,
      status: parseEnum(filters.status, DECISION_STATUSES),
      decided_by: filters.decided_by,
    });
  } catch (error) {
    console.error("Decisions list load failed:", error);
    dbError =
      "We could not load decisions. Check your database connection and try again.";
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      {dbError ? (
        <p className="mb-6 rounded border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-navy">
          {dbError}
        </p>
      ) : null}
      <DecisionsTable decisions={decisions} filters={filters} />
    </div>
  );
}
