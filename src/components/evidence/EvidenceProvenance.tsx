import { evidenceProvenanceParts } from "@/lib/domain/evidence-provenance";
import type { Evidence } from "@/lib/types";
import Link from "next/link";

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
    <p className={["text-xs text-muted", className].filter(Boolean).join(" ")}>
      {parts.map((part, index) => (
        <span key={`${part.label}:${part.href ?? index}`}>
          {index > 0 ? <span className="text-muted-light"> → </span> : null}
          {part.href ? (
            <Link
              href={part.href}
              target={part.external ? "_blank" : undefined}
              rel={part.external ? "noreferrer" : undefined}
              className="font-medium text-navy hover:underline"
            >
              {part.label}
              {part.external ? " ↗" : ""}
            </Link>
          ) : (
            <span className="font-medium text-navy">{part.label}</span>
          )}
        </span>
      ))}
    </p>
  );
}
