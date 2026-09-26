import { getDb } from "@/lib/db/client";
import type { AiModelRole, ReasoningEffort } from "@/lib/ai/config";

export type MatchingHandlerPath =
  | "deterministic"
  | "fast"
  | "reasoning"
  | "none";

export type AiUsageEventInput = {
  workspaceId: string;
  feature: string;
  provider: string;
  modelRole: AiModelRole | "deterministic" | "none";
  modelName?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  /** Wall time for the primary model call (fast or reasoning alone). */
  latencyMs?: number | null;
  success: boolean;
  fallbackUsed?: boolean;
  error?: string | null;
  /** Which path handled the request for latency/quality comparison. */
  handlerPath?: MatchingHandlerPath | null;
  latencyCandidateMs?: number | null;
  latencyFastMs?: number | null;
  latencyReasoningMs?: number | null;
  latencySaveMs?: number | null;
  reasoningEffort?: ReasoningEffort | null;
};

/**
 * Persist lightweight AI usage metadata. Never log prompt/content.
 */
export async function recordAiUsageEvent(
  input: AiUsageEventInput,
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO ai_usage_events (
      workspace_id,
      feature,
      provider,
      model_role,
      model_name,
      input_tokens,
      output_tokens,
      latency_ms,
      success,
      fallback_used,
      error,
      handler_path,
      latency_candidate_ms,
      latency_fast_ms,
      latency_reasoning_ms,
      latency_save_ms,
      reasoning_effort
    ) VALUES (
      ${input.workspaceId},
      ${input.feature},
      ${input.provider},
      ${input.modelRole},
      ${input.modelName ?? null},
      ${input.inputTokens ?? 0},
      ${input.outputTokens ?? 0},
      ${input.latencyMs ?? null},
      ${input.success},
      ${input.fallbackUsed ?? false},
      ${input.error ?? null},
      ${input.handlerPath ?? null},
      ${input.latencyCandidateMs ?? null},
      ${input.latencyFastMs ?? null},
      ${input.latencyReasoningMs ?? null},
      ${input.latencySaveMs ?? null},
      ${input.reasoningEffort ?? null}
    )
  `;
}
