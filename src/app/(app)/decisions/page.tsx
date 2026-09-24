import { DecisionsTable } from "@/components/decisions/DecisionsTable";
import type { DecisionsTableFilters } from "@/components/decisions/DecisionsTable";
import { PageAlert, PageFrame } from "@/components/layout/Page";
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
    <PageFrame width="wide">
      {dbError ? <PageAlert>{dbError}</PageAlert> : null}
      <DecisionsTable decisions={decisions} filters={filters} />
    </PageFrame>
  );
}
