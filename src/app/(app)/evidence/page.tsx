import { EvidenceFeed } from "@/components/evidence/EvidenceFeed";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { requirePageContext } from "@/lib/auth/context";
import { listAssumptions } from "@/lib/db/assumptions";
import { listEvidence } from "@/lib/db/evidence";
import {
  EVIDENCE_STRENGTH,
  EVIDENCE_TYPE_LABELS,
  DIRECTION_LABELS,
} from "@/lib/labels";
import type { Assumption, Evidence } from "@/lib/types";
import { EVIDENCE_DIRECTIONS, EVIDENCE_TYPES } from "@/lib/types";
import Link from "next/link";

function parseEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function parseStrength(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number(value);
  if (num >= 1 && num <= 5) return num;
  return undefined;
}

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requirePageContext();
  const params = await searchParams;

  const pick = (key: string) => {
    const raw = params[key];
    return typeof raw === "string" ? raw.trim() : undefined;
  };

  const filters = {
    evidence_type: parseEnum(pick("type"), EVIDENCE_TYPES),
    strength: parseStrength(pick("strength")),
    direction: parseEnum(pick("direction"), EVIDENCE_DIRECTIONS),
    assumption_id: pick("assumption"),
    date_from: pick("from"),
    date_to: pick("to"),
  };

  let items: Evidence[] = [];
  let assumptions: Assumption[] = [];
  let dbError: string | null = null;

  try {
    [items, assumptions] = await Promise.all([
      listEvidence(workspace.id, filters),
      listAssumptions(workspace.id),
    ]);
  } catch {
    dbError =
      "We could not load evidence. Check your database connection and try again.";
    items = [];
    assumptions = [];
  }

  const hasFilters = Boolean(
    filters.evidence_type ||
      filters.strength ||
      filters.direction ||
      filters.assumption_id ||
      filters.date_from ||
      filters.date_to,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-navy">Evidence</h1>
        <p className="mt-1 text-sm text-muted">
          All workspace evidence, newest first.
        </p>
      </header>

      {dbError ? (
        <p className="rounded border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-navy">
          {dbError}
        </p>
      ) : null}

      <form
        method="get"
        action="/evidence"
        className="space-y-4 rounded border border-line bg-white/60 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="type" className="mb-1.5 block text-sm font-medium text-navy">
              Type
            </label>
            <Select id="type" name="type" defaultValue={filters.evidence_type ?? ""}>
              <option value="">All types</option>
              {EVIDENCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EVIDENCE_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="strength" className="mb-1.5 block text-sm font-medium text-navy">
              Strength
            </label>
            <Select
              id="strength"
              name="strength"
              defaultValue={
                filters.strength != null ? String(filters.strength) : ""
              }
            >
              <option value="">All strengths</option>
              {EVIDENCE_STRENGTH.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.value}. {item.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="direction" className="mb-1.5 block text-sm font-medium text-navy">
              Direction
            </label>
            <Select
              id="direction"
              name="direction"
              defaultValue={filters.direction ?? ""}
            >
              <option value="">All directions</option>
              {EVIDENCE_DIRECTIONS.map((direction) => (
                <option key={direction} value={direction}>
                  {DIRECTION_LABELS[direction]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="assumption" className="mb-1.5 block text-sm font-medium text-navy">
              Assumption
            </label>
            <Select
              id="assumption"
              name="assumption"
              defaultValue={filters.assumption_id ?? ""}
            >
              <option value="">All assumptions</option>
              {assumptions.map((assumption) => (
                <option key={assumption.id} value={assumption.id}>
                  {assumption.statement.length > 72
                    ? `${assumption.statement.slice(0, 72)}…`
                    : assumption.statement}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="from" className="mb-1.5 block text-sm font-medium text-navy">
              From date
            </label>
            <Input id="from" name="from" type="date" defaultValue={filters.date_from ?? ""} />
          </div>
          <div>
            <label htmlFor="to" className="mb-1.5 block text-sm font-medium text-navy">
              To date
            </label>
            <Input id="to" name="to" type="date" defaultValue={filters.date_to ?? ""} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded bg-navy px-4 text-sm font-medium text-cream hover:bg-navy/90"
          >
            Apply filters
          </button>
          {hasFilters ? (
            <Link
              href="/evidence"
              className="inline-flex h-9 items-center rounded border border-navy/20 px-4 text-sm font-medium text-navy hover:bg-cream-tint"
            >
              Clear filters
            </Link>
          ) : null}
        </div>
      </form>

      <EvidenceFeed items={items} />
    </div>
  );
}
