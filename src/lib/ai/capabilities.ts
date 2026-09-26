import { EVIDENCE_STRENGTH } from "@/lib/labels";
import type { AssumptionCandidate } from "@/lib/research/providers/types";
import {
  evidenceMatchJsonSchema,
  evidenceMatchOutputSchema,
  type EvidenceMatchOutput,
} from "@/lib/ai/schemas/evidence-match";
import { openAiStructuredJson } from "@/lib/ai/providers/openai";
import type { AiModelRole, ReasoningEffort } from "@/lib/ai/config";
import type { UsageStats } from "@/lib/research/providers/types";

/**
 * Stable system prefix for OpenAI prompt caching.
 * Keep static: no timestamps, usernames, or per-request IDs.
 */
function stableSystemPrompt(): string {
  const strengthLines = EVIDENCE_STRENGTH.map(
    (s) => `${s.value} ${s.label}: ${s.explanation}`,
  ).join("\n");

  return `You structure founder discovery notes into atomic evidence claims matched to Knomera assumptions.

Return one structured JSON object with claims[] only. One batched result covers: claim split, assumption id, direction, strength, title, confidence, and optional new-assumption suggestion.

Rules:
- Split into atomic claims only when materially distinct; otherwise one claim.
- Prefer an existing candidate_assumption_id over inventing a new assumption.
- Prefer related existing / no match over near-duplicates.
- Direction is supports, challenges, or neutral. Closest wording does NOT imply supports.
- Do not exaggerate beyond the observation.
- suggested_strength uses ONLY:
${strengthLines}
- Discovery notes are usually strength 2 unless clearly stronger.
- If no candidate fits: no_meaningful_match=true and candidate_assumption_id=null.
- Propose new_assumption_suggestion only for a materially distinct falsifiable belief (not a feature request).
- needs_reasoning_fallback=true only when genuinely ambiguous or contradictory.
- reason: one short sentence (≤160 chars), user-facing, no chain-of-thought.
- suggested_title: concise (≤80 chars).
- candidate_assumption_id must be one of the provided candidate ids or null.`;
}

/** Dynamic suffix only — observation + shortlisted candidates. */
function dynamicUserPrompt(
  rawText: string,
  candidates: AssumptionCandidate[],
): string {
  return JSON.stringify({
    observation: rawText,
    candidates: candidates.map((c) => ({
      id: c.id,
      statement: c.statement,
      category: c.category,
      importance: c.importance,
      confidence: c.confidence,
    })),
  });
}

export type StructuredExtractionResult = {
  output: EvidenceMatchOutput;
  usage: UsageStats;
  model: string;
  role: AiModelRole;
  reasoningEffort: ReasoningEffort;
  latencyMs: number;
};

/**
 * Single batched structured extraction call (split + match + direction + strength).
 * Fast role → reasoning_effort none; reasoning role → low.
 */
export async function structuredExtraction(options: {
  rawText: string;
  candidates: AssumptionCandidate[];
  role?: AiModelRole;
}): Promise<StructuredExtractionResult> {
  const role = options.role ?? "fast";
  const result = await openAiStructuredJson({
    role,
    schemaName: "evidence_match",
    schema: evidenceMatchJsonSchema as unknown as Record<string, unknown>,
    zodSchema: evidenceMatchOutputSchema,
    messages: [
      { role: "system", content: stableSystemPrompt() },
      {
        role: "user",
        content: dynamicUserPrompt(options.rawText, options.candidates),
      },
    ],
  });
  return {
    output: result.data,
    usage: result.usage,
    model: result.model,
    role: result.role,
    reasoningEffort: result.reasoningEffort,
    latencyMs: result.latencyMs,
  };
}

export async function reasoningExtraction(options: {
  rawText: string;
  candidates: AssumptionCandidate[];
}): Promise<StructuredExtractionResult> {
  return structuredExtraction({ ...options, role: "reasoning" });
}
