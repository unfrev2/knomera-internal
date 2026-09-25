"use client";

import { PageHeader } from "@/components/layout/Page";
import { OrganisationForm } from "@/components/organisations/OrganisationForm";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { ORGANISATION_TYPE_LABELS } from "@/lib/labels";
import type { Organisation } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

export function OrganisationsIndex({
  organisations,
  query,
}: {
  organisations: Organisation[];
  query: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisations"
        description="The companies and teams Knomera has spoken to — context, not a CRM."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            + Add organisation
          </Button>
        }
      />

      <form method="get" action="/organisations" className="max-w-md">
        <label htmlFor="org-search" className="sr-only">
          Search organisations
        </label>
        <Input
          id="org-search"
          name="q"
          defaultValue={query}
          placeholder="Search organisations"
        />
      </form>

      {organisations.length === 0 ? (
        <EmptyState
          title="No organisations yet"
          description="Add an organisation when a conversation or piece of evidence has a company behind it."
          action={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              + Add organisation
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-white/50">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-cream-tint/60 text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Organisation</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Contacts</th>
                <th className="px-4 py-3 font-medium">Discovery</th>
                <th className="px-4 py-3 font-medium">Evidence</th>
                <th className="px-4 py-3 font-medium">Opportunities</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {organisations.map((org) => (
                <tr key={org.id} className="hover:bg-cream-tint/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/organisations/${org.id}`}
                      className="font-medium text-navy hover:underline"
                    >
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {ORGANISATION_TYPE_LABELS[org.organisation_type]}
                  </td>
                  <td className="px-4 py-3 text-navy/80">{org.contact_count ?? 0}</td>
                  <td className="px-4 py-3 text-navy/80">{org.discovery_count ?? 0}</td>
                  <td className="px-4 py-3 text-navy/80">{org.evidence_count ?? 0}</td>
                  <td className="px-4 py-3 text-navy/80">
                    {org.opportunity_count ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OrganisationForm open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
