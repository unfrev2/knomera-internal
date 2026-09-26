import type { EvidenceClass, EvidenceType } from "@/lib/types";

/**
 * Default provenance class from evidence type.
 * Strength remains independent of class.
 */
export function defaultEvidenceClass(type: EvidenceType): EvidenceClass {
  if (type === "competitor_research" || type === "market_research") {
    return "secondary";
  }
  if (type === "founder_reasoning") {
    return "internal";
  }
  return "direct";
}

/** Direct customer/behavioural/commercial observation types. */
export const DIRECT_EVIDENCE_TYPES: EvidenceType[] = [
  "customer_interview",
  "data_analysis",
  "prototype",
  "behavioural",
  "commercial",
  "bet_outcome",
];

export const SECONDARY_EVIDENCE_TYPES: EvidenceType[] = [
  "competitor_research",
  "market_research",
];
