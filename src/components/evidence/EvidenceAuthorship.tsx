import {
  EVIDENCE_CLASS_LABELS,
  EVIDENCE_TYPE_LABELS,
  displayName,
} from "@/lib/labels";
import type { Evidence } from "@/lib/types";

/**
 * Authorship + class line for evidence rows.
 * Distinguishes direct vs secondary vs internal without colour alone.
 */
export function EvidenceAuthorship({ evidence }: { evidence: Evidence }) {
  const classLabel = EVIDENCE_CLASS_LABELS[evidence.evidence_class];
  const typeLabel = EVIDENCE_TYPE_LABELS[evidence.evidence_type];
  const author = displayName(evidence.created_by);
  const reviewer = evidence.reviewed_by
    ? displayName(evidence.reviewed_by)
    : null;

  if (evidence.evidence_class === "secondary") {
    return (
      <p className="text-xs text-muted">
        <span className="font-medium text-navy/80">
          Secondary research · {typeLabel}
        </span>
        <span className="mx-1.5 text-muted-light">·</span>
        {author}
        {reviewer ? ` · Reviewed by ${reviewer}` : ""}
      </p>
    );
  }

  if (evidence.evidence_class === "internal") {
    return (
      <p className="text-xs text-muted">
        <span className="font-medium text-navy/80">Internal reasoning</span>
        <span className="mx-1.5 text-muted-light">·</span>
        Added by {author}
        {evidence.ai_assisted ? " · AI-assisted" : ""}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted">
      <span className="font-medium text-navy/80">Direct evidence</span>
      <span className="mx-1.5 text-muted-light">·</span>
      Added by {author}
      {evidence.ai_assisted ? " · AI-assisted" : ""}
      <span className="sr-only"> ({classLabel})</span>
    </p>
  );
}
