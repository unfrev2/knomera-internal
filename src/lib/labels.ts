import type {
  AppUserId,
  AssumptionStatus,
  Confidence,
  EvidenceClass,
  EvidenceDirection,
  EvidenceType,
  Importance,
  OrganisationType,
  ProblemAssumptionRelationship,
  ProblemStatus,
  DecisionStatus,
  IdeaStatus,
  BetStatus,
  BetAssumptionRelationship,
  BetOutcomeResult,
  OpportunityStage,
  EvidenceSourceKindFilter,
  EvidenceSourceType,
  FocusItemStatus,
  ResearchFindingStatus,
  ResearchRunStatus,
  ResearchType,
  SessionUser,
  StrategyItemStatus,
  StrategyItemType,
} from "@/lib/types";
import { AI_ACTOR_ID, EXTERNAL_AI_ACTOR_ID } from "@/lib/domain/actors";

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
  if (userId === AI_ACTOR_ID) return "Knomera AI";
  if (userId === EXTERNAL_AI_ACTOR_ID) return "External AI";
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
  market_research: "Market research",
  behavioural: "Behavioural",
  commercial: "Commercial",
  bet_outcome: "Bet outcome",
  other: "Other",
};

export const EVIDENCE_CLASS_LABELS: Record<EvidenceClass, string> = {
  direct: "Direct evidence",
  secondary: "Secondary research",
  internal: "Internal reasoning",
};

export const DIRECTION_LABELS: Record<EvidenceDirection, string> = {
  supports: "Supports",
  challenges: "Challenges",
  neutral: "Neutral",
};

export const RESEARCH_TYPE_LABELS: Record<ResearchType, string> = {
  competitor: "Competitor research",
  market: "Market research",
  assumption: "Assumption research",
};

export const RESEARCH_RUN_STATUS_LABELS: Record<ResearchRunStatus, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  partial: "Partial",
  failed: "Failed",
};

/** Human label for research_runs.search_provider (diagnostics only). */
export function searchProviderLabel(providerId: string | null | undefined): string {
  if (!providerId) return "—";
  const known: Record<string, string> = {
    tavily: "Tavily",
    openai: "OpenAI",
    exa: "Exa",
  };
  return known[providerId] ?? providerId;
}

export const RESEARCH_FINDING_STATUS_LABELS: Record<
  ResearchFindingStatus,
  string
> = {
  pending: "Pending review",
  accepted: "Accepted",
  rejected: "Rejected",
  duplicate: "Duplicate",
};

export const STRATEGY_TYPE_LABELS: Record<StrategyItemType, string> = {
  north_star: "North star",
  positioning: "Positioning",
  target_customer: "Target customer",
  initial_wedge: "Initial wedge",
  principle: "Principle",
  vision: "Vision",
};

export const STRATEGY_STATUS_LABELS: Record<StrategyItemStatus, string> = {
  draft: "Draft",
  active: "Active",
  retired: "Retired",
};

export const PROBLEM_STATUS_LABELS: Record<ProblemStatus, string> = {
  observed: "Observed",
  validating: "Validating",
  validated: "Validated",
  deprioritised: "Deprioritised",
};

export const PROBLEM_RELATIONSHIP_LABELS: Record<
  ProblemAssumptionRelationship,
  string
> = {
  supports_problem: "Supports problem",
  depends_on: "Depends on",
  related: "Related",
};

export const ORGANISATION_TYPE_LABELS: Record<OrganisationType, string> = {
  prospect: "Prospect",
  customer: "Customer",
  partner: "Partner",
  competitor: "Competitor",
  other: "Other",
};

export const EVIDENCE_SOURCE_TYPE_LABELS: Record<EvidenceSourceType, string> = {
  link: "Link",
  free_text: "Other / free text",
};

export const EVIDENCE_SOURCE_KIND_LABELS: Record<
  EvidenceSourceKindFilter,
  string
> = {
  organisation: "Organisation",
  contact: "Contact",
  discovery: "Discovery",
  link: "Link",
  other: "Other",
  none: "No source",
};

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  active: "Active",
  superseded: "Superseded",
  revisiting: "Revisiting",
};

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  inbox: "Inbox",
  exploring: "Exploring",
  parked: "Parked",
  promoted: "Promoted",
  rejected: "Rejected",
};

export const BET_STATUS_LABELS: Record<BetStatus, string> = {
  proposed: "Proposed",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  abandoned: "Abandoned",
};

export const BET_RELATIONSHIP_LABELS: Record<BetAssumptionRelationship, string> =
  {
    depends_on: "Depends on",
    tests: "Tests",
    informed_by: "Informed by",
  };

export const BET_OUTCOME_RESULT_LABELS: Record<BetOutcomeResult, string> = {
  successful: "Successful",
  mixed: "Mixed",
  unsuccessful: "Unsuccessful",
  inconclusive: "Inconclusive",
};

export const OPPORTUNITY_STAGE_LABELS: Record<OpportunityStage, string> = {
  prospect: "Prospect",
  discovery: "Discovery",
  interested: "Interested",
  proposal: "Proposal",
  pilot: "Pilot",
  won: "Won",
  lost: "Lost",
};

export const FOCUS_STATUS_LABELS: Record<FocusItemStatus, string> = {
  planned: "Planned",
  active: "Active",
  done: "Done",
  dropped: "Dropped",
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
  severity: "Severity",
  status: "Status",
  stage: "Stage",
  owner: "Owner",
  decided_by: "Decided by",
  decision_date: "Decision date",
  revisit_date: "Revisit date",
  next_action: "Next action",
  next_action_date: "Next action date",
  target_date: "Target date",
};

export function formatHistoryValue(field: string, value: string | null): string {
  if (value == null || value === "") return "None";
  if (field === "confidence") return CONFIDENCE_LABELS[value as Confidence] ?? value;
  if (field === "importance" || field === "severity") {
    return IMPORTANCE_LABELS[value as Importance] ?? value;
  }
  if (field === "stage") {
    return OPPORTUNITY_STAGE_LABELS[value as OpportunityStage] ?? value;
  }
  if (field === "status") {
    return (
      STATUS_LABELS[value as AssumptionStatus] ??
      PROBLEM_STATUS_LABELS[value as ProblemStatus] ??
      DECISION_STATUS_LABELS[value as DecisionStatus] ??
      BET_STATUS_LABELS[value as BetStatus] ??
      value
    );
  }
  if (field === "owner" || field === "decided_by") {
    return displayName(value);
  }
  return value;
}
