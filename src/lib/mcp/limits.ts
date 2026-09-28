export const MCP_DEFAULT_LIMIT = 20;
export const MCP_MAX_LIMIT = 50;
export const MCP_CONTEXT_CHILD_CAP = 20;

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
