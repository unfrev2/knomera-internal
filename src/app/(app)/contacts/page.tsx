import { ContactsIndex } from "@/components/contacts/ContactsIndex";
import { PageAlert, PageFrame } from "@/components/layout/Page";
import { requirePageContext } from "@/lib/auth/context";
import { listContacts } from "@/lib/db/contacts";
import { listOrganisations } from "@/lib/db/organisations";
import type { Contact, Organisation } from "@/lib/types";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requirePageContext();
  const params = await searchParams;
  const raw = params.q;
  const q = typeof raw === "string" ? raw.trim() : "";

  let contacts: Contact[] = [];
  let organisations: Organisation[] = [];
  let dbError: string | null = null;

  try {
    [contacts, organisations] = await Promise.all([
      listContacts(workspace.id, q),
      listOrganisations(workspace.id),
    ]);
  } catch (error) {
    console.error("Contacts page load failed:", error);
    dbError = "We could not load contacts. Check your connection and try again.";
  }

  return (
    <PageFrame width="wide">
      {dbError ? <PageAlert>{dbError}</PageAlert> : null}
      <ContactsIndex
        contacts={contacts}
        organisations={organisations}
        query={q}
      />
    </PageFrame>
  );
}
