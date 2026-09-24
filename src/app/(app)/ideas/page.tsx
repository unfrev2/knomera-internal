import { IdeasTable } from "@/components/ideas/IdeasTable";
import type { IdeasTableFilters } from "@/components/ideas/IdeasTable";
import { requirePageContext } from "@/lib/auth/context";
import { listIdeas } from "@/lib/db/ideas";
import { IDEA_STATUSES, type Idea } from "@/lib/types";

function parseEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): IdeasTableFilters {
  const pick = (key: string) => {
    const raw = searchParams[key];
    return typeof raw === "string" ? raw.trim() : undefined;
  };
  return {
    search: pick("search"),
    status: pick("status"),
    submitted_by: pick("submitted_by"),
  };
}

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requirePageContext();
  const params = await searchParams;
  const filters = parseFilters(params);

  let dbError: string | null = null;
  let ideas: Idea[] = [];

  try {
    ideas = await listIdeas(workspace.id, {
      search: filters.search,
      status: parseEnum(filters.status, IDEA_STATUSES),
      submitted_by: filters.submitted_by,
    });
  } catch (error) {
    console.error("Ideas list load failed:", error);
    dbError =
      "We could not load ideas. Check your database connection and try again.";
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      {dbError ? (
        <p className="mb-6 rounded border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-navy">
          {dbError}
        </p>
      ) : null}
      <IdeasTable ideas={ideas} filters={filters} />
    </div>
  );
}
