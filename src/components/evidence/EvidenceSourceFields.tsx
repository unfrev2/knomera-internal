"use client";

import {
  createContactAction,
  createOrganisationAction,
} from "@/app/actions/discovery";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { formatDateShort } from "@/lib/format";
import { EVIDENCE_SOURCE_TYPE_LABELS, ORGANISATION_TYPE_LABELS } from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import type { EvidenceAttributionOption } from "@/lib/db/evidence";
import { EVIDENCE_SOURCE_TYPES, ORGANISATION_TYPES } from "@/lib/types";
import { useMemo, useState, useTransition } from "react";

export type EvidenceSourcePrefill = {
  organisationId?: string | null;
  contactId?: string | null;
  discoverySessionId?: string | null;
  evidenceSourceId?: string | null;
};

export function EvidenceSourceFields({
  options,
  evidence,
  prefill,
  onOptionsChange,
}: {
  options: EvidenceAttributionOption;
  evidence?: {
    organisation_id?: string | null;
    contact_id?: string | null;
    discovery_session_id?: string | null;
    evidence_source_id?: string | null;
    source?: string | null;
    source_title?: string | null;
  };
  prefill?: EvidenceSourcePrefill;
  onOptionsChange: (next: EvidenceAttributionOption) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [organisationId, setOrganisationId] = useState(
    evidence?.organisation_id ?? prefill?.organisationId ?? "",
  );
  const [contactId, setContactId] = useState(
    evidence?.contact_id ?? prefill?.contactId ?? "",
  );
  const [sessionId, setSessionId] = useState(
    evidence?.discovery_session_id ?? prefill?.discoverySessionId ?? "",
  );
  const [sourceId, setSourceId] = useState(
    evidence?.evidence_source_id ?? prefill?.evidenceSourceId ?? "",
  );
  const [useOther, setUseOther] = useState(
    Boolean(evidence?.evidence_source_id ?? prefill?.evidenceSourceId),
  );
  const [createNewSource, setCreateNewSource] = useState(false);
  const [sourceType, setSourceType] = useState<"link" | "free_text">("link");
  const [showNewOrg, setShowNewOrg] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgType, setNewOrgType] = useState<(typeof ORGANISATION_TYPES)[number]>("prospect");
  const [newContactName, setNewContactName] = useState("");
  const [newContactRole, setNewContactRole] = useState("");

  const orgContacts = useMemo(
    () =>
      organisationId
        ? options.contacts.filter((contact) => contact.organisation_id === organisationId)
        : options.contacts,
    [options.contacts, organisationId],
  );

  const sessionOptions = useMemo(() => {
    return options.sessions.filter((session) => {
      if (contactId) return session.contact_id === contactId;
      if (organisationId) {
        return (
          session.organisation_id === organisationId && session.contact_id == null
        );
      }
      return true;
    });
  }, [options.sessions, organisationId, contactId]);

  function handleOrganisation(nextId: string) {
    setOrganisationId(nextId);
    if (nextId) {
      const contact = options.contacts.find((item) => item.id === contactId);
      if (contact && contact.organisation_id !== nextId) {
        setContactId("");
        setSessionId("");
      } else {
        const session = options.sessions.find((item) => item.id === sessionId);
        if (session && session.organisation_id !== nextId) setSessionId("");
      }
    } else {
      setContactId("");
      setSessionId("");
    }
  }

  function handleContact(nextId: string) {
    setContactId(nextId);
    if (nextId) {
      const contact = options.contacts.find((item) => item.id === nextId);
      if (contact) setOrganisationId(contact.organisation_id);
      const session = options.sessions.find((item) => item.id === sessionId);
      if (session && session.contact_id && session.contact_id !== nextId) {
        setSessionId("");
      }
    } else {
      const session = options.sessions.find((item) => item.id === sessionId);
      if (session?.contact_id) setSessionId("");
    }
  }

  function handleSession(nextId: string) {
    setSessionId(nextId);
    if (!nextId) return;
    const session = options.sessions.find((item) => item.id === nextId);
    if (!session) return;
    setOrganisationId(session.organisation_id);
    if (session.contact_id) setContactId(session.contact_id);
  }

  function handleCreateOrg() {
    setError(null);
    const formData = new FormData();
    formData.set("name", newOrgName);
    formData.set("organisation_type", newOrgType);
    startTransition(async () => {
      try {
        const org = await createOrganisationAction(formData);
        setNewOrgName("");
        onOptionsChange({
          ...options,
          organisations: [...options.organisations, { id: org.id, name: org.name }].sort(
            (a, b) => a.name.localeCompare(b.name),
          ),
        });
        setOrganisationId(org.id);
        setContactId("");
        setSessionId("");
        setShowNewOrg(false);
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not create organisation.");
      }
    });
  }

  function handleCreateContact() {
    setError(null);
    if (!organisationId) {
      setError("Select an organisation first.");
      return;
    }
    const formData = new FormData();
    formData.set("organisation_id", organisationId);
    formData.set("name", newContactName);
    formData.set("role", newContactRole);
    startTransition(async () => {
      try {
        const contact = await createContactAction(formData);
        setNewContactName("");
        setNewContactRole("");
        const orgName =
          options.organisations.find((org) => org.id === organisationId)?.name ?? "";
        onOptionsChange({
          ...options,
          contacts: [
            ...options.contacts,
            {
              id: contact.id,
              name: contact.name,
              role: contact.role,
              organisation_id: contact.organisation_id,
              organisation_name: orgName,
            },
          ].sort((a, b) => a.name.localeCompare(b.name)),
        });
        setContactId(contact.id);
        setShowNewContact(false);
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not create contact.");
      }
    });
  }

  return (
    <div className="space-y-4 rounded border border-line bg-cream-tint/30 p-4">
      <div>
        <h3 className="text-sm font-semibold text-navy">Source</h3>
        <p className="mt-1 text-xs text-muted">
          Attribute this to an organisation, contact, discovery call, or another source.
        </p>
      </div>

      {evidence?.source && !evidence.evidence_source_id && !evidence.organisation_id ? (
        <p className="text-xs text-muted">Legacy source: {evidence.source}</p>
      ) : null}

      <input type="hidden" name="organisation_id" value={organisationId} />
      <input type="hidden" name="contact_id" value={contactId} />
      <input type="hidden" name="discovery_session_id" value={sessionId} />
      <input type="hidden" name="evidence_source_id" value={useOther ? sourceId : ""} />

      <Field label="Organisation" htmlFor="evidence-org">
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchSelect
              id="evidence-org"
              placeholder="Select an organisation"
              value={organisationId}
              options={options.organisations.map((org) => ({
                id: org.id,
                label: org.name,
              }))}
              onChange={handleOrganisation}
              emptyLabel="No organisation"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowNewOrg((value) => !value)}
          >
            + Add organisation
          </Button>
        </div>
      </Field>

      {showNewOrg ? (
        <div className="grid gap-3 rounded border border-line bg-white/70 p-3">
          <Field label="Name" htmlFor="quick-org-name" required>
            <Input
              id="quick-org-name"
              value={newOrgName}
              onChange={(event) => setNewOrgName(event.target.value)}
              required
            />
          </Field>
          <Field label="Type" htmlFor="quick-org-type">
            <Select
              id="quick-org-type"
              value={newOrgType}
              onChange={(event) =>
                setNewOrgType(event.target.value as (typeof ORGANISATION_TYPES)[number])
              }
            >
              {ORGANISATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ORGANISATION_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="button" size="sm" loading={pending} onClick={handleCreateOrg}>
            Save organisation
          </Button>
        </div>
      ) : null}

      <Field label="Contact" htmlFor="evidence-contact">
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchSelect
              id="evidence-contact"
              placeholder="Select a contact"
              value={contactId}
              options={orgContacts.map((contact) => ({
                id: contact.id,
                label: contact.name,
                subtitle: [contact.role, contact.organisation_name]
                  .filter(Boolean)
                  .join(" · "),
              }))}
              onChange={handleContact}
              emptyLabel="No contact"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!organisationId}
            onClick={() => setShowNewContact((value) => !value)}
          >
            + Add contact
          </Button>
        </div>
      </Field>

      {showNewContact ? (
        <div className="grid gap-3 rounded border border-line bg-white/70 p-3">
          <Field label="Name" htmlFor="quick-contact-name" required>
            <Input
              id="quick-contact-name"
              value={newContactName}
              onChange={(event) => setNewContactName(event.target.value)}
              required
            />
          </Field>
          <Field label="Role" htmlFor="quick-contact-role">
            <Input
              id="quick-contact-role"
              value={newContactRole}
              onChange={(event) => setNewContactRole(event.target.value)}
            />
          </Field>
          <Button type="button" size="sm" loading={pending} onClick={handleCreateContact}>
            Save contact
          </Button>
        </div>
      ) : null}

      <Field
        label="Discovery call"
        htmlFor="evidence-session"
        hint={
          contactId
            ? undefined
            : organisationId
              ? "Organisation-level calls only, or select a contact first."
              : "Select a contact, or search a call to fill organisation and contact."
        }
      >
        <SearchSelect
          id="evidence-session"
          placeholder="Select call…"
          value={sessionId}
          options={sessionOptions.map((session) => ({
            id: session.id,
            label: `${formatDateShort(session.session_date)} · ${session.title}`,
          }))}
          onChange={handleSession}
          emptyLabel="No discovery call"
        />
      </Field>

      <div className="space-y-3 border-t border-line pt-3">
        <button
          type="button"
          className="text-sm font-medium text-blue hover:underline"
          onClick={() => {
            setUseOther((value) => !value);
            if (useOther) {
              setSourceId("");
              setCreateNewSource(false);
            }
          }}
        >
          {useOther ? "Hide other source" : "Use another source"}
        </button>

        {useOther ? (
          <div className="space-y-3">
            {!createNewSource ? (
              <Field label="Search existing source" htmlFor="evidence-existing-source">
                <SearchSelect
                  id="evidence-existing-source"
                  placeholder="Search existing source"
                  value={sourceId}
                  options={options.sources.map((source) => ({
                    id: source.id,
                    label: source.title,
                    subtitle: source.url ?? source.description,
                  }))}
                  onChange={setSourceId}
                  emptyLabel="No existing source"
                />
              </Field>
            ) : null}
            <button
              type="button"
              className="text-xs font-medium text-navy hover:underline"
              onClick={() => {
                setCreateNewSource((value) => !value);
                if (!createNewSource) setSourceId("");
              }}
            >
              {createNewSource ? "Search existing source" : "Create new source"}
            </button>
            {createNewSource ? (
              <>
                <Field label="Source type" htmlFor="new_source_type" required>
                  <Select
                    id="new_source_type"
                    name="new_source_type"
                    value={sourceType}
                    onChange={(event) =>
                      setSourceType(event.target.value as "link" | "free_text")
                    }
                  >
                    {EVIDENCE_SOURCE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {EVIDENCE_SOURCE_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Source title" htmlFor="new_source_title" required>
                  <Input id="new_source_title" name="new_source_title" required />
                </Field>
                {sourceType === "link" ? (
                  <Field label="URL" htmlFor="new_source_url" required>
                    <Input
                      id="new_source_url"
                      name="new_source_url"
                      type="url"
                      required
                      placeholder="https://"
                    />
                  </Field>
                ) : (
                  <input type="hidden" name="new_source_url" value="" />
                )}
                <Field label="Notes" htmlFor="new_source_description">
                  <Textarea id="new_source_description" name="new_source_description" rows={2} />
                </Field>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
