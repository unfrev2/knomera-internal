import { PageAlert, PageFrame } from "@/components/layout/Page";
import { OrganisationsIndex } from "@/components/organisations/OrganisationsIndex";
import { requirePageContext } from "@/lib/auth/context";
import { listOrganisations } from "@/lib/db/organisations";
import type { Organisation } from "@/lib/types";

export default async function OrganisationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requirePageContext();
  const params = await searchParams;
  const raw = params.q;
  const q = typeof raw === "string" ? raw.trim() : "";

  let organisations: Organisation[] = [];
  let dbError: string | null = null;

  try {
    organisations = await listOrganisations(workspace.id, q);
  } catch (error) {
    console.error("Organisations page load failed:", error);
    dbError =
      "We could not load organisations. Check your connection and try again.";
  }

  return (
    <PageFrame width="wide">
      {dbError ? <PageAlert>{dbError}</PageAlert> : null}
      <OrganisationsIndex organisations={organisations} query={q} />
    </PageFrame>
  );
}
