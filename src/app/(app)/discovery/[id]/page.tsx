import { DiscoveryDetailActions } from "@/components/discovery/DiscoveryDetailActions";
import { DiscoveryProblemsPanel } from "@/components/discovery/DiscoveryProblemsPanel";
import { PageAlert, PageFrame } from "@/components/layout/Page";
import { Badge } from "@/components/ui/Badge";
import { requirePageContext } from "@/lib/auth/context";
import { listContactsForOrganisation } from "@/lib/db/contacts";
import {
  getDiscoverySession,
  listEvidenceForDiscoverySession,
  listProblemsForDiscoverySession,
} from "@/lib/db/discovery";
import { listOrganisations } from "@/lib/db/organisations";
import { formatDate, formatDateShort } from "@/lib/format";
import { displayName } from "@/lib/labels";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function DiscoveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requirePageContext();
  const { id } = await params;

  let session;
  let evidence;
  let problems;
  let organisations;
  let contacts;

  try {
    session = await getDiscoverySession(workspace.id, id);
    if (!session) notFound();

    [evidence, problems, organisations] = await Promise.all([
      listEvidenceForDiscoverySession(workspace.id, id),
      listProblemsForDiscoverySession(workspace.id, id),
      listOrganisations(workspace.id),
    ]);
    const contactLists = await Promise.all(
      organisations.map((org) =>
        listContactsForOrganisation(workspace.id, org.id),
      ),
    );
    contacts = contactLists.flat();
  } catch {
    return (
      <PageFrame width="narrow">
        <PageAlert>
          We could not load this conversation. Check your connection and try again.
        </PageAlert>
      </PageFrame>
    );
  }

  return (
    <PageFrame width="narrow">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              Discovery
            </p>
            <h1 className="text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
              {session.title}
            </h1>
          </div>
          <DiscoveryDetailActions
            session={session}
            organisations={organisations}
            contacts={contacts}
          />
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Date</dt>
            <dd className="font-medium text-navy">
              {formatDateShort(session.session_date)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Conducted by</dt>
            <dd className="font-medium text-navy">
              {displayName(session.conducted_by)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Organisation</dt>
            <dd className="font-medium text-navy">
              {session.organisation_name}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Contact</dt>
            <dd className="font-medium text-navy">
              {session.contact_name
                ? `${session.contact_name}${
                    session.contact_role ? ` · ${session.contact_role}` : ""
                  }`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Created</dt>
            <dd className="font-medium text-navy">
              {formatDate(session.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Evidence generated</dt>
            <dd className="font-medium text-navy">
              {session.evidence_count ?? evidence.length}
            </dd>
          </div>
        </dl>
      </header>

      <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
        <h2 className="text-lg font-semibold text-navy">Summary</h2>
        <p className="text-sm leading-relaxed text-navy/85 whitespace-pre-wrap">
          {session.summary ?? "No summary yet."}
        </p>
      </section>

      <section className="space-y-3 rounded border border-line bg-white/60 px-5 py-5">
        <h2 className="text-lg font-semibold text-navy">Notes</h2>
        <p className="text-sm leading-relaxed text-navy/85 whitespace-pre-wrap">
          {session.raw_notes ?? "No notes yet."}
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-navy">Evidence generated</h2>
          <p className="mt-1 text-sm text-muted">
            Observations from this conversation, linked to assumptions.
          </p>
        </div>
        {evidence.length === 0 ? (
          <p className="text-sm text-muted">
            No evidence yet. Use Add evidence when something you heard should
            change a belief.
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {evidence.map((item) => (
              <li key={item.id} className="space-y-1 py-3">
                <Link
                  href={`/assumptions/${item.assumption_id}`}
                  className="text-sm font-medium text-navy hover:underline"
                >
                  {item.title}
                </Link>
                <p className="text-xs text-muted">
                  Assumption: {item.assumption_statement}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="direction" value={item.direction} />
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

      <DiscoveryProblemsPanel sessionId={session.id} problems={problems} />
    </PageFrame>
  );
}
