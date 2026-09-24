import type { StrategyItemType } from "@/lib/types";

export type SeedStrategyItem = {
  seedKey: string;
  type: StrategyItemType;
  title: string;
  content: string;
  sortOrder: number;
};

export const SEED_STRATEGY_ITEMS: SeedStrategyItem[] = [
  {
    seedKey: "s_positioning",
    type: "positioning",
    title: "Positioning",
    content:
      "Your experimentation platform knows your experiments. We know your business.",
    sortOrder: 10,
  },
  {
    seedKey: "s_vision",
    type: "vision",
    title: "Vision",
    content:
      "Knomera becomes the proactive intelligence and orchestration layer for experimentation. It understands a company's business context, experimentation history, accumulated learning, traffic, journeys and constraints; identifies what the organisation still needs to learn; recommends what is worth testing next and why; and helps turn those recommendations into executable experimentation plans.",
    sortOrder: 20,
  },
  {
    seedKey: "s_wedge",
    type: "initial_wedge",
    title: "Initial wedge",
    content:
      "Experimentation capacity intelligence remains Knomera's initial wedge: help teams understand what can run, where, for how long and alongside what. It solves a concrete operational problem while building the business context required for Knomera's broader proactive recommendation layer.",
    sortOrder: 30,
  },
  {
    seedKey: "s_target_customer",
    type: "target_customer",
    title: "Initial target customer hypothesis",
    content:
      "Mature experimentation organisations running substantial test volumes, ideally across multiple teams, surfaces or experimentation platforms. Heads of Experimentation and CRO are likely initial champions, with product leadership or a more senior business leader potentially holding budget. Organisations running roughly 50 or more experiments per year are the initial customer hypothesis rather than a proven threshold.",
    sortOrder: 40,
  },
  {
    seedKey: "s_proactive",
    type: "principle",
    title: "Proactive, not passive",
    content:
      "Knomera should use what a business has already learned to identify what is worth learning next. It should surface important knowledge gaps, contradictions and evidence-grounded recommendations rather than waiting for users to search a repository or ask the right question.",
    sortOrder: 50,
  },
  {
    seedKey: "s_evidence_grounded",
    type: "principle",
    title: "Evidence before suggestion",
    content:
      "Knomera should not behave like a generic AI test-idea generator. Recommendations should be grounded in the customer's business context and accumulated evidence, show why they are being suggested, identify the source knowledge behind them and remain subject to human judgement.",
    sortOrder: 60,
  },
  {
    seedKey: "s_north_star",
    type: "north_star",
    title: "Business North Star",
    content: "Annual recurring revenue (ARR)",
    sortOrder: 70,
  },
];
