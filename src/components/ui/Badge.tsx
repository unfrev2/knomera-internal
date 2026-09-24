import {
  BET_STATUS_LABELS,
  CONFIDENCE_LABELS,
  DECISION_STATUS_LABELS,
  DIRECTION_LABELS,
  IDEA_STATUS_LABELS,
  IMPORTANCE_LABELS,
  OPPORTUNITY_STAGE_LABELS,
  PROBLEM_STATUS_LABELS,
  STATUS_LABELS,
} from "@/lib/labels";
import type {
  AssumptionStatus,
  BetStatus,
  Confidence,
  DecisionStatus,
  EvidenceDirection,
  IdeaStatus,
  Importance,
  OpportunityStage,
  ProblemStatus,
} from "@/lib/types";
import type { ReactNode } from "react";

type DomainBadgeProps =
  | { variant: "importance"; value: Importance }
  | { variant: "confidence"; value: Confidence }
  | { variant: "status"; value: AssumptionStatus }
  | { variant: "problem-status"; value: ProblemStatus }
  | { variant: "decision-status"; value: DecisionStatus }
  | { variant: "idea-status"; value: IdeaStatus }
  | { variant: "bet-status"; value: BetStatus }
  | { variant: "opportunity-stage"; value: OpportunityStage }
  | { variant: "direction"; value: EvidenceDirection }
  | { variant: "neutral"; label: string };

export type BadgeProps = DomainBadgeProps & {
  className?: string;
  children?: ReactNode;
};

function importanceTone(value: Importance): string {
  switch (value) {
    case "critical":
      return "bg-[#f15b4a]/12 text-[#0b1f3a] ring-1 ring-[#f15b4a]/25";
    case "high":
      return "bg-[#315f9e]/10 text-[#0b1f3a] ring-1 ring-[#315f9e]/20";
    case "medium":
      return "bg-[#0b1f3a]/6 text-[#0b1f3a]/85 ring-1 ring-[#0b1f3a]/10";
    case "low":
      return "bg-[#efece6] text-[#0b1f3a]/70 ring-1 ring-[#0b1f3a]/8";
  }
}

function confidenceTone(value: Confidence): string {
  switch (value) {
    case "proven":
      return "bg-[#315f9e]/15 text-[#0b1f3a] ring-1 ring-[#315f9e]/25";
    case "high":
      return "bg-[#315f9e]/10 text-[#0b1f3a] ring-1 ring-[#315f9e]/15";
    case "medium":
      return "bg-[#0b1f3a]/6 text-[#0b1f3a]/85 ring-1 ring-[#0b1f3a]/10";
    case "low":
      return "bg-[#f15b4a]/10 text-[#0b1f3a] ring-1 ring-[#f15b4a]/20";
  }
}

function statusTone(value: AssumptionStatus): string {
  switch (value) {
    case "disproved":
      return "bg-[#f15b4a]/12 text-[#0b1f3a] ring-1 ring-[#f15b4a]/25";
    case "challenged":
      return "bg-[#f15b4a]/8 text-[#0b1f3a]/90 ring-1 ring-[#f15b4a]/15";
    case "testing":
      return "bg-[#315f9e]/12 text-[#0b1f3a] ring-1 ring-[#315f9e]/20";
    case "supported":
      return "bg-[#315f9e]/8 text-[#0b1f3a]/90 ring-1 ring-[#315f9e]/15";
    case "untested":
      return "bg-[#efece6] text-[#0b1f3a]/75 ring-1 ring-[#0b1f3a]/8";
  }
}

function problemStatusTone(value: ProblemStatus): string {
  switch (value) {
    case "validated":
      return "bg-[#315f9e]/12 text-[#0b1f3a] ring-1 ring-[#315f9e]/20";
    case "validating":
      return "bg-[#315f9e]/8 text-[#0b1f3a]/90 ring-1 ring-[#315f9e]/15";
    case "deprioritised":
      return "bg-[#efece6] text-[#0b1f3a]/70 ring-1 ring-[#0b1f3a]/8";
    case "observed":
      return "bg-[#0b1f3a]/6 text-[#0b1f3a]/85 ring-1 ring-[#0b1f3a]/10";
  }
}

function decisionStatusTone(value: DecisionStatus): string {
  switch (value) {
    case "active":
      return "bg-[#315f9e]/12 text-[#0b1f3a] ring-1 ring-[#315f9e]/20";
    case "revisiting":
      return "bg-[#f15b4a]/10 text-[#0b1f3a] ring-1 ring-[#f15b4a]/20";
    case "superseded":
      return "bg-[#efece6] text-[#0b1f3a]/70 ring-1 ring-[#0b1f3a]/8";
  }
}

