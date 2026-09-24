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
  /** Problem seed_keys to link. */
  problemSeedKeys: string[];
  /** Assumption links with relationship type. */
  assumptionLinks: {
    seedKey: string;
    relationship: BetAssumptionRelationship;
  }[];
};

export const SEED_BETS: SeedBet[] = [
  {
    seedKey: "b001",
    title: "Build the internal Knomera evidence system",
    description:
      "Use Knomera itself as the first structured assumption/evidence/decision environment.",
    hypothesis:
      "A structured assumption/evidence/decision model will improve how the founders validate the business and will generate useful learning for the future Knomera product model.",
    status: "active",
    successCriteria:
      "Founders actively use the system to record assumptions, evidence, and decisions; learning feeds product thinking.",
    expectedOutcome:
      "Clearer validation habits and a living reference model for the product.",
    problemSeedKeys: [],
    assumptionLinks: [
      { seedKey: "a001", relationship: "informed_by" },
      { seedKey: "a009", relationship: "informed_by" },
    ],
  },
  {
    seedKey: "b002",
    title: "Validate experimentation capacity as the initial wedge",
    description:
      "Focus early discovery and product framing on experimentation capacity opacity.",
    hypothesis:
      "Experimentation capacity is painful and valuable enough to provide a focused entry point for Knomera.",
    status: "active",
    successCriteria:
      "Repeated discovery signal that capacity opacity is acute and worth paying to solve.",
    expectedOutcome:
      "Confidence to keep capacity intelligence as the wedge — or clear evidence to change course.",
    problemSeedKeys: ["p001"],
    assumptionLinks: [
      { seedKey: "a001", relationship: "tests" },
      { seedKey: "a002", relationship: "tests" },
      { seedKey: "a028", relationship: "depends_on" },
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
    problemSeedKeys: ["p001", "p002"],
    assumptionLinks: [
      { seedKey: "a009", relationship: "tests" },
      { seedKey: "a032", relationship: "depends_on" },
    ],
  },
];
