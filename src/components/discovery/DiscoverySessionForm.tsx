"use client";

import {
  createContactAction,
  createDiscoverySessionAction,
  createOrganisationAction,
  updateDiscoverySessionAction,
} from "@/app/actions/discovery";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { todayISO } from "@/lib/format";
import { APP_USERS, ORGANISATION_TYPE_LABELS } from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import type { Contact, DiscoverySession, Organisation } from "@/lib/types";
import { ORGANISATION_TYPES } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

export function DiscoverySessionForm({
  open,
  onClose,
  mode,
  session,
  organisations,
  contacts,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  session?: DiscoverySession;
  organisations: Organisation[];
  contacts: Contact[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState(session?.organisation_id ?? "");
  const [contactId, setContactId] = useState(session?.contact_id ?? "");
  const [orgList, setOrgList] = useState(organisations);
  const [contactList, setContactList] = useState(contacts);
  const [showNewOrg, setShowNewOrg] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);

  const orgContacts = useMemo(
    () => contactList.filter((c) => c.organisation_id === orgId),
    [contactList, orgId],
  );

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("organisation_id", orgId);
    formData.set("contact_id", contactId);
    startTransition(async () => {
      try {
        if (mode === "edit" && session) {
          formData.set("id", session.id);
          await updateDiscoverySessionAction(formData);
        } else {
          await createDiscoverySessionAction(formData);
        }
        onClose();
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  function handleCreateOrg(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const org = await createOrganisationAction(formData);
        setOrgList((prev) =>
          [...prev, org].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setOrgId(org.id);
        setContactId("");
        setShowNewOrg(false);
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not create organisation.");
      }
    });
  }

  function handleCreateContact(formData: FormData) {
    setError(null);
    if (!orgId) {
      setError("Select an organisation first.");
      return;
    }
    formData.set("organisation_id", orgId);
    startTransition(async () => {
      try {
        const contact = await createContactAction(formData);
        setContactList((prev) =>
          [...prev, contact].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setContactId(contact.id);
        setShowNewContact(false);
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not create contact.");
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Edit conversation" : "Log a conversation"}
    >
      <form action={handleSubmit} className="space-y-4">
        <Field label="Organisation" htmlFor="discovery-org" required>
          <div className="flex gap-2">
            <Select
              id="discovery-org"
              name="organisation_id_display"
              value={orgId}
              required
              className="flex-1"
              onChange={(event) => {
                setOrgId(event.target.value);
                setContactId("");
              }}
            >
              <option value="">Select…</option>
              {orgList.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowNewOrg((v) => !v)}
            >
              New
            </Button>
          </div>
        </Field>

        {showNewOrg ? (
          <div className="space-y-3 rounded border border-line bg-cream-tint/40 p-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              New organisation
            </p>
            <Field label="Name" htmlFor="new-org-name" required>
              <Input id="new-org-name" name="name" form="new-org-form" required />
            </Field>
            <Field label="Type" htmlFor="new-org-type">
              <Select
                id="new-org-type"
                name="organisation_type"
                form="new-org-form"
                defaultValue="prospect"
              >
                {ORGANISATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ORGANISATION_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Website" htmlFor="new-org-website">
              <Input id="new-org-website" name="website" form="new-org-form" />
            </Field>
            <Button
              type="submit"
              form="new-org-form"
              variant="secondary"
              size="sm"
              loading={pending}
              onClick={(event) => {
                event.preventDefault();
                const form = document.getElementById(
                  "new-org-form",
                ) as HTMLFormElement | null;
                if (form) handleCreateOrg(new FormData(form));
              }}
            >
              Save organisation
            </Button>
            <form id="new-org-form" className="hidden" />
          </div>
        ) : null}

        <Field label="Contact" htmlFor="discovery-contact">
          <div className="flex gap-2">
            <Select
              id="discovery-contact"
              value={contactId}
              className="flex-1"
              disabled={!orgId}
              onChange={(event) => setContactId(event.target.value)}
            >
              <option value="">None</option>
              {orgContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                  {contact.role ? ` — ${contact.role}` : ""}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="secondary"
              disabled={!orgId}
              onClick={() => setShowNewContact((v) => !v)}
            >
              New
            </Button>
          </div>
        </Field>

        {showNewContact && orgId ? (
          <div className="space-y-3 rounded border border-line bg-cream-tint/40 p-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              New contact
            </p>
            <Field label="Name" htmlFor="new-contact-name" required>
              <Input id="new-contact-name" name="name" form="new-contact-form" required />
            </Field>
            <Field label="Role" htmlFor="new-contact-role">
              <Input id="new-contact-role" name="role" form="new-contact-form" />
            </Field>
            <Field label="Email" htmlFor="new-contact-email">
              <Input
                id="new-contact-email"
                name="email"
                type="email"
                form="new-contact-form"
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={pending}
              onClick={() => {
                const form = document.getElementById(
                  "new-contact-form",
                ) as HTMLFormElement | null;
                if (form) handleCreateContact(new FormData(form));
              }}
            >
              Save contact
            </Button>
            <form id="new-contact-form" className="hidden" />
          </div>
        ) : null}

        <Field label="Title" htmlFor="discovery-title" required>
          <Input
            id="discovery-title"
            name="title"
            defaultValue={session?.title ?? ""}
            placeholder="e.g. Capacity discovery call"
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="discovery-date" required>
            <Input
              id="discovery-date"
              name="session_date"
              type="date"
              defaultValue={session?.session_date ?? todayISO()}
              required
            />
          </Field>
          <Field label="Conducted by" htmlFor="discovery-conducted">
            <Select
              id="discovery-conducted"
              name="conducted_by"
              defaultValue={session?.conducted_by ?? ""}
            >
              <option value="">Unassigned</option>
              {Object.values(APP_USERS).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Summary" htmlFor="discovery-summary">
          <Textarea
            id="discovery-summary"
            name="summary"
            rows={3}
            defaultValue={session?.summary ?? ""}
          />
        </Field>

        <Field label="Notes" htmlFor="discovery-notes">
          <Textarea
            id="discovery-notes"
            name="raw_notes"
            rows={6}
            defaultValue={session?.raw_notes ?? ""}
          />
        </Field>

        {error ? (
          <p className="text-sm text-coral" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={pending} disabled={!orgId}>
            {mode === "edit" ? "Save" : "Log conversation"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
