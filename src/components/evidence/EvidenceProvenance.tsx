import { EntityLink, EntityTypeMark } from "@/components/links/EntityType";
import { evidenceProvenanceParts } from "@/lib/domain/evidence-provenance";
import type { Evidence } from "@/lib/types";

export function EvidenceProvenance({
  evidence,
  className = "",
}: {
  evidence: Evidence;
  className?: string;
}) {
  const parts = evidenceProvenanceParts(evidence);
  if (parts.length === 0) return null;

  return (
    <p
      className={[
        "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {parts.map((part, index) => (
        <span
          key={`${part.entityType}:${part.label}:${part.href ?? index}`}
          className="inline-flex items-center gap-1"
        >
          {index > 0 ? (
            <span className="text-muted-light" aria-hidden>
              →
            </span>
          ) : null}
          {part.href ? (
            <EntityLink
              type={part.entityType}
              href={part.href}
              target={part.external ? "_blank" : undefined}
              rel={part.external ? "noreferrer" : undefined}
              className="text-xs"
              markSize="sm"
            >
              {part.label}
              {part.external ? " ↗" : ""}
            </EntityLink>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-navy">
              <EntityTypeMark type={part.entityType} size="sm" />
              {part.label}
            </span>
          )}
        </span>
      ))}
    </p>
  );
}
