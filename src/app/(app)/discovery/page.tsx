import { DiscoveryListClient } from "@/components/discovery/DiscoveryListClient";
import { requirePageContext } from "@/lib/auth/context";
import { listContactsForOrganisation } from "@/lib/db/contacts";
import { listDiscoverySessions } from "@/lib/db/discovery";
import { listOrganisations } from "@/lib/db/organisations";
import type { Contact, DiscoverySession, Organisation } from "@/lib/types";

export default async function DiscoveryPage() {
  const { workspace } = await requirePageContext();

  let sessions: DiscoverySession[] = [];
  let organisations: Organisation[] = [];
  let contacts: Contact[] = [];
  let dbError: string | null = null;

  try {
    [sessions, organisations] = await Promise.all([
      listDiscoverySessions(workspace.id),
      listOrganisations(workspace.id),
    ]);
    const contactLists = await Promise.all(
      organisations.map((org) =>
        listContactsForOrganisation(workspace.id, org.id),
      ),
    );
    contacts = contactLists.flat();
  } catch (error) {
    console.error("Discovery list load failed:", error);
    dbError =
      "We could not load discovery. Check your database connection and try again.";
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      {dbError ? (
        <p className="mb-6 rounded border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-navy">
          {dbError}
        </p>
      ) : null}
      <DiscoveryListClient
        sessions={sessions}
        organisations={organisations}
        contacts={contacts}
      />
    </div>
  );
}
