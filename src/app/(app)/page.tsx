import {
  ActivitySection,
  AttentionSection,
  CloserSection,
  DoingSection,
  LearningSection,
} from "@/components/overview/HomeSections";
import { PageAlert, PageFrame, PageHeader } from "@/components/layout/Page";
import { requirePageContext } from "@/lib/auth/context";
import { getHomeDashboard } from "@/lib/db/home";
import type { HomeDashboard } from "@/lib/db/home";

const EMPTY: HomeDashboard = {
  attention: [],
  learning: [],
  activeBets: [],
  jonFocus: [],
  ahmedFocus: [],
  closer: {
    discovery_sessions: 0,
    organisations: 0,
    active_opportunities: 0,
    proposal_or_pilot: 0,
    commercial_evidence: 0,
    pipeline_value: null,
    pipeline_currency: "GBP",
  },
  activity: [],
};

export default async function OverviewPage() {
  const { workspace } = await requirePageContext();

  let dashboard = EMPTY;
  let dbError: string | null = null;

  try {
    dashboard = await getHomeDashboard(workspace.id);
  } catch (error) {
    console.error("Home dashboard load failed:", error);
    dbError =
      "We could not load the home dashboard. Check your connection and try again.";
  }

  return (
    <PageFrame width="wide">
      <PageHeader
        title="Home"
        description="Where Knomera stands — what needs attention, what we're learning, what we're doing, and whether we're getting closer to a business."
      >
        {dbError ? <PageAlert>{dbError}</PageAlert> : null}
      </PageHeader>

      <AttentionSection items={dashboard.attention} />
      <LearningSection items={dashboard.learning} />
      <DoingSection
        bets={dashboard.activeBets}
        jonFocus={dashboard.jonFocus}
        ahmedFocus={dashboard.ahmedFocus}
      />
      <CloserSection metrics={dashboard.closer} />
      <ActivitySection items={dashboard.activity} />
    </PageFrame>
  );
}
