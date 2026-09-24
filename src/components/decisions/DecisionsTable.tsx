"use client";

import { DecisionForm } from "@/components/decisions/DecisionForm";
import { PageHeader } from "@/components/layout/Page";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatDateShort } from "@/lib/format";
import { DECISION_STATUS_LABELS, displayName } from "@/lib/labels";
import type { Decision } from "@/lib/types";
import { DECISION_STATUSES } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type DecisionsTableFilters = {
  search?: string;
  status?: string;
  decided_by?: string;
};

export function DecisionsTable({
  decisions,
  filters,
}: {
  decisions: Decision[];
  filters: DecisionsTableFilters;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  function applyFilters(formData: FormData) {
    const params = new URLSearchParams();
    for (const key of ["search", "status", "decided_by"]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `/decisions?${qs}` : "/decisions");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Decisions"
        description="Why did we decide this — and what would make us reconsider?"
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Record decision
          </Button>
        }
      />

      <form action={applyFilters} className="grid gap-3 md:grid-cols-4">
        <Field label="Search" htmlFor="decisions-search" className="md:col-span-2">
          <Input
            id="decisions-search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Search decisions…"
          />
        </Field>
        <Field label="Status" htmlFor="decisions-status">
          <Select
            id="decisions-status"
            name="status"
            defaultValue={filters.status ?? ""}
          >
            <option value="">All</option>
            {DECISION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {DECISION_STATUS_LABELS[status]}
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

      {decisions.length === 0 ? (
        <EmptyState
          title="No decisions yet"
          description="Record important judgements so future Jon and Ahmed know what we knew at the time."
          action={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Record decision
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-white/50">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-cream-tint/60 text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Decision</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Decided by</th>
                <th className="px-4 py-3 font-medium">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {decisions.map((item) => (
                <tr key={item.id} className="hover:bg-cream-tint/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/decisions/${item.id}`}
                      className="font-medium text-navy hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                      {item.decision}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-navy/80 whitespace-nowrap">
                    {formatDateShort(item.decision_date)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="decision-status" value={item.status} />
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {displayName(item.decided_by)}
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {(item.linked_assumption_count ?? 0) +
                      (item.linked_evidence_count ?? 0) +
                      (item.linked_problem_count ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DecisionForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
      />
    </div>
  );
}
