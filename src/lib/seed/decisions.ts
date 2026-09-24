export type SeedDecision = {
  title: string;
  decision: string;
  context: string;
  rationale: string;
  decisionDate: string;
  revisitTrigger: string;
  problemSeedKeys: string[];
  assumptionSeedKeys: string[];
  betSeedKeys: string[];
};

export const SEED_DECISIONS: SeedDecision[] = [
  {
    title: "Keep experimentation capacity as the initial wedge",
    decision:
      "Continue using experimentation capacity intelligence as Knomera's initial product and commercial wedge while treating proactive experimentation intelligence as the broader product destination.",
    context:
      "Knomera's broader opportunity spans business knowledge, experiment planning, recommendations and orchestration. A narrower starting point is still needed to make customer discovery, product development and an early commercial proposition concrete.",
    rationale:
      "Capacity is a specific operational problem with measurable consequences, aligns with existing founder expertise and naturally requires Knomera to understand traffic, surfaces, audiences and competing experiments. That context is also useful to the later proactive recommendation layer.",
    decisionDate: "2026-09-24",
    revisitTrigger:
      "Revisit if customer discovery shows that experimentation capacity is not sufficiently painful or valuable, or if another Knomera problem repeatedly produces materially stronger customer pull and a clearer route to a paid pilot.",
    problemSeedKeys: ["p001", "p002", "p003", "p008"],
    assumptionSeedKeys: ["a009", "a027", "a038", "a086", "a121"],
    betSeedKeys: ["b002", "b004"],
  },
  {
    title: "Build towards a proactive experimentation coworker",
    decision:
      "Treat proactive, evidence-grounded guidance about what a business should learn or test next as the long-term Knomera product direction rather than building only a passive experiment repository, dashboard or capacity-planning tool.",
    context:
      "Knomera is being designed to understand more of the customer's business than an individual experimentation platform. That context becomes significantly more valuable if the product can use accumulated knowledge to identify gaps, propose the next useful question and explain the evidence behind the recommendation.",
    rationale:
      "A closed learning loop connects Knomera's knowledge, AI, capacity, interaction and scheduling capabilities into one coherent product. It also provides a stronger differentiation from generic AI test generation because recommendations can be grounded in company-specific evidence and become executable through Knomera's planning layer.",
    decisionDate: "2026-09-24",
    revisitTrigger:
      "Revisit if practitioner testing shows that proactive recommendations are not sufficiently useful or trusted, company-specific context does not materially improve recommendation quality, or customers consistently prefer Knomera as a purely reactive planning and knowledge tool.",
    problemSeedKeys: ["p005", "p008", "p009", "p010", "p011"],
    assumptionSeedKeys: [
      "a024",
      "a056",
      "a061",
      "a062",
      "a070",
      "a071",
      "a073",
      "a075",
      "a117",
      "a119",
      "a120",
      "a121",
      "a122",
    ],
    betSeedKeys: ["b001", "b004"],
  },
];
