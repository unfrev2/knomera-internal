import type {
  AppUserId,
  AssumptionStatus,
  Confidence,
  EvidenceDirection,
  EvidenceType,
  Importance,
  SessionUser,
} from "@/lib/types";

export const APP_USERS: Record<AppUserId, SessionUser> = {
  jon: {
    id: "jon",
    displayName: "Jon",
    workspaceSlug: "knomera",
  },
  ahmed: {
    id: "ahmed",
    displayName: "Ahmed",
    workspaceSlug: "knomera",
  },
};

export function displayName(userId: string | null | undefined): string {
  if (!userId) return "Unassigned";
  if (userId === "jon") return "Jon";
  if (userId === "ahmed") return "Ahmed";
  return userId.charAt(0).toUpperCase() + userId.slice(1);
}

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  proven: "Proven",
};

export const STATUS_LABELS: Record<AssumptionStatus, string> = {
  untested: "Untested",
  testing: "Testing",
  supported: "Supported",
  challenged: "Challenged",
  disproved: "Disproved",
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  founder_reasoning: "Founder reasoning",
  customer_interview: "Customer interview",
  data_analysis: "Data analysis",
  prototype: "Prototype",
  competitor_research: "Competitor research",
  behavioural: "Behavioural",
  commercial: "Commercial",
  other: "Other",
};

export const DIRECTION_LABELS: Record<EvidenceDirection, string> = {
  supports: "Supports",
  challenges: "Challenges",
  neutral: "Neutral",
};

export const EVIDENCE_STRENGTH = [
  {
    value: 1,
    label: "Opinion",
    explanation: "Internal reasoning, founder belief or hypothesis.",
  },
  {
    value: 2,
    label: "Qualitative",
    explanation: "Someone describes the problem, behaviour or need.",
  },
  {
    value: 3,
    label: "Observed behaviour",
    explanation: "We observe evidence that the behaviour or problem occurs.",
  },
  {
    value: 4,
    label: "Intent",
    explanation:
      "Someone takes a meaningful action indicating they want the solution.",
  },
  {
    value: 5,
    label: "Commercial",
    explanation: "Money changes hands or equivalent strong commercial validation.",
  },
] as const;

export function strengthMeta(strength: number) {
  return (
    EVIDENCE_STRENGTH.find((item) => item.value === strength) ??
    EVIDENCE_STRENGTH[0]
  );
}

export const HISTORY_FIELD_LABELS: Record<string, string> = {
  confidence: "Confidence",
  importance: "Importance",
  status: "Status",
  owner: "Owner",
  next_action: "Next action",
  target_date: "Target date",
};

export function formatHistoryValue(field: string, value: string | null): string {
  if (value == null || value === "") return "None";
  if (field === "confidence") return CONFIDENCE_LABELS[value as Confidence] ?? value;
  if (field === "importance") return IMPORTANCE_LABELS[value as Importance] ?? value;
  if (field === "status") return STATUS_LABELS[value as AssumptionStatus] ?? value;
  return value;
}
