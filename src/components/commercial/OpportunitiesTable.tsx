"use client";

import { OpportunityForm } from "@/components/commercial/OpportunityForm";
import { PageHeader } from "@/components/layout/Page";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatDateShort } from "@/lib/format";
import {
  OPPORTUNITY_STAGE_LABELS,
  displayName,
} from "@/lib/labels";
import type { Opportunity } from "@/lib/types";
import { OPPORTUNITY_STAGES } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type OpportunitiesTableFilters = {
  search?: string;
  stage?: string;
  owner?: string;
};

function formatValue(value: number | null, currency: string): string {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

export function OpportunitiesTable({
  opportunities,
  filters,
}: {
  opportunities: Opportunity[];
  filters: OpportunitiesTableFilters;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  function applyFilters(formData: FormData) {
    const params = new URLSearchParams();
    for (const key of ["search", "stage", "owner"]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `/commercial?${qs}` : "/commercial");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commercial"
        description="Track commercial validation without a CRM. Behaviour becomes evidence only when you interpret it."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Add opportunity
          </Button>
        }
      />

      <form action={applyFilters} className="grid gap-3 md:grid-cols-4">
        <Field label="Search" htmlFor="opp-search" className="md:col-span-2">
          <Input
            id="opp-search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Search opportunities…"
          />
        </Field>
        <Field label="Stage" htmlFor="opp-filter-stage">
          <Select
            id="opp-filter-stage"
            name="stage"
            defaultValue={filters.stage ?? ""}
          >
            <option value="">All</option>
            {OPPORTUNITY_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {OPPORTUNITY_STAGE_LABELS[stage]}
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

      {opportunities.length === 0 ? (
        <EmptyState
          title="No opportunities yet"
          description="Add an opportunity against an organisation from discovery when commercial interest appears."
          action={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Add opportunity
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-white/50">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-cream-tint/60 text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Opportunity</th>
                <th className="px-4 py-3 font-medium">Organisation</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Next action</th>
                <th className="px-4 py-3 font-medium">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {opportunities.map((opportunity) => (
                <tr key={opportunity.id} className="hover:bg-cream-tint/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/commercial/${opportunity.id}`}
                      className="font-medium text-navy hover:underline"
                    >
                      {opportunity.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {opportunity.organisation_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="opportunity-stage"
                      value={opportunity.stage}
                    />
                  </td>
                  <td className="px-4 py-3 text-navy/80 tabular-nums">
                    {formatValue(
                      opportunity.potential_value,
                      opportunity.currency,
                    )}
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {opportunity.next_action ? (
                      <div>
                        <p>{opportunity.next_action}</p>
                        {opportunity.next_action_date ? (
                          <p className="text-xs text-muted">
                            {formatDateShort(opportunity.next_action_date)}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {displayName(opportunity.owner)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OpportunityForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
      />
    </div>
  );
}
