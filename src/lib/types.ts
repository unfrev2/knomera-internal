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

export type Importance = (typeof IMPORTANCE_LEVELS)[number];
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];
export type AssumptionStatus = (typeof ASSUMPTION_STATUSES)[number];
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];
export type EvidenceDirection = (typeof EVIDENCE_DIRECTIONS)[number];

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

export type SessionUser = {
  id: AppUserId;
  displayName: string;
  workspaceSlug: string;
};
