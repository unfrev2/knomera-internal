/**
 * Deterministic search query construction for external research.
 * Prefer these over LLM-generated queries.
 */

import type { Assumption } from "@/lib/types";

export function marketQueriesForAssumption(assumption: Assumption): string[] {
  const statement = assumption.statement.trim();
  const category = assumption.category.trim();
  const base = statement
    .replace(/[?.!]+$/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 10)
    .join(" ");

  const queries = [
    `${base} experimentation`,
    `${category} ${base}`.trim(),
    `${base} A/B testing capacity`,
  ];

  return [...new Set(queries.map((q) => q.replace(/\s+/g, " ").trim()))].filter(
    (q) => q.length >= 12,
  );
}

export function organisationWebsiteHost(
  website?: string | null,
): string | null {
  if (!website) return null;
  try {
    return new URL(
      website.startsWith("http") ? website : `https://${website}`,
    ).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Drop web hits that are clearly not about the organisation.
 * Bare terms like "changelog" otherwise match keepachangelog.com / n8n / etc.
 */
export function isWebResultAboutOrganisation(
  result: { title: string; url: string; snippet: string },
  options: { name: string; website?: string | null },
): boolean {
  const expectedHost = organisationWebsiteHost(options.website);
  try {
    const resultHost = new URL(result.url).hostname.replace(/^www\./, "");
    if (
      expectedHost &&
      (resultHost === expectedHost || resultHost.endsWith(`.${expectedHost}`))
    ) {
      return true;
    }
  } catch {
    // Invalid URL — fall through to name matching.
  }

  const hay = `${result.title} ${result.url} ${result.snippet}`.toLowerCase();
  const name = options.name.trim().toLowerCase();
  if (name.length >= 4 && hay.includes(name)) return true;

  const compact = name.replace(/[\s.]+/g, "");
  const hayCompact = hay.replace(/[\s._/-]+/g, "");
  if (compact.length >= 4 && hayCompact.includes(compact)) return true;

  const tokens = name
    .split(/[\s/]+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length > 2);
  if (tokens.length >= 2 && tokens.every((t) => hay.includes(t))) return true;

  return false;
}

export function competitorQueriesForOrganisation(options: {
  name: string;
  website?: string | null;
}): string[] {
  const name = options.name.trim();
  const host = organisationWebsiteHost(options.website);
  // Quote multi-word names so the search provider does not dilute them.
  const focus = /\s/.test(name) ? `"${name}"` : name;

  // Prefer site-scoped + simple phrases. Heavy OR chains on the open web
  // return unrelated pricing/changelog pages (Stripe, keepachangelog, etc.).
  const queries = [
    host
      ? `site:${host} experimentation OR feature OR AI`
      : `${focus} Feature Experimentation`,
    `${focus} AI experimentation platform`,
    `${focus} competitors alternatives experimentation`,
    host
      ? `site:${host} product OR announcement OR release`
      : `${focus} product announcement experimentation`,
  ].filter(Boolean) as string[];

  return [...new Set(queries)];
}

export function assumptionFocusedCompetitorQuery(
  assumption: Assumption,
  competitorName: string,
): string {
  const focus = assumption.statement
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 6)
    .join(" ");
  const name = /\s/.test(competitorName.trim())
    ? `"${competitorName.trim()}"`
    : competitorName.trim();
  return `${name} ${focus}`.replace(/\s+/g, " ").trim();
}
