import { FocusOwnerColumn } from "@/components/focus/FocusOwnerColumn";
import { PageAlert, PageFrame, PageHeader } from "@/components/layout/Page";
import { requirePageContext } from "@/lib/auth/context";
import { listFocusItems } from "@/lib/db/focus";
import { formatWeekLabel, weekStartISO } from "@/lib/format";
import { APP_USERS } from "@/lib/labels";
import type { FocusItem } from "@/lib/types";
import Link from "next/link";

function shiftWeek(weekStart: string, deltaWeeks: number): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaWeeks * 7);
  return d.toISOString().slice(0, 10);
}

export default async function FocusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requirePageContext();
  const params = await searchParams;
  const weekParam =
    typeof params.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.week)
      ? params.week
      : weekStartISO();

  let dbError: string | null = null;
  let items: FocusItem[] = [];

  try {
    items = await listFocusItems(workspace.id, { week_start: weekParam });
  } catch (error) {
    console.error("Focus list load failed:", error);
    dbError =
      "We could not load focus. Check your database connection and try again.";
  }

  const jonItems = items.filter((item) => item.owner === "jon");
  const ahmedItems = items.filter((item) => item.owner === "ahmed");
  const prevWeek = shiftWeek(weekParam, -1);
  const nextWeek = shiftWeek(weekParam, 1);
  const thisWeek = weekStartISO();

  return (
    <PageFrame width="wide">
      <PageHeader
        title="Focus"
        description="What are Jon and Ahmed focusing on right now? Deliberately minimal — not a task system."
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href={`/focus?week=${prevWeek}`}
            className="text-muted hover:text-navy hover:underline"
          >
            ← Previous
          </Link>
          <span className="font-medium text-navy">
            Week of {formatWeekLabel(weekParam)}
          </span>
          <Link
            href={`/focus?week=${nextWeek}`}
            className="text-muted hover:text-navy hover:underline"
          >
            Next →
          </Link>
          {weekParam !== thisWeek ? (
            <Link
              href="/focus"
              className="font-medium text-blue hover:underline"
            >
              This week
            </Link>
          ) : null}
        </div>
      </PageHeader>

      {dbError ? <PageAlert>{dbError}</PageAlert> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <FocusOwnerColumn
          ownerName={APP_USERS.jon.displayName}
          ownerId="jon"
          items={jonItems}
          weekStart={weekParam}
        />
        <FocusOwnerColumn
          ownerName={APP_USERS.ahmed.displayName}
          ownerId="ahmed"
          items={ahmedItems}
          weekStart={weekParam}
        />
      </div>
    </PageFrame>
  );
}
