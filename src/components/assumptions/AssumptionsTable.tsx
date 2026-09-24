import { AddAssumptionButton } from "@/components/assumptions/AddAssumptionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { displayName } from "@/lib/labels";
import { formatDateShort } from "@/lib/format";
import { CATEGORIES } from "@/lib/seed/assumptions";
import type { Assumption } from "@/lib/types";
import {
  ASSUMPTION_STATUSES,
  CONFIDENCE_LEVELS,
  IMPORTANCE_LEVELS,
  type AssumptionStatus,
  type Confidence,
  type Importance,
} from "@/lib/types";
import {
  CONFIDENCE_LABELS,
  IMPORTANCE_LABELS,
  STATUS_LABELS,
} from "@/lib/labels";
import Link from "next/link";

export type AssumptionsTableFilters = {
  search?: string;
  category?: string;
  importance?: Importance;
  confidence?: Confidence;
  status?: AssumptionStatus;
  owner?: string;
};

export type AssumptionsTableProps = {
  assumptions: Assumption[];
  filters: AssumptionsTableFilters;
  rankOrder: string[];
};

function buildFilterHref(filters: AssumptionsTableFilters, omit?: keyof AssumptionsTableFilters) {
  const params = new URLSearchParams();
  const entries: [keyof AssumptionsTableFilters, string | undefined][] = [
    ["search", filters.search],
    ["category", filters.category],
    ["importance", filters.importance],
    ["confidence", filters.confidence],
    ["status", filters.status],
    ["owner", filters.owner],
  ];
  for (const [key, value] of entries) {
    if (key === omit || !value) continue;
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `/assumptions?${query}` : "/assumptions";
}

function ActiveFilters({
  filters,
}: {
  filters: AssumptionsTableFilters;
}) {
  const chips: { key: keyof AssumptionsTableFilters; label: string }[] = [];

  if (filters.search) {
    chips.push({ key: "search", label: `Search: “${filters.search}”` });
  }
  if (filters.category) {
    chips.push({ key: "category", label: `Category: ${filters.category}` });
  }
  if (filters.importance) {
    chips.push({
      key: "importance",
      label: `Importance: ${IMPORTANCE_LABELS[filters.importance]}`,
    });
  }
  if (filters.confidence) {
    chips.push({
      key: "confidence",
      label: `Confidence: ${CONFIDENCE_LABELS[filters.confidence]}`,
    });
  }
  if (filters.status) {
    chips.push({
      key: "status",
      label: `Status: ${STATUS_LABELS[filters.status]}`,
    });
  }
  if (filters.owner) {
    chips.push({
      key: "owner",
      label: `Owner: ${displayName(filters.owner)}`,
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">Active filters:</span>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={buildFilterHref(filters, chip.key)}
          className="rounded-full bg-cream-tint px-3 py-1 text-navy ring-1 ring-navy/10 transition hover:bg-cream-tint/80"
        >
          {chip.label}
          <span className="ml-1.5 text-muted">×</span>
        </Link>
      ))}
      <Link
        href="/assumptions"
        className="text-sm font-medium text-blue hover:underline"
      >
        Clear all
      </Link>
    </div>
  );
}

export function AssumptionsTable({
  assumptions,
  filters,
  rankOrder,
}: AssumptionsTableProps) {
  const rankIndex = new Map(rankOrder.map((id, index) => [id, index]));

  const sorted = [...assumptions].sort((a, b) => {
    const ai = rankIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bi = rankIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.statement.localeCompare(b.statement);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Assumptions</h1>
          <p className="mt-1 text-sm text-muted">
            {sorted.length} assumption{sorted.length === 1 ? "" : "s"}
            {filters.search || filters.category || filters.importance
              ? " matching filters"
              : ""}
            . Sorted by validation priority.
          </p>
        </div>
        <AddAssumptionButton />
      </div>

      <form
        method="get"
        action="/assumptions"
        className="space-y-4 rounded border border-line bg-white/60 p-4"
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <label htmlFor="search" className="mb-1.5 block text-sm font-medium text-navy">
              Search
            </label>
            <Input
              id="search"
              name="search"
              type="search"
              placeholder="Statement, description, or next action"
              defaultValue={filters.search ?? ""}
            />
          </div>
          <div>
            <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-navy">
              Category
            </label>
            <Select id="category" name="category" defaultValue={filters.category ?? ""}>
              <option value="">All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="importance" className="mb-1.5 block text-sm font-medium text-navy">
              Importance
            </label>
            <Select
              id="importance"
              name="importance"
              defaultValue={filters.importance ?? ""}
            >
              <option value="">All</option>
              {IMPORTANCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {IMPORTANCE_LABELS[level]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="confidence" className="mb-1.5 block text-sm font-medium text-navy">
              Confidence
            </label>
            <Select
              id="confidence"
              name="confidence"
              defaultValue={filters.confidence ?? ""}
            >
              <option value="">All</option>
              {CONFIDENCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {CONFIDENCE_LABELS[level]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-navy">
              Status
            </label>
            <Select id="status" name="status" defaultValue={filters.status ?? ""}>
              <option value="">All</option>
              {ASSUMPTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="owner" className="mb-1.5 block text-sm font-medium text-navy">
              Owner
            </label>
            <Select id="owner" name="owner" defaultValue={filters.owner ?? ""}>
              <option value="">All</option>
              <option value="jon">Jon</option>
              <option value="ahmed">Ahmed</option>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded bg-navy px-4 text-sm font-medium text-cream hover:bg-navy/90"
          >
            Apply filters
          </button>
          <Link
            href="/assumptions"
            className="inline-flex h-9 items-center rounded border border-navy/20 px-4 text-sm font-medium text-navy hover:bg-cream-tint"
          >
            Reset
          </Link>
        </div>
      </form>

      <ActiveFilters filters={filters} />

      {sorted.length === 0 ? (
        <EmptyState
          title="No assumptions match"
          description="Try clearing filters or add a new assumption to the log."
          action={<AddAssumptionButton />}
        />
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-white/60">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cream-tint/50 text-xs font-medium tracking-wide text-muted uppercase">
                <th className="min-w-[14rem] px-3 py-3">Assumption</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Importance</th>
                <th className="px-3 py-3">Confidence</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Owner</th>
                <th className="px-3 py-3 text-center">Evidence</th>
                <th className="min-w-[10rem] px-3 py-3">Next action</th>
                <th className="px-3 py-3 whitespace-nowrap">Target date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted.map((row) => (
                <tr key={row.id} className="group hover:bg-cream-tint/40">
                  <td className="px-3 py-3 align-top">
                    <Link
                      href={`/assumptions/${row.id}`}
                      className="font-medium leading-snug text-navy group-hover:text-blue"
                    >
                      {row.statement}
                    </Link>
                  </td>
                  <td className="px-3 py-3 align-top text-navy/80">{row.category}</td>
                  <td className="px-3 py-3 align-top">
                    <Badge variant="importance" value={row.importance} />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Badge variant="confidence" value={row.confidence} />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Badge variant="status" value={row.status} />
                  </td>
                  <td className="px-3 py-3 align-top text-navy/80">
                    {displayName(row.owner)}
                  </td>
                  <td className="px-3 py-3 align-top text-center tabular-nums text-navy">
                    {row.evidence_count ?? 0}
                  </td>
                  <td className="max-w-xs px-3 py-3 align-top text-navy/75">
                    {row.next_action ? (
                      <span className="line-clamp-2">{row.next_action}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top whitespace-nowrap text-navy/80">
                    {row.target_date ? formatDateShort(row.target_date) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
