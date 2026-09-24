/**
 * Shared vocabulary for cross-object linking.
 * Join tables remain typed per relationship; this is UI/search only.
 */

export const LINKABLE_OBJECT_TYPES = [
  "assumption",
  "problem",
  "evidence",
  "decision",
  "bet",
  "idea",
  "organisation",
  "contact",
  "discovery_session",
  "opportunity",
] as const;

export type LinkableObjectType = (typeof LINKABLE_OBJECT_TYPES)[number];

/** Types that already have tables and can be searched. */
export const SEARCHABLE_OBJECT_TYPES = [
  "assumption",
  "evidence",
  "problem",
  "organisation",
  "discovery_session",
  "decision",
  "idea",
  "bet",
] as const;

export type SearchableObjectType = (typeof SEARCHABLE_OBJECT_TYPES)[number];

export type LinkableObject = {
  type: LinkableObjectType;
  id: string;
  title: string;
  subtitle?: string | null;
  href: string;
  meta?: string | null;
};

export const LINKABLE_TYPE_LABELS: Record<LinkableObjectType, string> = {
  assumption: "Assumption",
  problem: "Problem",
  evidence: "Evidence",
  decision: "Decision",
  bet: "Bet",
  idea: "Idea",
  organisation: "Organisation",
  contact: "Contact",
  discovery_session: "Discovery",
  opportunity: "Opportunity",
};

export function hrefForLinkable(
  type: LinkableObjectType,
  id: string,
): string {
  switch (type) {
    case "assumption":
      return `/assumptions/${id}`;
    case "evidence":
      return `/evidence#${id}`;
    case "problem":
      return `/problems/${id}`;
    case "decision":
      return `/decisions/${id}`;
    case "bet":
      return `/bets/${id}`;
    case "idea":
      return `/ideas/${id}`;
    case "organisation":
      return `/organisations/${id}`;
    case "contact":
      return `/contacts/${id}`;
    case "discovery_session":
      return `/discovery/${id}`;
    case "opportunity":
      return `/commercial/${id}`;
  }
}
