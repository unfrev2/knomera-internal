/**
 * Canonicalise public URLs for source deduplication.
 * Strip common tracking params; keep scheme/host/path/query that matters.
 */

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
]);

export function canonicaliseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();

  // Drop default ports
  if (
    (parsed.protocol === "https:" && parsed.port === "443") ||
    (parsed.protocol === "http:" && parsed.port === "80")
  ) {
    parsed.port = "";
  }

  const kept = new URLSearchParams();
  const entries = [...parsed.searchParams.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  for (const [key, value] of entries) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) continue;
    kept.append(key, value);
  }
  const query = kept.toString();
  parsed.search = query ? `?${query}` : "";

  // Normalise trailing slash on path (keep root `/`)
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  return parsed.toString();
}
