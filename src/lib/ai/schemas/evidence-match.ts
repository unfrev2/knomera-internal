import { z } from "zod";
import { EVIDENCE_DIRECTIONS } from "@/lib/types";

export const matchConfidenceLevels = ["high", "medium", "low"] as const;
export type MatchConfidenceLevel = (typeof matchConfidenceLevels)[number];

export const newAssumptionSuggestionSchema = z.object({
  statement: z.string().min(1),
  category: z.string().min(1),
  importance: z.enum(["critical", "high", "medium", "low"]),
  confidence: z.enum(["low", "medium", "high", "proven"]),
  next_action: z.string().min(1),
  reason_distinct: z.string().min(1),
});

export const evidenceClaimMatchSchema = z.object({
  claim: z.string().min(1).max(800),
  suggested_title: z.string().min(1).max(120),
  candidate_assumption_id: z
    .union([z.string().uuid(), z.null(), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  direction: z.enum(EVIDENCE_DIRECTIONS),
  match_confidence: z.enum(matchConfidenceLevels),
  reason: z.string().min(1).max(200),
  suggested_strength: z.number().int().min(1).max(5),
  needs_reasoning_fallback: z.boolean(),
  no_meaningful_match: z.boolean(),
  new_assumption_suggestion: newAssumptionSuggestionSchema.nullable(),
});

export const evidenceMatchOutputSchema = z.object({
  claims: z.array(evidenceClaimMatchSchema).min(1).max(8),
});

export type EvidenceClaimMatch = z.infer<typeof evidenceClaimMatchSchema>;
export type EvidenceMatchOutput = z.infer<typeof evidenceMatchOutputSchema>;

/** JSON Schema for OpenAI strict structured outputs. */
export const evidenceMatchJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    claims: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          claim: { type: "string" },
          suggested_title: { type: "string" },
          candidate_assumption_id: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          direction: {
            type: "string",
            enum: ["supports", "challenges", "neutral"],
          },
          match_confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          reason: { type: "string" },
          suggested_strength: { type: "integer", minimum: 1, maximum: 5 },
          needs_reasoning_fallback: { type: "boolean" },
          no_meaningful_match: { type: "boolean" },
          new_assumption_suggestion: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                properties: {
                  statement: { type: "string" },
                  category: { type: "string" },
                  importance: {
                    type: "string",
                    enum: ["critical", "high", "medium", "low"],
                  },
                  confidence: {
                    type: "string",
                    enum: ["low", "medium", "high", "proven"],
                  },
                  next_action: { type: "string" },
                  reason_distinct: { type: "string" },
                },
                required: [
                  "statement",
                  "category",
                  "importance",
                  "confidence",
                  "next_action",
                  "reason_distinct",
                ],
              },
              { type: "null" },
            ],
          },
        },
        required: [
          "claim",
          "suggested_title",
          "candidate_assumption_id",
          "direction",
          "match_confidence",
          "reason",
          "suggested_strength",
          "needs_reasoning_fallback",
          "no_meaningful_match",
          "new_assumption_suggestion",
        ],
      },
    },
  },
  required: ["claims"],
} as const;
