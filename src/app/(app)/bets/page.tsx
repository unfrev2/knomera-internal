import { BetsTable } from "@/components/bets/BetsTable";
import type { BetsTableFilters } from "@/components/bets/BetsTable";
import { requirePageContext } from "@/lib/auth/context";
import { listBets } from "@/lib/db/bets";
import { BET_STATUSES, type Bet } from "@/lib/types";

function parseEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): BetsTableFilters {
  const pick = (key: string) => {
    const raw = searchParams[key];
    return typeof raw === "string" ? raw.trim() : undefined;
  };
  return {
    search: pick("search"),
    status: pick("status"),
    owner: pick("owner"),
  };
}

export default async function BetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requirePageContext();
  const params = await searchParams;
  const filters = parseFilters(params);

  let dbError: string | null = null;
  let bets: Bet[] = [];

  try {
    bets = await listBets(workspace.id, {
      search: filters.search,
      status: parseEnum(filters.status, BET_STATUSES),
      owner: filters.owner,
    });
  } catch (error) {
    console.error("Bets list load failed:", error);
    dbError =
      "We could not load bets. Check your database connection and try again.";
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      {dbError ? (
        <p className="mb-6 rounded border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-navy">
          {dbError}
        </p>
      ) : null}
      <BetsTable bets={bets} filters={filters} />
    </div>
  );
}
