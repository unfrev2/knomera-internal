import { OpportunitiesTable } from "@/components/commercial/OpportunitiesTable";
import type { OpportunitiesTableFilters } from "@/components/commercial/OpportunitiesTable";
import { PageAlert, PageFrame } from "@/components/layout/Page";
import { requirePageContext } from "@/lib/auth/context";
import { listOpportunities } from "@/lib/db/opportunities";
import { OPPORTUNITY_STAGES, type Opportunity } from "@/lib/types";

function parseEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): OpportunitiesTableFilters {
  const pick = (key: string) => {
    const raw = searchParams[key];
    return typeof raw === "string" ? raw.trim() : undefined;
  };
  return {
    search: pick("search"),
    stage: pick("stage"),
    owner: pick("owner"),
  };
}

export default async function CommercialPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requirePageContext();
  const params = await searchParams;
  const filters = parseFilters(params);

  let dbError: string | null = null;
  let opportunities: Opportunity[] = [];

  try {
    opportunities = await listOpportunities(workspace.id, {
      search: filters.search,
      stage: parseEnum(filters.stage, OPPORTUNITY_STAGES),
      owner: filters.owner,
    });
  } catch (error) {
    console.error("Commercial list load failed:", error);
    dbError =
      "We could not load opportunities. Check your database connection and try again.";
  }

  return (
    <PageFrame width="wide">
      {dbError ? <PageAlert>{dbError}</PageAlert> : null}
      <OpportunitiesTable opportunities={opportunities} filters={filters} />
    </PageFrame>
  );
}
