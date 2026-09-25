import { DiscoveryListClient } from "@/components/discovery/DiscoveryListClient";
import { PageAlert, PageFrame } from "@/components/layout/Page";
import { requirePageContext } from "@/lib/auth/context";
import { listContacts } from "@/lib/db/contacts";
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
    [sessions, organisations, contacts] = await Promise.all([
      listDiscoverySessions(workspace.id),
      listOrganisations(workspace.id),
      listContacts(workspace.id),
    ]);
  } catch (error) {
    console.error("Discovery list load failed:", error);
    dbError =
      "We could not load discovery. Check your database connection and try again.";
  }

  return (
    <PageFrame width="wide">
      {dbError ? <PageAlert>{dbError}</PageAlert> : null}
      <DiscoveryListClient
        sessions={sessions}
        organisations={organisations}
        contacts={contacts}
      />
    </PageFrame>
  );
}
