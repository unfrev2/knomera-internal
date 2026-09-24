import { EvidenceItemActions } from "@/components/assumptions/EvidenceItemActions";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import {
  displayName,
  EVIDENCE_TYPE_LABELS,
  strengthMeta,
} from "@/lib/labels";
import type { Evidence } from "@/lib/types";
import Link from "next/link";

export type EvidenceFeedProps = {
  items: Evidence[];
  sourceOptions?: string[];
};

export function EvidenceFeed({
  items,
  sourceOptions = [],
}: EvidenceFeedProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No evidence found"
        description="Adjust filters or add evidence from an assumption detail page."
      />
    );
  }

  return (
    <ul className="divide-y divide-line rounded border border-line bg-white/60">
      {items.map((item) => {
        const strength = strengthMeta(item.strength);
        return (
          <li key={item.id} className="px-4 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-navy">{item.title}</h3>
                {item.assumption_statement ? (
                  <Link
                    href={`/assumptions/${item.assumption_id}`}
                    className="mt-1 block text-sm text-blue hover:underline"
                  >
                    {item.assumption_statement}
                  </Link>
                ) : null}
                {item.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-navy/75">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <time
                dateTime={item.evidence_date}
                className="shrink-0 text-xs text-muted"
              >
                {formatDate(item.evidence_date)}
              </time>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="neutral" label={EVIDENCE_TYPE_LABELS[item.evidence_type]} />
              <Badge variant="direction" value={item.direction} />
              <Badge
                variant="neutral"
                label={`${strength.label} (${item.strength}/5)`}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">
                {item.source ? `${item.source} · ` : ""}
                {displayName(item.created_by)}
              </p>
              <EvidenceItemActions
                evidence={item}
                sourceOptions={sourceOptions}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
