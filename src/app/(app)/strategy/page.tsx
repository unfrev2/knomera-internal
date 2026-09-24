import { StrategyPageClient } from "@/components/strategy/StrategyPageClient";
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
    <div>
      {dbError ? (
        <p className="mb-6 rounded border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-navy">
          {dbError}
        </p>
      ) : null}
      <StrategyPageClient items={items} />
    </div>
  );
}
