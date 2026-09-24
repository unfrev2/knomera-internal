import { StrategyPageClient } from "@/components/strategy/StrategyPageClient";
import { PageAlert, PageFrame } from "@/components/layout/Page";
import { requirePageContext } from "@/lib/auth/context";
import { listStrategyItems } from "@/lib/db/strategy";
import type { StrategyItem } from "@/lib/types";

export default async function StrategyPage() {
  const { workspace } = await requirePageContext();

  let items: StrategyItem[] = [];
  let dbError: string | null = null;
  try {
    items = await listStrategyItems(workspace.id);
  } catch (error) {
    console.error("Strategy load failed:", error);
    dbError = "We could not load strategy. Check your connection and try again.";
  }

  return (
    <PageFrame width="narrow">
      {dbError ? <PageAlert>{dbError}</PageAlert> : null}
      <StrategyPageClient items={items} />
    </PageFrame>
  );
}
