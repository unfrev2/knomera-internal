import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import {
  displayName,
  EVIDENCE_TYPE_LABELS,
  strengthMeta,
} from "@/lib/labels";
import type { Evidence } from "@/lib/types";

export type EvidenceTimelineProps = {
  items: Evidence[];
};

export function EvidenceTimeline({ items }: EvidenceTimelineProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No evidence yet"
        description="Add interviews, data, prototypes, or other sources that support or challenge this assumption."
      />
    );
  }

  return (
    <ol className="relative space-y-0 border-l border-line pl-6">
      {items.map((item) => {
        const strength = strengthMeta(item.strength);
        return (
          <li key={item.id} className="relative pb-8 last:pb-0">
            <span
              className="absolute top-1.5 -left-[calc(0.75rem+1px)] size-2.5 rounded-full bg-blue ring-4 ring-cream"
              aria-hidden
            />
            <div className="rounded border border-line bg-white/60 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-navy">{item.title}</h3>
                <time
                  dateTime={item.evidence_date}
                  className="text-xs text-muted"
                >
                  {formatDate(item.evidence_date)}
                </time>
              </div>
              {item.description ? (
                <p className="mt-2 text-sm leading-relaxed text-navy/75">
                  {item.description}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="neutral" label={EVIDENCE_TYPE_LABELS[item.evidence_type]} />
                <Badge variant="direction" value={item.direction} />
                <Badge
                  variant="neutral"
                  label={`Strength ${item.strength}: ${strength.label}`}
                />
              </div>
              <p className="mt-2 text-xs text-muted">{strength.explanation}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {item.source ? <span>Source: {item.source}</span> : null}
                <span>Added by {displayName(item.created_by)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
