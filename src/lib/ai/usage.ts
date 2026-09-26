import { getDb } from "@/lib/db/client";
import type { AiModelRole } from "@/lib/ai/config";

export type AiUsageEventInput = {
  workspaceId: string;
  feature: string;
  provider: string;
  modelRole: AiModelRole | "deterministic" | "none";
  modelName?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number | null;
  success: boolean;
  fallbackUsed?: boolean;
  error?: string | null;
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
      error
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
      ${input.error ?? null}
    )
  `;
}
