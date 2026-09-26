import type { Confidence, Evidence, EvidenceClass, EvidenceType } from "@/lib/types";
import { CONFIDENCE_LABELS } from "@/lib/labels";
import {
  defaultEvidenceClass,
  DIRECT_EVIDENCE_TYPES,
} from "@/lib/domain/evidence-class";

export type SuggestedConfidence = {
  level: Confidence | null;
  explanation: string;
};

type EvidenceForSuggestion = Pick<
  Evidence,
  "evidence_type" | "strength" | "direction"
> & {
  evidence_class?: EvidenceClass;
};

function resolveClass(item: EvidenceForSuggestion): EvidenceClass {
  return item.evidence_class ?? defaultEvidenceClass(item.evidence_type);
}

function isDirect(item: EvidenceForSuggestion): boolean {
  const cls = resolveClass(item);
  if (cls === "direct") return true;
  if (cls === "secondary" || cls === "internal") return false;
  return DIRECT_EVIDENCE_TYPES.includes(item.evidence_type);
}

/**
 * Deterministic decision aid. Never auto-applied to founder confidence.
 *
 * Secondary research can reduce uncertainty and focus discovery, but should
 * not by itself establish High or Proven for customer pain / behaviour /
 * willingness-to-pay style assumptions.
 */
export function suggestConfidence(
  evidence: EvidenceForSuggestion[],
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
  let directCount = 0;
  let secondaryCount = 0;
  let internalCount = 0;
  let strongDirectSupport = 0;
  let secondarySupport = 0;
  let secondaryChallenge = 0;

  for (const item of evidence) {
    types.add(item.evidence_type);
    const cls = resolveClass(item);
    const direct = isDirect(item);
    const weight = item.strength;

    if (direct) directCount += 1;
    else if (cls === "secondary") secondaryCount += 1;
    else internalCount += 1;

    // Secondary evidence is down-weighted relative to direct observation.
    const classMultiplier = direct ? 1.4 : cls === "secondary" ? 0.55 : 0.7;

    if (item.direction === "supports") {
      supportWeight += weight * classMultiplier;
      if (direct && item.strength >= 3) strongDirectSupport += 1;
      if (cls === "secondary") secondarySupport += 1;
    } else if (item.direction === "challenges") {
      challengeWeight += weight * classMultiplier;
      if (cls === "secondary") secondaryChallenge += 1;
    } else {
      supportWeight += weight * 0.15;
    }
  }

  const net = supportWeight - challengeWeight;
  const diversity = types.size;

  let level: Confidence;
  if (challengeWeight > supportWeight * 1.2 && challengeWeight >= 4) {
    level = "low";
  } else if (
    // Proven / High require meaningful direct evidence — secondary alone is not enough.
    net >= 14 &&
    strongDirectSupport >= 2 &&
    diversity >= 2 &&
    directCount >= 2
  ) {
    level = "proven";
  } else if (net >= 9 && directCount >= 2) {
    level = "high";
  } else if (
    // Secondary-only support caps at Medium even with many sources.
    secondaryCount > 0 &&
    directCount === 0 &&
    net >= 3
  ) {
    level = "medium";
  } else if (net >= 5 || (directCount >= 1 && net >= 3)) {
    level = "medium";
  } else {
    level = "low";
  }

  // Hard cap: secondary research alone must not reach High or Proven.
  if (directCount === 0 && (level === "high" || level === "proven")) {
    level = "medium";
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

  if (directCount > 0) {
    parts.push(
      `${directCount} direct source${directCount === 1 ? "" : "s"}`,
    );
  }
  if (secondaryCount > 0) {
    parts.push(
      `${secondaryCount} secondary source${secondaryCount === 1 ? "" : "s"}`,
    );
  }
  if (internalCount > 0 && directCount === 0 && secondaryCount === 0) {
    parts.push("only internal evidence so far");
  } else if (directCount === 0 && secondaryCount > 0) {
    parts.push("no direct customer evidence yet");
  }

  if (strongDirectSupport > 0) {
    parts.push(
      `including ${strongDirectSupport} observed-behaviour-or-stronger item${strongDirectSupport === 1 ? "" : "s"}`,
    );
  }

  let explanation = `Based on ${parts.join(", ")}. Evidence suggests ${CONFIDENCE_LABELS[level]}.`;

  if (secondaryCount > 0 && directCount === 0) {
    explanation +=
      " Secondary research can reduce uncertainty and focus discovery, but should not by itself establish strong proof of a customer problem or willingness to pay.";
  }

  if (secondarySupport > 0 && secondaryChallenge > 0) {
    explanation += ` Public sources both support (${secondarySupport}) and challenge (${secondaryChallenge}) this assumption.`;
  }

  explanation += " This is a decision aid, not a calculation of truth.";

  return { level, explanation };
}

/** @deprecated Prefer evidence_class; kept for priority.ts compatibility. */
export const EXTERNAL_EVIDENCE_TYPES: EvidenceType[] = [
  "customer_interview",
  "data_analysis",
  "prototype",
  "behavioural",
  "commercial",
];
