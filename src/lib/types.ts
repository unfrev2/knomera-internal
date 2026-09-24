export const IMPORTANCE_LEVELS = [
  "critical",
  "high",
  "medium",
  "low",
] as const;

export const CONFIDENCE_LEVELS = [
  "low",
  "medium",
  "high",
  "proven",
] as const;

export const ASSUMPTION_STATUSES = [
  "untested",
  "testing",
  "supported",
  "challenged",
  "disproved",
] as const;

export const EVIDENCE_TYPES = [
  "founder_reasoning",
  "customer_interview",
  "data_analysis",
  "prototype",
  "competitor_research",
  "behavioural",
  "commercial",
  "other",
] as const;

export const EVIDENCE_DIRECTIONS = [
  "supports",
  "challenges",
  "neutral",
] as const;

export const STRATEGY_ITEM_TYPES = [
  "north_star",
  "positioning",
  "target_customer",
  "initial_wedge",
  "principle",
  "vision",
] as const;

export const STRATEGY_ITEM_STATUSES = [
  "draft",
  "active",
  "retired",
] as const;

export const PROBLEM_STATUSES = [
  "observed",
  "validating",
  "validated",
  "deprioritised",
] as const;

export const PROBLEM_ASSUMPTION_RELATIONSHIPS = [
  "supports_problem",
  "depends_on",
  "related",
] as const;

export type Importance = (typeof IMPORTANCE_LEVELS)[number];
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];
export type AssumptionStatus = (typeof ASSUMPTION_STATUSES)[number];
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];
export type EvidenceDirection = (typeof EVIDENCE_DIRECTIONS)[number];
export type StrategyItemType = (typeof STRATEGY_ITEM_TYPES)[number];
export type StrategyItemStatus = (typeof STRATEGY_ITEM_STATUSES)[number];
export type ProblemStatus = (typeof PROBLEM_STATUSES)[number];
export type ProblemAssumptionRelationship =
  (typeof PROBLEM_ASSUMPTION_RELATIONSHIPS)[number];
/** Problem severity reuses the importance vocabulary. */
export type ProblemSeverity = Importance;

export type AppUserId = "jon" | "ahmed";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type Assumption = {
  id: string;
  workspace_id: string;
  seed_key: string | null;
  statement: string;
  description: string | null;
  category: string;
  importance: Importance;
  confidence: Confidence;
  status: AssumptionStatus;
  owner: string | null;
  next_action: string | null;
  target_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  evidence_count?: number;
};

export type Evidence = {
  id: string;
  workspace_id: string;
  assumption_id: string;
  title: string;
  description: string | null;
  evidence_type: EvidenceType;
  strength: number;
  direction: EvidenceDirection;
  source: string | null;
  evidence_date: string;
  created_by: string | null;
  created_at: string;
  assumption_statement?: string;
};

export type AssumptionHistory = {
  id: string;
  workspace_id: string;
  assumption_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
};

export type StrategyItem = {
  id: string;
  workspace_id: string;
  seed_key: string | null;
  type: StrategyItemType;
  title: string;
  content: string;
  status: StrategyItemStatus;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Problem = {
  id: string;
  workspace_id: string;
  seed_key: string | null;
  title: string;
  description: string | null;
  status: ProblemStatus;
  severity: ProblemSeverity;
  confidence: Confidence;
  target_customer: string | null;
  owner: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  linked_assumption_count?: number;
  evidence_count?: number;
};

export type ProblemAssumptionLink = {
  problem_id: string;
  assumption_id: string;
  workspace_id: string;
  relationship_type: ProblemAssumptionRelationship;
  created_at: string;
  created_by: string | null;
  assumption_statement?: string;
  assumption_confidence?: Confidence;
  assumption_importance?: Importance;
  assumption_status?: AssumptionStatus;
};

export type SessionUser = {
  id: AppUserId;
  displayName: string;
  workspaceSlug: string;
};
