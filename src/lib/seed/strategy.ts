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
      "Knomera becomes the intelligence and orchestration layer that understands a company's experimentation programme across platforms, traffic, journeys, constraints, historical experiments and accumulated learning.",
    sortOrder: 20,
  },
  {
    seedKey: "s_wedge",
    type: "initial_wedge",
    title: "Initial wedge",
    content:
      "Experimentation capacity intelligence: help teams understand what can run, where, for how long and alongside what.",
    sortOrder: 30,
  },
];
