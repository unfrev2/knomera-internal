import type { Confidence, ProblemSeverity, ProblemStatus } from "@/lib/types";

export type SeedProblem = {
  seedKey: string;
  title: string;
  description: string;
  status: ProblemStatus;
  severity: ProblemSeverity;
  confidence: Confidence;
  targetCustomer: string;
  /** Existing assumption seed_keys to link (supports_problem). */
  assumptionSeedKeys: string[];
};

export const SEED_PROBLEMS: SeedProblem[] = [
  {
    seedKey: "p001",
    title: "Experiment capacity is opaque",
    description:
      "Teams struggle to understand how much experimentation they can safely run and where capacity exists.",
    status: "validating",
    severity: "critical",
    confidence: "medium",
    targetCustomer:
      "Experimentation and growth teams at mid-market to enterprise companies running multi-surface programmes.",
    assumptionSeedKeys: [
      "a001",
      "a002",
      "a009",
      "a028",
      "a029",
      "a032",
      "a035",
      "a036",
      "a037",
      "a038",
    ],
  },
  {
    seedKey: "p002",
    title: "Experiment roadmaps are difficult to schedule",
    description:
      "Expected duration, traffic constraints, dependencies and priorities make manual experiment scheduling difficult.",
    status: "validating",
    severity: "high",
    confidence: "medium",
    targetCustomer:
      "Experimentation leads and product managers responsible for quarterly roadmaps.",
    assumptionSeedKeys: [
      "a003",
      "a004",
      "a049",
      "a050",
      "a051",
      "a052",
      "a053",
      "a054",
      "a055",
      "a056",
    ],
  },
  {
    seedKey: "p003",
    title: "Parallel testing decisions are poorly supported",
    description:
      "Teams either unnecessarily serialise experiments or accept interaction risk without a consistent framework.",
    status: "observed",
    severity: "high",
    confidence: "medium",
    targetCustomer:
      "Teams running concurrent tests across overlapping journeys or audiences.",
    assumptionSeedKeys: [
      "a006",
      "a007",
      "a008",
      "a039",
      "a040",
      "a041",
      "a045",
      "a046",
      "a047",
      "a048",
    ],
  },
  {
    seedKey: "p004",
    title: "Experiment knowledge decays",
    description:
      "Results are stored, but reusable learning becomes fragmented and difficult to retrieve.",
    status: "observed",
    severity: "high",
    confidence: "medium",
    targetCustomer:
      "Organisations with multi-year experimentation history and rotating team membership.",
    assumptionSeedKeys: [
      "a011",
      "a012",
      "a057",
      "a058",
      "a059",
      "a060",
      "a061",
      "a065",
    ],
  },
  {
    seedKey: "p005",
    title: "Experimentation tools lack business context",
    description:
      "Individual platforms understand the experiments they run but not enough of the wider organisation to make portfolio-level decisions.",
    status: "validating",
    severity: "critical",
    confidence: "medium",
    targetCustomer:
      "Companies whose experimentation stack spans vendors without a shared operating layer.",
    assumptionSeedKeys: ["a014", "a015", "a071", "a101", "a105"],
  },
  {
    seedKey: "p006",
    title: "Experiment evidence is disconnected from decisions",
    description:
      "Organisations struggle to trace product and business decisions back to the evidence that informed them.",
    status: "observed",
    severity: "medium",
    confidence: "low",
    targetCustomer:
      "Leadership and product teams who need auditability of why bets were made.",
    assumptionSeedKeys: ["a013", "a062", "a060"],
  },
  {
    seedKey: "p007",
    title: "Multi-platform experimentation creates fragmented planning",
    description:
      "Web, app, checkout and server-side experimentation often operate across separate tools and datasets.",
    status: "observed",
    severity: "high",
    confidence: "medium",
    targetCustomer:
      "Companies running experimentation across multiple platforms and channels.",
    assumptionSeedKeys: ["a010", "a019", "a021", "a076", "a077", "a102"],
  },
];
