import type {
  Confidence,
  ProblemAssumptionRelationship,
  ProblemSeverity,
  ProblemStatus,
} from "@/lib/types";

export type SeedProblemLink = {
  seedKey: string;
  relationship: ProblemAssumptionRelationship;
};

export type SeedProblem = {
  seedKey: string;
  title: string;
  description: string;
  status: ProblemStatus;
  severity: ProblemSeverity;
  confidence: Confidence;
  targetCustomer: string;
  /** @deprecated Prefer assumptionLinks. Kept for stage2 supports_problem lists. */
  assumptionSeedKeys?: string[];
  assumptionLinks: SeedProblemLink[];
};

function links(
  supports: string[],
  related: string[] = [],
): SeedProblemLink[] {
  return [
    ...supports.map((seedKey) => ({
      seedKey,
      relationship: "supports_problem" as const,
    })),
    ...related.map((seedKey) => ({
      seedKey,
      relationship: "related" as const,
    })),
  ];
}

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
    assumptionLinks: links([
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
    ]),
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
    assumptionLinks: links([
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
    ]),
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
    assumptionLinks: links([
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
    ]),
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
    assumptionLinks: links(
      ["a011", "a012", "a057", "a058", "a059", "a060", "a061", "a065"],
      ["a063", "a069", "a066"],
    ),
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
    assumptionLinks: links(
      ["a014", "a015", "a071", "a101", "a105"],
      ["a070", "a073", "a075", "a103"],
    ),
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
    assumptionLinks: links(["a013", "a062", "a060"], ["a073"]),
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
    assumptionLinks: links(["a010", "a019", "a021", "a076", "a077", "a102"]),
  },
  {
    seedKey: "p008",
    title: "Teams struggle to decide what to learn next",
    description:
      "Experimentation teams can generate large backlogs of potential tests, but often lack a systematic way to identify which unanswered question would create the most valuable new information.",
    status: "validating",
    severity: "critical",
    confidence: "medium",
    targetCustomer:
      "Mature experimentation teams with substantial experiment backlogs, competing priorities and enough traffic to have genuine choices about what to investigate.",
    assumptionLinks: links(
      ["a005", "a113"],
      ["a024", "a056", "a062", "a071", "a073", "a074", "a121", "a122"],
    ),
  },
  {
    seedKey: "p009",
    title: "Experiment ideation is disconnected from accumulated learning",
    description:
      "New experiments are often generated from stakeholder requests, heuristics, competitor copying or generic ideation rather than being deliberately derived from what previous experiments and customer evidence have already taught the organisation.",
    status: "validating",
    severity: "critical",
    confidence: "medium",
    targetCustomer:
      "Established experimentation programmes with meaningful experiment history and regular demand for new test ideas.",
    assumptionLinks: links(
      ["a012", "a058", "a114"],
      [
        "a059",
        "a060",
        "a062",
        "a063",
        "a069",
        "a070",
        "a071",
        "a073",
        "a119",
        "a120",
      ],
    ),
  },
  {
    seedKey: "p010",
    title: "Experiment programmes fail to compound learning",
    description:
      "Experiment results frequently remain isolated outcomes. One result does not systematically create the next question, hypothesis or investigation, so experimentation knowledge grows as a collection of tests rather than as a self-improving learning loop.",
    status: "validating",
    severity: "critical",
    confidence: "medium",
    targetCustomer:
      "Mature experimentation programmes with multi-year test history and recurring experimentation activity.",
    assumptionLinks: links(
      ["a011", "a012", "a057", "a058", "a115"],
      ["a060", "a061", "a062", "a065", "a105", "a119", "a120"],
    ),
  },
  {
    seedKey: "p011",
    title: "Experiment knowledge gaps are hard to see",
    description:
      "Experiment repositories can show what has been tested, but teams struggle to identify which important questions remain unanswered, weakly evidenced or contradicted by different pieces of evidence.",
    status: "validating",
    severity: "high",
    confidence: "medium",
    targetCustomer:
      "Experimentation and product teams with enough accumulated research and experiment history that understanding what is still unknown becomes difficult.",
    assumptionLinks: links(
      ["a057", "a058", "a116"],
      ["a061", "a062", "a069", "a117", "a118"],
    ),
  },
];

/** Supports-only seed keys for stage2 backwards compatibility. */
export function supportsSeedKeys(problem: SeedProblem): string[] {
  if (problem.assumptionSeedKeys) return problem.assumptionSeedKeys;
  return problem.assumptionLinks
    .filter((link) => link.relationship === "supports_problem")
    .map((link) => link.seedKey);
}
