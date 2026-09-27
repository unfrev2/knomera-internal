import { EvidenceAreaTabs } from "@/components/evidence/EvidenceAreaTabs";
import { ResearchRunsList } from "@/components/research/ResearchQueue";
import { PageAlert, PageFrame, PageHeader } from "@/components/layout/Page";
import { requirePageContext } from "@/lib/auth/context";
import { listResearchRuns } from "@/lib/db/research";

export default async function ResearchRunsPage() {
  const { workspace } = await requirePageContext();

  let runs: Awaited<ReturnType<typeof listResearchRuns>> = [];
  let dbError: string | null = null;
  try {
    runs = await listResearchRuns(workspace.id, 50);
  } catch (error) {
    dbError =
      error instanceof Error ? error.message : "Could not load research runs.";
  }

  return (
    <PageFrame>
      <PageHeader
        title="Evidence"
        description="History of manual and scheduled research runs."
      />
      <EvidenceAreaTabs currentPath="/evidence/runs" />
      {dbError ? <PageAlert>{dbError}</PageAlert> : null}
      <div className="mt-6">
        <ResearchRunsList runs={runs} />
      </div>
    </PageFrame>
  );
}
