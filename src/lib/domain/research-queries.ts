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

export function competitorQueriesForOrganisation(options: {
  name: string;
  website?: string | null;
}): string[] {
  const name = options.name.trim();
  const host = (() => {
    if (!options.website) return null;
    try {
      return new URL(
        options.website.startsWith("http")
          ? options.website
          : `https://${options.website}`,
      ).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  })();

  const queries = [
    `${name} product launch OR release OR changelog`,
    `${name} pricing OR integration OR AI feature`,
    host ? `site:${host} release OR changelog OR announcement` : null,
    `${name} experimentation OR A/B testing OR CRO`,
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
  return `${competitorName} ${focus}`.replace(/\s+/g, " ").trim();
}
