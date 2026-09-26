import { EVIDENCE_STRENGTH } from "@/lib/labels";
import type { AssumptionCandidate } from "@/lib/research/providers/types";
import {
  evidenceMatchJsonSchema,
  evidenceMatchOutputSchema,
  type EvidenceMatchOutput,
} from "@/lib/ai/schemas/evidence-match";
import { openAiStructuredJson } from "@/lib/ai/providers/openai";
import type { AiModelRole } from "@/lib/ai/config";
import type { UsageStats } from "@/lib/research/providers/types";

function strengthRules(): string {
  return EVIDENCE_STRENGTH.map(
    (s) => `${s.value} ${s.label}: ${s.explanation}`,
  ).join("\n");
}

function systemPrompt(): string {
  return `You help Knomera founders structure discovery evidence against existing assumptions.

Rules:
- Split the observation into atomic claims only when they are materially distinct.
- Prefer matching an existing candidate assumption over inventing a new one.
- Prefer "related existing" / no match over near-duplicate new assumptions.
- Direction must be supports, challenges, or neutral. Closest wording does NOT imply supports.
- Do not exaggerate beyond the original observation.
- suggested_strength must use ONLY these definitions:
${strengthRules()}
- Founder discovery notes are usually strength 2 (Qualitative) unless clearly stronger.
- If no candidate fits, set no_meaningful_match=true and candidate_assumption_id=null.
- Only propose new_assumption_suggestion when the belief is materially distinct from all candidates.
- New assumptions must be falsifiable beliefs, not product feature requests.
- Set needs_reasoning_fallback=true when the match is ambiguous, contradictory, or you are unsure.
- Keep reason concise and user-facing (no chain-of-thought).
- candidate_assumption_id must be one of the provided candidate ids or null.`;
}

function userPrompt(
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
  latencyMs: number;
};

/**
 * Capability: structuredExtraction — split/match/direction/strength in one call.
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
      { role: "system", content: systemPrompt() },
      { role: "user", content: userPrompt(options.rawText, options.candidates) },
    ],
  });
  return {
    output: result.data,
    usage: result.usage,
    model: result.model,
    role: result.role,
    latencyMs: result.latencyMs,
  };
}

/**
 * Capability: reasoning — same schema, stronger configured model.
 */
export async function reasoningExtraction(options: {
  rawText: string;
  candidates: AssumptionCandidate[];
}): Promise<StructuredExtractionResult> {
  return structuredExtraction({ ...options, role: "reasoning" });
}
