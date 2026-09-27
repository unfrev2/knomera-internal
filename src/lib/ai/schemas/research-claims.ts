import { z } from "zod";
import { EVIDENCE_DIRECTIONS } from "@/lib/types";

export const researchClaimSchema = z.object({
  claim: z.string().min(1).max(500),
  summary: z.string().min(1).max(400),
  candidate_assumption_id: z
    .union([z.string().uuid(), z.null(), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
  direction: z.enum(EVIDENCE_DIRECTIONS),
  relevance: z.string().min(1).max(200),
  reason: z.string().min(1).max(200),
  ai_confidence: z.number().min(0).max(1),
  suggested_strength: z.number().int().min(1).max(5),
  useful: z.boolean(),
});

export const researchClaimsOutputSchema = z.object({
  claims: z.array(researchClaimSchema).max(6),
});

export type ResearchClaimsOutput = z.infer<typeof researchClaimsOutputSchema>;

export const researchClaimsJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    claims: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          claim: { type: "string" },
          summary: { type: "string" },
          candidate_assumption_id: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          direction: {
            type: "string",
            enum: ["supports", "challenges", "neutral"],
          },
          relevance: { type: "string" },
          reason: { type: "string" },
          ai_confidence: { type: "number" },
          suggested_strength: { type: "integer", minimum: 1, maximum: 5 },
          useful: { type: "boolean" },
        },
        required: [
          "claim",
          "summary",
          "candidate_assumption_id",
          "direction",
          "relevance",
          "reason",
          "ai_confidence",
          "suggested_strength",
          "useful",
        ],
      },
    },
  },
  required: ["claims"],
} as const;
