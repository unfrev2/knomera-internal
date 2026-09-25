import { AddEvidenceButton } from "@/components/evidence/AddEvidenceButton";
import { EvidenceProvenance } from "@/components/evidence/EvidenceProvenance";
import { LinkedObjectList } from "@/components/links/LinkedObjectList";
import { PageAlert, PageFrame, PageHeader } from "@/components/layout/Page";
import { Badge } from "@/components/ui/Badge";
import { requirePageContext } from "@/lib/auth/context";
import { getContactDetail } from "@/lib/db/contacts";
import { hrefForLinkable } from "@/lib/domain/linkable";
import { formatDateShort } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requirePageContext();
  const { id } = await params;

  let detail;

  try {
    detail = await getContactDetail(workspace.id, id);
    if (!detail) notFound();
  } catch {
    return (
      <PageFrame width="narrow">
        <PageAlert>
          We could not load this contact. Check your connection and try again.
        </PageAlert>
      </PageFrame>
    );
  }

  const { contact, organisation, sessions, evidence, opportunities } = detail;

  return (
    <PageFrame width="narrow">
      <PageHeader
        eyebrow="Contact"
        title={contact.name}
        description={
          contact.role ? `${contact.role} at ${organisation.name}` : organisation.name
        }
        actions={
          <AddEvidenceButton
            prefill={{
              organisationId: contact.organisation_id,
              contactId: contact.id,
            }}
            returnTo={`/contacts/${contact.id}`}
          />
        }
      />

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Organisation</dt>
          <dd className="font-medium text-navy">
            <Link
              href={`/organisations/${organisation.id}`}
              className="hover:underline"
            >
              {organisation.name} →
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-muted">Role</dt>
          <dd className="font-medium text-navy">{contact.role ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Email</dt>
          <dd className="font-medium text-navy">{contact.email ?? "—"}</dd>
        </div>
      </dl>

      {contact.notes ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-navy">Notes</h2>
          <p className="text-sm leading-relaxed text-navy/85 whitespace-pre-wrap">
            {contact.notes}
          </p>
        </section>
      ) : null}

      <LinkedObjectList
        title="Discovery"
        emptyMessage="No discovery conversations with this contact yet."
        items={sessions.map((session) => ({
          type: "discovery_session" as const,
          id: session.id,
          title: session.title,
          subtitle: session.organisation_name ?? undefined,
          meta: formatDateShort(session.session_date),
          href: hrefForLinkable("discovery_session", session.id),
        }))}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy">Evidence</h2>
        {evidence.length === 0 ? (
          <p className="text-sm text-muted">No evidence attributable to this contact yet.</p>
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
                  <Badge variant="direction" value={item.direction} />
                  <Badge variant="neutral" label={`Strength ${item.strength}`} />
                  <Badge variant="neutral" label={formatDateShort(item.evidence_date)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LinkedObjectList
        title="Commercial"
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
