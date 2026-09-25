"use client";

import { ContactForm } from "@/components/contacts/ContactForm";
import { PageHeader } from "@/components/layout/Page";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import type { Contact, Organisation } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

export function ContactsIndex({
  contacts,
  organisations,
  query,
}: {
  contacts: Contact[];
  organisations: Organisation[];
  query: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="People we have spoken to, and the evidence attributable to them."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            + Add contact
          </Button>
        }
      />

      <form method="get" action="/contacts" className="max-w-md">
        <label htmlFor="contact-search" className="sr-only">
          Search contacts
        </label>
        <Input
          id="contact-search"
          name="q"
          defaultValue={query}
          placeholder="Search name, role, or organisation"
        />
      </form>

      {contacts.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          description="Add a contact when evidence or a discovery conversation belongs to a person."
          action={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              + Add contact
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-white/50">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-cream-tint/60 text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Organisation</th>
                <th className="px-4 py-3 font-medium">Discovery</th>
                <th className="px-4 py-3 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-cream-tint/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="font-medium text-navy hover:underline"
                    >
                      {contact.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-navy/80">{contact.role ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/organisations/${contact.organisation_id}`}
                      className="text-navy hover:underline"
                    >
                      {contact.organisation_name ?? "Organisation"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {contact.discovery_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {contact.evidence_count ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ContactForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        organisations={organisations}
      />
    </div>
  );
}
