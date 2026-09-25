import { EvidenceProvenance } from "@/components/evidence/EvidenceProvenance";
import { OrganisationDetailActions } from "@/components/organisations/OrganisationDetailActions";
import { LinkedObjectList } from "@/components/links/LinkedObjectList";
import { PageAlert, PageFrame } from "@/components/layout/Page";
import { Badge } from "@/components/ui/Badge";
import { requirePageContext } from "@/lib/auth/context";
import { getOrganisationDetail, listOrganisations } from "@/lib/db/organisations";
import { hrefForLinkable } from "@/lib/domain/linkable";
import { formatDateShort } from "@/lib/format";
import { ORGANISATION_TYPE_LABELS } from "@/lib/labels";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function OrganisationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requirePageContext();
  const { id } = await params;

  let detail;
  let organisations;

  try {
    [detail, organisations] = await Promise.all([
      getOrganisationDetail(workspace.id, id),
      listOrganisations(workspace.id),
    ]);
    if (!detail) notFound();
  } catch {
    return (
      <PageFrame width="narrow">
        <PageAlert>
          We could not load this organisation. Check your connection and try
          again.
        </PageAlert>
      </PageFrame>
    );
  }

  const { organisation, contacts, sessions, problems, evidence, opportunities } =
    detail;

  return (
    <PageFrame width="narrow">
      <header className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            Organisation
          </p>
          <h1 className="text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
            {organisation.name}
          </h1>
          {organisation.website ? (
            <p className="text-sm">
              <a
                href={
                  organisation.website.startsWith("http")
                    ? organisation.website
                    : `https://${organisation.website}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-blue hover:underline"
              >
                {organisation.website}
              </a>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge
            variant="neutral"
            label={ORGANISATION_TYPE_LABELS[organisation.organisation_type]}
          />
          <OrganisationDetailActions
            organisation={organisation}
            organisations={organisations}
          />
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Contacts</dt>
            <dd className="font-medium text-navy">{contacts.length}</dd>
          </div>
          <div>
            <dt className="text-muted">Conversations</dt>
            <dd className="font-medium text-navy">{sessions.length}</dd>
          </div>
          <div>
            <dt className="text-muted">Opportunities</dt>
            <dd className="font-medium text-navy">{opportunities.length}</dd>
          </div>
        </dl>
      </header>

      {organisation.notes ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-navy">Notes</h2>
          <p className="text-sm leading-relaxed text-navy/85 whitespace-pre-wrap">
            {organisation.notes}
          </p>
        </section>
      ) : null}

      <section id="contacts" className="space-y-3">
        <h2 className="text-lg font-semibold text-navy">Contacts</h2>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted">No contacts yet.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {contacts.map((contact) => (
              <li key={contact.id} className="py-2.5">
                <Link
                  href={`/contacts/${contact.id}`}
                  className="text-sm font-medium text-navy hover:underline"
                >
                  {contact.name}
                </Link>
                <p className="text-xs text-muted">
                  {[contact.role, contact.email].filter(Boolean).join(" · ") ||
                    "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LinkedObjectList
        title="Discovery conversations"
        emptyMessage="No conversations logged with this organisation yet."
        items={sessions.map((session) => ({
          type: "discovery_session" as const,
          id: session.id,
          title: session.title,
          subtitle: session.contact_name ?? undefined,
          meta: formatDateShort(session.session_date),
          href: hrefForLinkable("discovery_session", session.id),
        }))}
      />

      <LinkedObjectList
        title="Problems discussed"
        emptyMessage="No problems linked from conversations with this organisation."
        items={problems.map((problem) => ({
          type: "problem" as const,
          id: problem.id,
          title: problem.title,
          subtitle: problem.status,
          href: hrefForLinkable("problem", problem.id),
        }))}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-navy">
            Evidence from this organisation
          </h2>
          <p className="mt-1 text-sm text-muted">
            Direct, contact, discovery, and commercial evidence — each record once.
          </p>
        </div>
        {evidence.length === 0 ? (
          <p className="text-sm text-muted">No evidence yet from this organisation.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {evidence.map((item) => (
              <li key={item.id} className="space-y-1 py-3">
                <Link
                  href={hrefForLinkable("evidence", item.id)}
                  className="text-sm font-medium text-navy hover:underline"
                >
                  {item.title}
                </Link>
                {item.assumption_statement ? (
                  <p className="text-xs text-muted">
                    <Link
                      href={`/assumptions/${item.assumption_id}`}
                      className="hover:underline"
                    >
                      {item.assumption_statement}
                    </Link>
                  </p>
                ) : null}
                <EvidenceProvenance evidence={item} />
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge
                    variant="direction"
                    value={
                      item.direction as "supports" | "challenges" | "neutral"
                    }
                  />
                  <Badge
                    variant="neutral"
                    label={`Strength ${item.strength}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LinkedObjectList
        title="Commercial opportunities"
        emptyMessage="No opportunities with this organisation yet."
        items={opportunities.map((opp) => ({
          type: "opportunity" as const,
          id: opp.id,
          title: opp.title,
          subtitle: opp.stage,
          href: hrefForLinkable("opportunity", opp.id),
        }))}
      />
    </PageFrame>
  );
}
