"use client";

import { BetForm } from "@/components/bets/BetForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { BET_STATUS_LABELS, displayName } from "@/lib/labels";
import type { Bet } from "@/lib/types";
import { BET_STATUSES } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type BetsTableFilters = {
  search?: string;
  status?: string;
  owner?: string;
};

export function BetsTable({
  bets,
  filters,
}: {
  bets: Bet[];
  filters: BetsTableFilters;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  function applyFilters(formData: FormData) {
    const params = new URLSearchParams();
    for (const key of ["search", "status", "owner"]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `/bets?${qs}` : "/bets");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-navy md:text-3xl">Bets</h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Meaningful commitments with a hypothesis. Separate from cheap ideas.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Create bet
        </Button>
      </header>

      <form action={applyFilters} className="grid gap-3 md:grid-cols-4">
        <Field label="Search" htmlFor="bets-search" className="md:col-span-2">
          <Input
            id="bets-search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Search bets…"
          />
        </Field>
        <Field label="Status" htmlFor="bets-status">
          <Select
            id="bets-status"
            name="status"
            defaultValue={filters.status ?? ""}
          >
            <option value="">All</option>
            {BET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {BET_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="submit" variant="secondary" className="w-full">
            Filter
          </Button>
        </div>
      </form>

      {bets.length === 0 ? (
        <EmptyState
          title="No bets yet"
          description="A bet is a real commitment — hypothesis, ownership, and outcomes."
          action={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create bet
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-white/50">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-cream-tint/60 text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Bet</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assumptions</th>
                <th className="px-4 py-3 font-medium">Outcomes</th>
                <th className="px-4 py-3 font-medium">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bets.map((bet) => (
                <tr key={bet.id} className="hover:bg-cream-tint/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/bets/${bet.id}`}
                      className="font-medium text-navy hover:underline"
                    >
                      {bet.title}
                    </Link>
                    {bet.hypothesis ? (
                      <p className="mt-1 line-clamp-1 text-xs text-muted">
                        {bet.hypothesis}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="bet-status" value={bet.status} />
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {bet.linked_assumption_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {bet.outcome_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {displayName(bet.owner)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BetForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
      />
    </div>
  );
}
