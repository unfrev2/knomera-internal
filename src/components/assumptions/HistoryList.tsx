import { formatDateShort } from "@/lib/format";
import {
  displayName,
  formatHistoryValue,
  HISTORY_FIELD_LABELS,
} from "@/lib/labels";
import type { AssumptionHistory } from "@/lib/types";

export type HistoryListProps = {
  items: AssumptionHistory[];
};

export function HistoryList({ items }: HistoryListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">No recorded changes yet.</p>
    );
  }

  return (
    <ul className="divide-y divide-line rounded border border-line bg-white/40 text-sm">
      {items.map((entry) => {
        const fieldLabel =
          HISTORY_FIELD_LABELS[entry.field_changed] ?? entry.field_changed;
        return (
          <li
            key={entry.id}
            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="text-navy/85">
              <span className="font-medium">{fieldLabel}</span>
              {" changed from "}
              <span className="text-muted">
                {formatHistoryValue(entry.field_changed, entry.old_value)}
              </span>
              {" to "}
              <span className="font-medium">
                {formatHistoryValue(entry.field_changed, entry.new_value)}
              </span>
            </div>
            <div className="shrink-0 text-xs text-muted">
              {displayName(entry.changed_by)} ·{" "}
              {formatDateShort(entry.changed_at)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
