/**
 * Result-size helpers for MCP tools.
 *
 * Limits are currently effectively unbounded so agents get full workspace
 * context (e.g. all assumptions) and can then fetch a single record.
 * Reintroduce tighter caps here if response size becomes a problem.
 */
export const MCP_DEFAULT_LIMIT = Number.MAX_SAFE_INTEGER;
export const MCP_MAX_LIMIT = Number.MAX_SAFE_INTEGER;
export const MCP_CONTEXT_CHILD_CAP = Number.MAX_SAFE_INTEGER;

export function clampLimit(
  value: number | undefined | null,
  defaultLimit = MCP_DEFAULT_LIMIT,
  max = MCP_MAX_LIMIT,
): number {
  if (value == null || Number.isNaN(value)) return defaultLimit;
  return Math.min(Math.max(Math.floor(value), 1), max);
}

export function takeCap<T>(
  items: T[],
  cap = MCP_CONTEXT_CHILD_CAP,
): { items: T[]; total: number; truncated: boolean } {
  return {
    items: items.slice(0, cap),
    total: items.length,
    truncated: items.length > cap,
  };
}
