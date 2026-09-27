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
          {part.href && part.external ? (
            <a
              href={part.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 font-medium text-navy hover:underline"
            >
              <EntityTypeMark type={part.entityType} size="sm" />
              <span className="min-w-0 truncate">
                {part.label}
                {" ↗"}
              </span>
            </a>
          ) : part.href ? (
            <EntityLink
              type={part.entityType}
              href={part.href}
              className="text-xs"
              markSize="sm"
            >
              {part.label}
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
