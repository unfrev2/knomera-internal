import { EvidenceAreaTabs } from "@/components/evidence/EvidenceAreaTabs";
import {
  ResearchQueueActions,
  ResearchQueueList,
} from "@/components/research/ResearchQueue";
import { PageAlert, PageFrame, PageHeader } from "@/components/layout/Page";
import { requirePageContext } from "@/lib/auth/context";
import { listResearchFindingDetails } from "@/lib/db/research-findings";
import { isWebResearchConfigured } from "@/lib/research/providers/index";

export default async function ResearchQueuePage() {
  const { workspace } = await requirePageContext();

  let findings: Awaited<ReturnType<typeof listResearchFindingDetails>> = [];
  let dbError: string | null = null;
  try {
    findings = await listResearchFindingDetails(workspace.id, "pending");
  } catch (error) {
    dbError =
      error instanceof Error ? error.message : "Could not load research queue.";
  }

  return (
    <PageFrame>
      <PageHeader
        title="Evidence"
        description="Review AI research findings before they become Evidence."
      />
      <EvidenceAreaTabs currentPath="/evidence/research" />
      {dbError ? <PageAlert>{dbError}</PageAlert> : null}
      <div className="mt-6 space-y-6">
        <ResearchQueueActions webConfigured={isWebResearchConfigured()} />
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-navy">Pending review</h2>
          <ResearchQueueList findings={findings} />
        </section>
      </div>
    </PageFrame>
  );
}
