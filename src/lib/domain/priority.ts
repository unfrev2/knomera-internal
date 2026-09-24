import type {
  Assumption,
  AssumptionStatus,
  Confidence,
  Evidence,
  EvidenceType,
  Importance,
} from "@/lib/types";

const IMPORTANCE_SCORE: Record<Importance, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const CONFIDENCE_UNCERTAINTY: Record<Confidence, number> = {
  low: 4,
  medium: 3,
  high: 2,
  proven: 0,
};

const EXTERNAL_EVIDENCE_TYPES: EvidenceType[] = [
  "customer_interview",
  "data_analysis",
  "prototype",
  "competitor_research",
  "behavioural",
  "commercial",
];

export type PriorityInput = {
  assumption: Pick<
    Assumption,
    "id" | "statement" | "importance" | "confidence" | "status" | "category"
  >;
  evidence: Pick<Evidence, "evidence_type" | "strength" | "direction">[];
};

export type PriorityResult = {
  assumptionId: string;
  statement: string;
  category: string;
  importance: Importance;
  confidence: Confidence;
  status: AssumptionStatus;
  score: number;
  reasons: string[];
};

/**
 * Deterministic validation-priority ranking.
 *
 * Higher score = should investigate sooner.
 * Tunable weights live here so the formula stays easy to adjust.
 */
export function calculateValidationPriority(
  input: PriorityInput,
): PriorityResult {
  const { assumption, evidence } = input;
  const reasons: string[] = [];

  let score =
    IMPORTANCE_SCORE[assumption.importance] * 3 +
    CONFIDENCE_UNCERTAINTY[assumption.confidence] * 2.5;

  if (assumption.importance === "critical") {
    score += 2;
    reasons.push("Critical assumption");
  } else {
    reasons.push(
      `${capitalize(assumption.importance)} importance`,
    );
  }

  if (assumption.confidence === "proven") {
    score -= 8;
    reasons.push("Already marked proven");
  } else if (assumption.confidence === "low") {
    reasons.push("Low confidence");
  } else {
    reasons.push(`${capitalize(assumption.confidence)} confidence`);
  }

  const external = evidence.filter((item) =>
    EXTERNAL_EVIDENCE_TYPES.includes(item.evidence_type),
  );
  const founderOnly =
    evidence.length > 0 &&
    evidence.every((item) => item.evidence_type === "founder_reasoning");

  if (evidence.length === 0) {
    score += 4;
    reasons.push("No evidence yet");
  } else if (external.length === 0) {
    score += 3;
    if (founderOnly) {
      reasons.push("Supported only by founder reasoning");
    } else {
      reasons.push("No external evidence");
    }
  } else {
    const strongExternal = external.filter((item) => item.strength >= 3);
    if (strongExternal.length === 0) {
      score += 2;
      reasons.push("External evidence is weak");
    } else {
      score -= Math.min(4, strongExternal.length);
      reasons.push(
        `${strongExternal.length} piece${strongExternal.length === 1 ? "" : "s"} of stronger external evidence`,
      );
    }
  }

  if (assumption.status === "untested") {
    score += 2;
  } else if (assumption.status === "testing") {
    score += 0.5;
  } else if (assumption.status === "supported") {
    score -= 3;
  } else if (assumption.status === "disproved") {
    score -= 6;
  }

  const supports = evidence.filter((item) => item.direction === "supports");
  const challenges = evidence.filter((item) => item.direction === "challenges");
  if (supports.length > 0 && challenges.length > 0) {
    score += 2;
    reasons.push("Evidence conflicts");
  }

  if (evidence.length > 0) {
    const avgStrength =
      evidence.reduce((sum, item) => sum + item.strength, 0) / evidence.length;
    if (avgStrength < 2.5) {
      score += 1.5;
    }
  }

  return {
    assumptionId: assumption.id,
    statement: assumption.statement,
    category: assumption.category,
    importance: assumption.importance,
    confidence: assumption.confidence,
    status: assumption.status,
    score: Math.round(score * 10) / 10,
    reasons,
  };
}

export function rankAssumptionsForValidation(
  items: PriorityInput[],
): PriorityResult[] {
  return items
    .map(calculateValidationPriority)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.statement.localeCompare(b.statement);
    });
}

export function explainPriority(result: PriorityResult): string {
  const primary = result.reasons.slice(0, 3).join(" · ");
  return primary;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
