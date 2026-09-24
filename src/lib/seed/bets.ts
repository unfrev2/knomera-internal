import type {
  BetAssumptionRelationship,
  BetStatus,
} from "@/lib/types";

export type SeedBet = {
  seedKey: string;
  title: string;
  description: string | null;
  hypothesis: string;
  status: BetStatus;
  successCriteria: string | null;
  expectedOutcome: string | null;
  problemSeedKeys: string[];
  /** Exact assumption links after proactive content revision. */
  assumptionLinks: {
    seedKey: string;
    relationship: BetAssumptionRelationship;
  }[];
  /** Assumption seed keys that must NOT remain linked to this bet. */
  removeAssumptionSeedKeys?: string[];
};

export const SEED_BETS: SeedBet[] = [
  {
    seedKey: "b001",
    title: "Build and use the internal Knomera learning system",
    description:
      "Use Knomera itself as the structured environment for company strategy, problems, assumptions, evidence, decisions, ideas, bets and outcomes, and use that internal experience to learn which knowledge structures are valuable in the future customer product.",
    hypothesis:
      "A structured belief, evidence and decision model will improve how the founders validate Knomera while exposing useful product primitives for a future evidence-to-learning-to-recommendation loop.",
    status: "active",
    successCriteria:
      "Jon and Ahmed actively use the system to record and connect problems, assumptions, evidence, decisions and bets; the system changes how important company questions are prioritised; and internal usage generates concrete learning about the future Knomera knowledge model.",
    expectedOutcome:
      "Better founder decision-making and a living reference model for how Knomera could represent business knowledge, evidence and future proactive recommendations.",
    problemSeedKeys: ["p004", "p006", "p010"],
    removeAssumptionSeedKeys: ["a001", "a009"],
    assumptionLinks: [
      { seedKey: "a061", relationship: "tests" },
      { seedKey: "a062", relationship: "tests" },
      { seedKey: "a059", relationship: "informed_by" },
      { seedKey: "a060", relationship: "informed_by" },
      { seedKey: "a073", relationship: "informed_by" },
    ],
  },
  {
    seedKey: "b002",
    title: "Validate experimentation capacity as the initial wedge",
    description:
      "Focus early discovery and product framing on experimentation capacity as Knomera's initial wedge while testing whether it is a sufficiently painful and valuable entry point into the broader experimentation intelligence opportunity.",
    hypothesis:
      "Experimentation capacity is painful and commercially valuable enough to provide a focused initial entry point for Knomera, while also creating the operational context required by the broader proactive product.",
    status: "active",
    successCriteria:
      "Repeated discovery signal that capacity opacity is acute and worth paying to solve.",
    expectedOutcome:
      "Confidence to keep capacity intelligence as the wedge — or clear evidence to change course.",
    problemSeedKeys: ["p001", "p002", "p003"],
    assumptionLinks: [
      { seedKey: "a001", relationship: "tests" },
      { seedKey: "a002", relationship: "tests" },
      { seedKey: "a028", relationship: "depends_on" },
      { seedKey: "a009", relationship: "tests" },
      { seedKey: "a038", relationship: "tests" },
      { seedKey: "a027", relationship: "tests" },
    ],
  },
  {
    seedKey: "b003",
    title: "Secure a paid early customer",
    description:
      "Deliver enough value before full SaaS automation to earn meaningful early commercial revenue.",
    hypothesis:
      "Knomera can deliver enough value before full SaaS automation to secure meaningful early commercial revenue.",
    status: "proposed",
    successCriteria:
      "At least one paid early customer with a clear reason to renew or expand.",
    expectedOutcome:
      "Commercial proof that the problem is valuable enough to pay for.",
    problemSeedKeys: ["p001"],
    removeAssumptionSeedKeys: ["a032"],
    assumptionLinks: [
      { seedKey: "a009", relationship: "tests" },
      { seedKey: "a086", relationship: "tests" },
      { seedKey: "a087", relationship: "tests" },
      { seedKey: "a094", relationship: "tests" },
      { seedKey: "a016", relationship: "informed_by" },
      { seedKey: "a020", relationship: "informed_by" },
      { seedKey: "a027", relationship: "depends_on" },
    ],
  },
  {
    seedKey: "b004",
    title: "Validate the proactive experimentation coworker",
    description:
      "Test whether Knomera can use accumulated business context and experimentation knowledge to proactively identify what an organisation should learn next and propose useful, evidence-grounded hypotheses rather than waiting for users to search for answers.",
    hypothesis:
      "Mature experimentation teams will find evidence-grounded recommendations about what to learn or test next materially more useful than passive dashboards, searchable repositories or generic AI-generated test ideas.",
    status: "proposed",
    successCriteria:
      "Experienced experimentation practitioners consistently judge Knomera recommendations as relevant and well grounded, can understand why each recommendation was made, and choose to pursue or investigate a meaningful proportion of them. At least one qualified prospect identifies the proactive recommendation capability as a meaningful reason to trial or buy Knomera.",
    expectedOutcome:
      "Clear evidence about whether proactive learning and recommendation should become the long-term centre of the Knomera product, and which information Knomera needs in order to make recommendations practitioners trust.",
    problemSeedKeys: ["p008", "p009", "p010", "p011", "p005"],
    assumptionLinks: [
      { seedKey: "a024", relationship: "tests" },
      { seedKey: "a056", relationship: "tests" },
      { seedKey: "a117", relationship: "tests" },
      { seedKey: "a119", relationship: "tests" },
      { seedKey: "a120", relationship: "tests" },
      { seedKey: "a121", relationship: "tests" },
      { seedKey: "a122", relationship: "tests" },
      { seedKey: "a071", relationship: "depends_on" },
      { seedKey: "a073", relationship: "depends_on" },
      { seedKey: "a070", relationship: "informed_by" },
      { seedKey: "a074", relationship: "informed_by" },
      { seedKey: "a075", relationship: "informed_by" },
      { seedKey: "a105", relationship: "informed_by" },
    ],
  },
];
