import { formatDateShort } from "@/lib/format";
import type { EntityVisualKind } from "@/lib/domain/entity-visuals";
import type { Evidence } from "@/lib/types";

export type ProvenancePart = {
  label: string;
  entityType: EntityVisualKind;
  href?: string;
  external?: boolean;
};

export function evidenceProvenanceParts(item: Evidence): ProvenancePart[] {
  const parts: ProvenancePart[] = [];

  if (item.organisation_id && item.organisation_name) {
    parts.push({
      label: item.organisation_name,
      entityType: "organisation",
      href: `/organisations/${item.organisation_id}`,
    });
  }

  if (item.contact_id && item.contact_name) {
    const role = item.contact_role ? ` · ${item.contact_role}` : "";
    parts.push({
      label: `${item.contact_name}${role}`,
      entityType: "contact",
      href: `/contacts/${item.contact_id}`,
    });
  }

  if (item.discovery_session_id && (item.discovery_title || item.discovery_session_date)) {
    const date = item.discovery_session_date
      ? formatDateShort(item.discovery_session_date)
      : null;
    parts.push({
      label: date
        ? `${date} discovery call`
        : item.discovery_title ?? "Discovery call",
      entityType: "discovery_session",
      href: `/discovery/${item.discovery_session_id}`,
    });
  }

  if (item.evidence_source_id && item.source_title) {
    parts.push({
      label: item.source_title,
      entityType: "evidence_source",
      href: item.source_url ?? undefined,
      external: Boolean(item.source_url),
    });
  } else if (item.source) {
    // Legacy free-text source — still show when a structured source is missing.
    parts.push({
      label: item.source,
      entityType: "evidence_source",
      href: item.source_url ?? undefined,
      external: Boolean(item.source_url),
    });
  }

  return parts;
}
