import { Badge } from "@/components/ui/Badge";
import type { Confidence, Importance } from "@/lib/types";
import Link from "next/link";

export type PriorityListItem = {
  assumptionId: string;
  statement: string;
  reasons: string[];
  importance: Importance;
  confidence: Confidence;
};

export type PriorityListProps = {
  items: PriorityListItem[];
  className?: string;
  limit?: number;
};

export function PriorityList({
  items,
  className = "",
  limit = 8,
}: PriorityListProps) {
  const visible = items.slice(0, limit);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-[#0b1f3a]/55">
        No assumptions need attention right now.
      </p>
    );
  }

  return (
    <section className={className} aria-labelledby="priority-list-heading">
      <header className="mb-4">
        <h2
          id="priority-list-heading"
          className="text-lg font-semibold text-[#0b1f3a]"
        >
          What should we test next?
        </h2>
        <p className="mt-1 text-sm text-[#0b1f3a]/60">
          Ranked by validation priority — focus on critical gaps first.
        </p>
      </header>
      <ol className="divide-y divide-[#0b1f3a]/10 rounded border border-[#0b1f3a]/10 bg-white/60">
        {visible.map((item, index) => {
          const why =
            item.reasons.length > 0
              ? item.reasons.slice(0, 4).join(" · ")
              : "Needs validation";

          return (
            <li key={item.assumptionId}>
              <Link
                href={`/assumptions/${item.assumptionId}`}
                className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-[#efece6]/50 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium tabular-nums text-[#0b1f3a]/40">
                    {index + 1}
                  </p>
                  <p className="mt-0.5 text-sm font-medium leading-snug text-[#0b1f3a]">
                    {item.statement}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#0b1f3a]/60">
                    {why}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
                  <Badge variant="importance" value={item.importance} />
                  <Badge variant="confidence" value={item.confidence} />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
