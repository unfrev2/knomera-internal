import type { UsageStats } from "@/lib/research/providers/types";

/**
 * Lightweight usage aggregation for research runs / matching sessions.
 * Persist via research_runs columns — no separate analytics dashboard yet.
 */

export type UsageAccumulator = {
  inputTokens: number;
  outputTokens: number;
  aiCalls: number;
  searchCalls: number;
  estimatedCost: number;
};

export function createUsageAccumulator(): UsageAccumulator {
  return {
    inputTokens: 0,
    outputTokens: 0,
    aiCalls: 0,
    searchCalls: 0,
    estimatedCost: 0,
  };
}

export function addUsage(
  acc: UsageAccumulator,
  stats: Partial<UsageStats> | null | undefined,
): void {
  if (!stats) return;
  acc.inputTokens += stats.inputTokens ?? 0;
  acc.outputTokens += stats.outputTokens ?? 0;
  acc.aiCalls += stats.aiCalls ?? 0;
  acc.searchCalls += stats.searchCalls ?? 0;
  if (typeof stats.estimatedCost === "number") {
    acc.estimatedCost += stats.estimatedCost;
  }
}

export function usageToRunFields(acc: UsageAccumulator) {
  return {
    input_tokens: acc.inputTokens,
    output_tokens: acc.outputTokens,
    ai_calls: acc.aiCalls,
    search_calls: acc.searchCalls,
    estimated_cost: acc.estimatedCost > 0 ? acc.estimatedCost : null,
  };
}
