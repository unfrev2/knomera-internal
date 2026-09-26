/**
 * Latency benchmark for Stage 2 evidence matching.
 * Runs ≥20 representative examples and reports median/slowest by path.
 *
 * Usage: npm run bench:matching
 */
import { getWorkspaceBySlug } from "../src/lib/db/workspaces";
import { matchEvidenceToAssumptions } from "../src/lib/domain/evidence-matching";
import { isOpenAiConfigured } from "../src/lib/ai/config";

type PathKey = "deterministic" | "fast" | "reasoning";

type Sample = {
  label: string;
  text: string;
  forceReasoning?: boolean;
  expectPath?: PathKey;
};

const SAMPLES: Sample[] = [
  // Likely deterministic (short, near-verbatim seed language)
  {
    label: "d1-capacity-verbatim",
    text: "Mature experimentation teams struggle to know their true testing capacity.",
  },
  {
    label: "d2-roadmap-traffic",
    text: "Experiment roadmaps regularly contain more tests than available traffic can support.",
  },
  {
    label: "d3-predict-duration",
    text: "Teams struggle to predict how long planned experiments will take.",
  },
  {
    label: "d4-portfolio-optimise",
    text: "Organisations optimise individual experiments but rarely optimise the overall experimentation portfolio.",
  },
  {
    label: "d5-knowledge-fragmented",
    text: "Experiment knowledge is fragmented across tools, decks, spreadsheets and people's heads.",
  },
  // Luna-friendly paraphrases / notes
  {
    label: "f1-capacity-paraphrase",
    text: "A CRO lead said they still guess capacity rather than measuring how many tests they can actually run.",
  },
  {
    label: "f2-interaction-fear",
    text: "They delay tests purely because another experiment is live — interaction fear, not traffic shortage.",
  },
  {
    label: "f3-buyer-above",
    text: "The budget owner sits above the experimentation team; Head of CRO is the champion but not the payer.",
  },
  {
    label: "f4-want-recommendations",
    text: "Prospect: we don't need another dashboard — we need clear recommendations on what to run next.",
  },
  {
    label: "f5-csv-ok-early",
    text: "For a pilot they're fine uploading CSV experiment history; deep Optimizely sync can wait.",
  },
  {
    label: "f6-seasonality",
    text: "Black Friday traffic makes duration estimates useless if we ignore seasonality.",
  },
  {
    label: "f7-human-override",
    text: "They insist a human must be able to override any AI schedule for high-impact tests.",
  },
  {
    label: "f8-cross-platform",
    text: "They run Optimizely and AB Tasty and want a neutral layer above both.",
  },
  {
    label: "f9-multi-claim",
    text: "Two things came up: sample size is guessed late, and they never reconnect results to product decisions afterward.",
  },
  {
    label: "f10-challenges-capacity",
    text: "Contrary note: this team always knows exact testing capacity from a spreadsheet they trust weekly.",
  },
  // Ambiguous / force Sol
  {
    label: "r1-ambiguous-short",
    text: "It's unclear whether capacity or politics is the real blocker here.",
  },
  {
    label: "r2-force-deeper",
    text: "They might accept auto-scheduling later but only after trust is built through recommendations.",
    forceReasoning: true,
  },
  {
    label: "r3-novel-topic",
    text: "Their legal team blocked ingesting past experiment docs due to GDPR concerns about PII in hypotheses.",
  },
  {
    label: "r4-mixed-signals",
    text: "They love AI ideas but distrust AI scheduling; also said pricing must not be per-seat.",
  },
  {
    label: "r5-force-capacity",
    text: "Mature experimentation teams struggle to know their true testing capacity.",
    forceReasoning: true,
  },
];

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

function summarize(label: string, totals: number[]) {
  const med = median(totals);
  const slowest = totals.length ? Math.max(...totals) : null;
  const n = totals.length;
  console.log(
    `${label.padEnd(16)} n=${String(n).padStart(2)}  median=${med ?? "—"}ms  slowest=${slowest ?? "—"}ms`,
  );
}

async function main() {
  if (!isOpenAiConfigured()) {
    throw new Error("OPENAI_API_KEY is required for this benchmark.");
  }

  const workspace = await getWorkspaceBySlug("knomera");
  console.log(`Workspace: ${workspace.slug} (${workspace.id})`);
  console.log(`Samples: ${SAMPLES.length}`);
  console.log(
    `Models: FAST=${process.env.OPENAI_FAST_MODEL ?? "(default)"} REASONING=${process.env.OPENAI_REASONING_MODEL ?? "(default)"}`,
  );
  console.log("---");

  const byPath: Record<PathKey, number[]> = {
    deterministic: [],
    fast: [],
    reasoning: [],
  };

  const rows: Array<{
    label: string;
    path: string;
    totalMs: number;
    candidateMs: number;
    fastMs: number | null;
    reasoningMs: number | null;
    ok: boolean;
    error?: string;
  }> = [];

  for (const sample of SAMPLES) {
    const result = await matchEvidenceToAssumptions({
      workspaceId: workspace.id,
      rawText: sample.text,
      forceReasoning: sample.forceReasoning ?? false,
    });

    if (!result.ok) {
      rows.push({
        label: sample.label,
        path: "error",
        totalMs: result.latency?.totalMs ?? 0,
        candidateMs: result.latency?.candidateRetrievalMs ?? 0,
        fastMs: result.latency?.fastModelMs ?? null,
        reasoningMs: result.latency?.reasoningFallbackMs ?? null,
        ok: false,
        error: result.error,
      });
      console.log(
        `FAIL ${sample.label}: ${result.error} (total=${result.latency?.totalMs ?? "?"}ms)`,
      );
      continue;
    }

    byPath[result.path].push(result.latency.totalMs);
    rows.push({
      label: sample.label,
      path: result.path,
      totalMs: result.latency.totalMs,
      candidateMs: result.latency.candidateRetrievalMs,
      fastMs: result.latency.fastModelMs,
      reasoningMs: result.latency.reasoningFallbackMs,
      ok: true,
    });

    console.log(
      [
        sample.label.padEnd(22),
        result.path.padEnd(14),
        `total=${result.latency.totalMs}ms`,
        `cand=${result.latency.candidateRetrievalMs}ms`,
        `luna=${result.latency.fastModelMs ?? "—"}ms`,
        `sol=${result.latency.reasoningFallbackMs ?? "—"}ms`,
        `claims=${result.proposals.length}`,
        `cands=${result.candidatesConsidered}`,
      ].join("  "),
    );
  }

  console.log("---");
  console.log("Summary by handler path (total pipeline ms):");
  summarize("deterministic", byPath.deterministic);
  summarize("luna (fast)", byPath.fast);
  summarize("sol (reasoning)", byPath.reasoning);

  const cand = rows.filter((r) => r.ok).map((r) => r.candidateMs);
  const luna = rows
    .filter((r) => r.ok && r.fastMs != null)
    .map((r) => r.fastMs!);
  const sol = rows
    .filter((r) => r.ok && r.reasoningMs != null)
    .map((r) => r.reasoningMs!);

  console.log("---");
  console.log("Component latencies (successful runs):");
  summarize("candidate", cand);
  summarize("luna API", luna);
  summarize("sol API", sol);

  const failures = rows.filter((r) => !r.ok).length;
  if (failures > 0) {
    console.log(`\n${failures} sample(s) failed.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
