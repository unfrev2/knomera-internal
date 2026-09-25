import { EvidenceFeed } from "@/components/evidence/EvidenceFeed";
import { PageAlert, PageFrame, PageHeader } from "@/components/layout/Page";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { requirePageContext } from "@/lib/auth/context";
import { listAssumptions } from "@/lib/db/assumptions";
import { listContacts } from "@/lib/db/contacts";
import { listDiscoverySessions } from "@/lib/db/discovery";
import { listEvidence } from "@/lib/db/evidence";
import { listOrganisations } from "@/lib/db/organisations";
import { formatDateShort } from "@/lib/format";
import {
  DIRECTION_LABELS,
  EVIDENCE_SOURCE_KIND_LABELS,
  EVIDENCE_STRENGTH,
  EVIDENCE_TYPE_LABELS,
} from "@/lib/labels";
import type { Assumption, Contact, DiscoverySession, Evidence, Organisation } from "@/lib/types";
import {
  EVIDENCE_DIRECTIONS,
  EVIDENCE_SOURCE_KIND_FILTERS,
  EVIDENCE_TYPES,
} from "@/lib/types";
import Link from "next/link";

function parseEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function parseStrength(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number(value);
  if (num >= 1 && num <= 5) return num;
  return undefined;
}

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requirePageContext();
  const params = await searchParams;

  const pick = (key: string) => {
    const raw = params[key];
    if (typeof raw !== "string") return undefined;
    const trimmed = raw.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  const filters = {
    evidence_type: parseEnum(pick("type"), EVIDENCE_TYPES),
    strength: parseStrength(pick("strength")),
    direction: parseEnum(pick("direction"), EVIDENCE_DIRECTIONS),
    assumption_id: pick("assumption"),
    date_from: pick("from"),
    date_to: pick("to"),
    organisation_id: pick("organisation"),
    contact_id: pick("contact"),
    discovery_session_id: pick("discovery"),
    source_kind: parseEnum(pick("source_kind"), EVIDENCE_SOURCE_KIND_FILTERS),
    q: pick("q"),
  };

  let items: Evidence[] = [];
  let assumptions: Assumption[] = [];
  let organisations: Organisation[] = [];
  let contacts: Contact[] = [];
  let sessions: DiscoverySession[] = [];
  let dbError: string | null = null;

  try {
    [items, assumptions, organisations, contacts, sessions] = await Promise.all([
      listEvidence(workspace.id, filters),
      listAssumptions(workspace.id),
      listOrganisations(workspace.id),
      listContacts(workspace.id),
      listDiscoverySessions(workspace.id),
    ]);
  } catch (error) {
    console.error("Evidence page load failed:", error);
    dbError =
      "We could not load evidence. Check your database connection and try again.";
    items = [];
    assumptions = [];
    organisations = [];
    contacts = [];
    sessions = [];
  }

  const visibleContacts = filters.organisation_id
    ? contacts.filter((contact) => contact.organisation_id === filters.organisation_id)
    : contacts;
  const visibleSessions = filters.contact_id
    ? sessions.filter((session) => session.contact_id === filters.contact_id)
    : filters.organisation_id
      ? sessions.filter((session) => session.organisation_id === filters.organisation_id)
      : sessions;

  const hasFilters = Boolean(
    filters.evidence_type ||
      filters.strength ||
      filters.direction ||
      filters.assumption_id ||
      filters.date_from ||
      filters.date_to ||
      filters.organisation_id ||
      filters.contact_id ||
      filters.discovery_session_id ||
      filters.source_kind ||
      filters.q,
  );

  return (
    <PageFrame width="wide">
      <PageHeader
        title="Evidence"
        description="All workspace evidence, newest first."
      />

      {dbError ? <PageAlert>{dbError}</PageAlert> : null}

      <form
        method="get"
        action="/evidence"
        className="space-y-4 rounded border border-line bg-white/60 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="q" className="mb-1.5 block text-sm font-medium text-navy">
              Search
            </label>
            <Input
              id="q"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Title, organisation, contact, discovery, or source"
            />
          </div>
          <div>
            <label htmlFor="organisation" className="mb-1.5 block text-sm font-medium text-navy">
              Organisation
            </label>
            <Select
              id="organisation"
              name="organisation"
              defaultValue={filters.organisation_id ?? ""}
            >
              <option value="">All organisations</option>
              {organisations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="contact" className="mb-1.5 block text-sm font-medium text-navy">
              Contact
            </label>
            <Select id="contact" name="contact" defaultValue={filters.contact_id ?? ""}>
              <option value="">All contacts</option>
              {visibleContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                  {contact.organisation_name ? ` · ${contact.organisation_name}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="discovery" className="mb-1.5 block text-sm font-medium text-navy">
              Discovery call
            </label>
            <Select
              id="discovery"
              name="discovery"
              defaultValue={filters.discovery_session_id ?? ""}
            >
              <option value="">All discovery calls</option>
              {visibleSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {formatDateShort(session.session_date)} · {session.title}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="source_kind" className="mb-1.5 block text-sm font-medium text-navy">
              Source type
            </label>
            <Select
              id="source_kind"
              name="source_kind"
              defaultValue={filters.source_kind ?? ""}
            >
              <option value="">All source types</option>
              {EVIDENCE_SOURCE_KIND_FILTERS.map((kind) => (
                <option key={kind} value={kind}>
                  {EVIDENCE_SOURCE_KIND_LABELS[kind]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="type" className="mb-1.5 block text-sm font-medium text-navy">
              Type
            </label>
            <Select id="type" name="type" defaultValue={filters.evidence_type ?? ""}>
              <option value="">All types</option>
              {EVIDENCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EVIDENCE_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="strength" className="mb-1.5 block text-sm font-medium text-navy">
              Strength
            </label>
            <Select
              id="strength"
              name="strength"
              defaultValue={
                filters.strength != null ? String(filters.strength) : ""
              }
            >
              <option value="">All strengths</option>
              {EVIDENCE_STRENGTH.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.value}. {item.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="direction" className="mb-1.5 block text-sm font-medium text-navy">
              Direction
            </label>
            <Select
              id="direction"
              name="direction"
              defaultValue={filters.direction ?? ""}
            >
              <option value="">All directions</option>
              {EVIDENCE_DIRECTIONS.map((direction) => (
                <option key={direction} value={direction}>
                  {DIRECTION_LABELS[direction]}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="assumption" className="mb-1.5 block text-sm font-medium text-navy">
              Assumption
            </label>
            <Select
              id="assumption"
              name="assumption"
              defaultValue={filters.assumption_id ?? ""}
            >
              <option value="">All assumptions</option>
              {assumptions.map((assumption) => (
                <option key={assumption.id} value={assumption.id}>
                  {assumption.statement.length > 72
                    ? `${assumption.statement.slice(0, 72)}…`
                    : assumption.statement}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="from" className="mb-1.5 block text-sm font-medium text-navy">
              From date
            </label>
            <Input id="from" name="from" type="date" defaultValue={filters.date_from ?? ""} />
          </div>
          <div>
            <label htmlFor="to" className="mb-1.5 block text-sm font-medium text-navy">
              To date
            </label>
            <Input id="to" name="to" type="date" defaultValue={filters.date_to ?? ""} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded bg-navy px-4 text-sm font-medium text-cream hover:bg-navy/90"
          >
            Apply filters
          </button>
          {hasFilters ? (
            <Link
              href="/evidence"
              className="inline-flex h-9 items-center rounded border border-navy/20 px-4 text-sm font-medium text-navy hover:bg-cream-tint"
            >
              Clear filters
            </Link>
          ) : null}
        </div>
      </form>

      <EvidenceFeed items={items} />
    </PageFrame>
  );
}
