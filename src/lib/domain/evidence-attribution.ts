import type { Sql } from "postgres";
import type { EvidenceSourceType } from "@/lib/types";

export type EvidenceAttributionInput = {
  organisation_id?: string | null;
  contact_id?: string | null;
  discovery_session_id?: string | null;
  evidence_source_id?: string | null;
};

export type ResolvedEvidenceAttribution = {
  organisation_id: string | null;
  contact_id: string | null;
  discovery_session_id: string | null;
  evidence_source_id: string | null;
};

export type NewEvidenceSourceInput = {
  type: EvidenceSourceType;
  title: string;
  url?: string | null;
  description?: string | null;
};

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Resolves and validates workspace-safe evidence provenance.
 * Contact and discovery selections must belong to the chosen organisation.
 */
export async function resolveEvidenceAttribution(
  sql: Sql,
  workspaceId: string,
  input: EvidenceAttributionInput,
): Promise<ResolvedEvidenceAttribution> {
  let organisationId = input.organisation_id?.trim() || null;
  let contactId = input.contact_id?.trim() || null;
  const sessionId = input.discovery_session_id?.trim() || null;
  const sourceId = input.evidence_source_id?.trim() || null;

  if (sourceId) {
    const sources = await sql<{ id: string }[]>`
      SELECT id FROM evidence_sources
      WHERE id = ${sourceId} AND workspace_id = ${workspaceId}
      LIMIT 1
    `;
    if (!sources[0]) {
      throw new Error("Standalone source not found in this workspace.");
    }
  }

  if (sessionId) {
    const sessions = await sql<
      { id: string; organisation_id: string; contact_id: string | null }[]
    >`
      SELECT id, organisation_id, contact_id
      FROM discovery_sessions
      WHERE id = ${sessionId} AND workspace_id = ${workspaceId}
      LIMIT 1
    `;
    const session = sessions[0];
    if (!session) {
      throw new Error("Discovery call not found in this workspace.");
    }
    if (organisationId && organisationId !== session.organisation_id) {
      throw new Error(
        "The selected discovery call does not belong to that organisation.",
      );
    }
    organisationId = session.organisation_id;
    if (session.contact_id) {
      if (contactId && contactId !== session.contact_id) {
        throw new Error(
          "The selected contact did not take part in that discovery call.",
        );
      }
      contactId = session.contact_id;
    }
  }

  if (contactId) {
    const contacts = await sql<
      { id: string; organisation_id: string }[]
    >`
      SELECT id, organisation_id
      FROM contacts
      WHERE id = ${contactId} AND workspace_id = ${workspaceId}
      LIMIT 1
    `;
    const contact = contacts[0];
    if (!contact) {
      throw new Error("Contact not found in this workspace.");
    }
    if (organisationId && organisationId !== contact.organisation_id) {
      throw new Error("The selected contact does not belong to that organisation.");
    }
    organisationId = contact.organisation_id;
  }

  if (organisationId) {
    const orgs = await sql<{ id: string }[]>`
      SELECT id FROM organisations
      WHERE id = ${organisationId} AND workspace_id = ${workspaceId}
      LIMIT 1
    `;
    if (!orgs[0]) {
      throw new Error("Organisation not found in this workspace.");
    }
  }

  return {
    organisation_id: organisationId,
    contact_id: contactId,
    discovery_session_id: sessionId,
    evidence_source_id: sourceId,
  };
}
