"use client";

import { DiscoverySessionForm } from "@/components/discovery/DiscoverySessionForm";
import { PageHeader } from "@/components/layout/Page";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { displayName } from "@/lib/labels";
import { formatDateShort } from "@/lib/format";
import type { Contact, DiscoverySession, Organisation } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

export function DiscoveryListClient({
  sessions,
  organisations,
  contacts,
}: {
  sessions: DiscoverySession[];
  organisations: Organisation[];
  contacts: Contact[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discovery"
        description="Turn customer conversations into structured evidence."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Log conversation
          </Button>
        }
      />

      {sessions.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Log a discovery conversation, then turn what you heard into evidence against assumptions."
          action={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Log conversation
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-white/50">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-cream-tint/60 text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Organisation</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Conducted by</th>
                <th className="px-4 py-3 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-cream-tint/40">
                  <td className="px-4 py-3 text-navy/80 whitespace-nowrap">
                    {formatDateShort(session.session_date)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/discovery/${session.id}`}
                      className="font-medium text-navy hover:underline"
                    >
                      {session.organisation_name ?? "Organisation"}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">{session.title}</p>
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {session.contact_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {session.contact_role ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {displayName(session.conducted_by)}
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {session.evidence_count ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DiscoverySessionForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        organisations={organisations}
        contacts={contacts}
      />
    </div>
  );
}
