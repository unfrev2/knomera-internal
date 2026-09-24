import type { IdeaStatus } from "@/lib/types";

export type SeedIdea = {
  seedKey: string;
  title: string;
  description: string;
  status: IdeaStatus;
  problemSeedKeys: string[];
  assumptionSeedKeys: string[];
};

export const SEED_IDEAS: SeedIdea[] = [
  {
    seedKey: "i001",
    title: "Evidence-grounded test recommendations",
    status: "exploring",
    description:
      "Use accumulated company context, experiment history and learning to proactively suggest hypotheses and tests that would generate valuable new information. Every suggestion should explain why it exists and show the evidence or knowledge gap behind it rather than behaving like a generic AI test-idea generator.",
    problemSeedKeys: ["p008", "p009", "p010"],
    assumptionSeedKeys: [
      "a024",
      "a056",
      "a071",
      "a073",
      "a119",
      "a120",
      "a121",
      "a122",
    ],
  },
  {
    seedKey: "i002",
    title: "Knowledge gap detection",
    status: "exploring",
    description:
      "Analyse the organisation's accumulated assumptions, evidence and experimentation knowledge to identify important questions that remain unanswered, weakly evidenced or contradicted by different findings.",
    problemSeedKeys: ["p010", "p011"],
    assumptionSeedKeys: ["a061", "a062", "a069", "a116", "a117"],
  },
  {
    seedKey: "i003",
    title: "Redundant test detection",
    status: "exploring",
    description:
      "Identify when a proposed experiment is unlikely to create meaningful new information because substantially similar questions have already been answered. Knomera should be capable of recommending that a team does not run another test.",
    problemSeedKeys: ["p004", "p009", "p011"],
    assumptionSeedKeys: ["a012", "a069", "a118"],
  },
  {
    seedKey: "i004",
    title: "First-class learning layer",
    status: "exploring",
    description:
      "Represent reusable organisational learnings separately from individual experiment results or evidence. Multiple pieces of evidence should eventually be capable of strengthening or challenging one learning, which can then influence future recommendations.",
    problemSeedKeys: ["p004", "p009", "p010"],
    assumptionSeedKeys: ["a059", "a060", "a061", "a063", "a065"],
  },
  {
    seedKey: "i005",
    title: "Recommendation to executable experiment",
    status: "exploring",
    description:
      'Connect a recommended hypothesis to Knomera\'s capacity, interaction and scheduling capabilities so that the product can eventually move from "this is worth testing" to "this is worth testing next, here is where it can run, how long it is likely to take and what it can safely run alongside."',
    problemSeedKeys: ["p008", "p001", "p002", "p003"],
    assumptionSeedKeys: ["a036", "a045", "a053", "a056", "a071"],
  },
];
