import type { Confidence, Evidence, EvidenceType } from "@/lib/types";
import { CONFIDENCE_LABELS } from "@/lib/labels";

const EXTERNAL_EVIDENCE_TYPES: EvidenceType[] = [
  "customer_interview",
  "data_analysis",
  "prototype",
  "competitor_research",
  "behavioural",
  "commercial",
];

export type SuggestedConfidence = {
  level: Confidence | null;
  explanation: string;
};

/**
 * Deterministic decision aid. Never auto-applied to founder confidence.
 */
export function suggestConfidence(
  evidence: Pick<Evidence, "evidence_type" | "strength" | "direction">[],
): SuggestedConfidence {
  if (evidence.length === 0) {
    return {
      level: null,
      explanation: "No evidence yet — confidence remains a founder judgement.",
    };
  }

  let supportWeight = 0;
  let challengeWeight = 0;
  const types = new Set<string>();
  let externalCount = 0;
  let strongExternalSupport = 0;

  for (const item of evidence) {
    types.add(item.evidence_type);
    const weight = item.strength;
    const isExternal = EXTERNAL_EVIDENCE_TYPES.includes(item.evidence_type);
    if (isExternal) externalCount += 1;

    if (item.direction === "supports") {
      supportWeight += weight * (isExternal ? 1.4 : 0.7);
      if (isExternal && item.strength >= 3) strongExternalSupport += 1;
    } else if (item.direction === "challenges") {
      challengeWeight += weight * (isExternal ? 1.4 : 0.7);
    } else {
      supportWeight += weight * 0.15;
    }
  }

  const net = supportWeight - challengeWeight;
  const diversity = types.size;

  let level: Confidence;
  if (challengeWeight > supportWeight * 1.2 && challengeWeight >= 4) {
    level = "low";
  } else if (net >= 14 && strongExternalSupport >= 2 && diversity >= 2) {
    level = "proven";
  } else if (net >= 9 && externalCount >= 2) {
    level = "high";
  } else if (net >= 5 || (externalCount >= 1 && net >= 3)) {
    level = "medium";
  } else {
    level = "low";
  }

  const parts: string[] = [];
  const supporting = evidence.filter((e) => e.direction === "supports").length;
  const challenging = evidence.filter((e) => e.direction === "challenges").length;

  if (supporting > 0) {
    parts.push(
      `${supporting} supporting piece${supporting === 1 ? "" : "s"} of evidence`,
    );
  }
  if (challenging > 0) {
    parts.push(
      `${challenging} challenging piece${challenging === 1 ? "" : "s"}`,
    );
  }
  if (externalCount > 0) {
    parts.push(
      `${externalCount} external source${externalCount === 1 ? "" : "s"}`,
    );
  } else {
    parts.push("only internal evidence so far");
  }
  if (strongExternalSupport > 0) {
    parts.push(
      `including ${strongExternalSupport} observed-behaviour-or-stronger item${strongExternalSupport === 1 ? "" : "s"}`,
    );
  }

  return {
    level,
    explanation: `Based on ${parts.join(", ")}. Evidence suggests ${CONFIDENCE_LABELS[level]}. This is a decision aid, not a calculation of truth.`,
  };
}