function ideaStatusTone(value: IdeaStatus): string {
  switch (value) {
    case "promoted":
      return "bg-[#315f9e]/12 text-[#0b1f3a] ring-1 ring-[#315f9e]/20";
    case "exploring":
      return "bg-[#315f9e]/8 text-[#0b1f3a]/90 ring-1 ring-[#315f9e]/15";
    case "rejected":
      return "bg-[#f15b4a]/10 text-[#0b1f3a] ring-1 ring-[#f15b4a]/20";
    case "parked":
      return "bg-[#efece6] text-[#0b1f3a]/70 ring-1 ring-[#0b1f3a]/8";
    case "inbox":
      return "bg-[#0b1f3a]/6 text-[#0b1f3a]/85 ring-1 ring-[#0b1f3a]/10";
  }
}

function betStatusTone(value: BetStatus): string {
  switch (value) {
    case "active":
      return "bg-[#315f9e]/12 text-[#0b1f3a] ring-1 ring-[#315f9e]/20";
    case "completed":
      return "bg-[#315f9e]/8 text-[#0b1f3a]/90 ring-1 ring-[#315f9e]/15";
    case "paused":
      return "bg-[#efece6] text-[#0b1f3a]/70 ring-1 ring-[#0b1f3a]/8";
    case "abandoned":
      return "bg-[#f15b4a]/10 text-[#0b1f3a] ring-1 ring-[#f15b4a]/20";
    case "proposed":
      return "bg-[#0b1f3a]/6 text-[#0b1f3a]/85 ring-1 ring-[#0b1f3a]/10";
  }
}

function opportunityStageTone(value: OpportunityStage): string {
  switch (value) {
    case "won":
      return "bg-[#315f9e]/12 text-[#0b1f3a] ring-1 ring-[#315f9e]/20";
    case "pilot":
    case "proposal":
      return "bg-[#315f9e]/8 text-[#0b1f3a]/90 ring-1 ring-[#315f9e]/15";
    case "interested":
    case "discovery":
      return "bg-[#0b1f3a]/6 text-[#0b1f3a]/85 ring-1 ring-[#0b1f3a]/10";
    case "lost":
      return "bg-[#f15b4a]/10 text-[#0b1f3a] ring-1 ring-[#f15b4a]/20";
    case "prospect":
      return "bg-[#efece6] text-[#0b1f3a]/70 ring-1 ring-[#0b1f3a]/8";
  }
}

function directionTone(value: EvidenceDirection): string {
  switch (value) {
    case "supports":
      return "bg-[#315f9e]/10 text-[#0b1f3a] ring-1 ring-[#315f9e]/20";
    case "challenges":
      return "bg-[#f15b4a]/10 text-[#0b1f3a] ring-1 ring-[#f15b4a]/20";
    case "neutral":
      return "bg-[#0b1f3a]/6 text-[#0b1f3a]/80 ring-1 ring-[#0b1f3a]/10";
  }
}

function labelFor(props: DomainBadgeProps): string {
  switch (props.variant) {
    case "importance":
      return IMPORTANCE_LABELS[props.value];
    case "confidence":
      return CONFIDENCE_LABELS[props.value];
    case "status":
      return STATUS_LABELS[props.value];
    case "problem-status":
      return PROBLEM_STATUS_LABELS[props.value];
    case "decision-status":
      return DECISION_STATUS_LABELS[props.value];
    case "idea-status":
      return IDEA_STATUS_LABELS[props.value];
    case "bet-status":
      return BET_STATUS_LABELS[props.value];
    case "opportunity-stage":
      return OPPORTUNITY_STAGE_LABELS[props.value];
    case "direction":
      return DIRECTION_LABELS[props.value];
    case "neutral":
      return props.label;
  }
}

function toneFor(props: DomainBadgeProps): string {
  switch (props.variant) {
    case "importance":
      return importanceTone(props.value);
    case "confidence":
      return confidenceTone(props.value);
    case "status":
      return statusTone(props.value);
    case "problem-status":
      return problemStatusTone(props.value);
    case "decision-status":
      return decisionStatusTone(props.value);
    case "idea-status":
      return ideaStatusTone(props.value);
    case "bet-status":
      return betStatusTone(props.value);
    case "opportunity-stage":
      return opportunityStageTone(props.value);
    case "direction":
      return directionTone(props.value);
    case "neutral":
      return "bg-[#efece6] text-[#0b1f3a]/80 ring-1 ring-[#0b1f3a]/8";
  }
}

export function Badge(props: BadgeProps) {
  const { className = "", children } = props;
  const text = children ?? labelFor(props);

  return (
    <span
      className={[
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium leading-tight",
        toneFor(props),
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {text}
    </span>
  );
}
