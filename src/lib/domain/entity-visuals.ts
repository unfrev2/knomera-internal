import type { LinkableObjectType } from "@/lib/domain/linkable";
import {
  Briefcase,
  Building2,
  CircleHelp,
  Compass,
  Crosshair,
  FileSearch,
  FileText,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  MessagesSquare,
  Scale,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Visual vocabulary for workspace object types.
 * Icons match AppShell nav; tones stay within cream/navy/coral/blue.
 */
export type EntityVisualKind =
  | LinkableObjectType
  | "strategy"
  | "focus"
  | "evidence_source"
  | "home";

export type EntityVisualTone = {
  /** Soft well behind the icon. */
  well: string;
  /** Icon + type-label accent. */
  accent: string;
  /** Chip / pill surface for compact related links. */
  chip: string;
};

export type EntityVisual = {
  kind: EntityVisualKind;
  label: string;
  icon: LucideIcon;
  tone: EntityVisualTone;
};

const TONES = {
  navy: {
    well: "bg-navy/8",
    accent: "text-navy/75",
    chip: "bg-navy/6 text-navy ring-1 ring-navy/10",
  },
  blue: {
    well: "bg-blue/12",
    accent: "text-blue",
    chip: "bg-blue/8 text-navy ring-1 ring-blue/15",
  },
  coral: {
    well: "bg-coral/12",
    accent: "text-coral",
    chip: "bg-coral/8 text-navy ring-1 ring-coral/18",
  },
  soft: {
    well: "bg-cream-tint",
    accent: "text-navy/55",
    chip: "bg-cream-tint text-navy ring-1 ring-line",
  },
} as const satisfies Record<string, EntityVisualTone>;

export const ENTITY_VISUALS: Record<EntityVisualKind, EntityVisual> = {
  home: {
    kind: "home",
    label: "Home",
    icon: LayoutDashboard,
    tone: TONES.navy,
  },
  focus: {
    kind: "focus",
    label: "Focus",
    icon: Crosshair,
    tone: TONES.coral,
  },
  strategy: {
    kind: "strategy",
    label: "Strategy",
    icon: Compass,
    tone: TONES.navy,
  },
  problem: {
    kind: "problem",
    label: "Problem",
    icon: CircleHelp,
    tone: TONES.coral,
  },
  assumption: {
    kind: "assumption",
    label: "Assumption",
    icon: ListChecks,
    tone: TONES.navy,
  },
  discovery_session: {
    kind: "discovery_session",
    label: "Discovery",
    icon: MessagesSquare,
    tone: TONES.blue,
  },
  organisation: {
    kind: "organisation",
    label: "Organisation",
    icon: Building2,
    tone: TONES.soft,
  },
  contact: {
    kind: "contact",
    label: "Contact",
    icon: Users,
    tone: TONES.blue,
  },
  decision: {
    kind: "decision",
    label: "Decision",
    icon: Scale,
    tone: TONES.navy,
  },
  idea: {
    kind: "idea",
    label: "Idea",
    icon: Lightbulb,
    tone: TONES.blue,
  },
  bet: {
    kind: "bet",
    label: "Bet",
    icon: Target,
    tone: TONES.coral,
  },
  opportunity: {
    kind: "opportunity",
    label: "Opportunity",
    icon: Briefcase,
    tone: TONES.navy,
  },
  evidence: {
    kind: "evidence",
    label: "Evidence",
    icon: FileSearch,
    tone: TONES.blue,
  },
  evidence_source: {
    kind: "evidence_source",
    label: "Source",
    icon: FileText,
    tone: TONES.soft,
  },
};

export function getEntityVisual(kind: EntityVisualKind): EntityVisual {
  return ENTITY_VISUALS[kind];
}

/** Map loose string kinds (e.g. home ItemList) onto the visual registry. */
export function resolveEntityVisualKind(
  kind: string,
): EntityVisualKind | null {
  if (kind in ENTITY_VISUALS) {
    return kind as EntityVisualKind;
  }
  switch (kind) {
    case "discovery":
      return "discovery_session";
    case "source":
      return "evidence_source";
    case "commercial":
      return "opportunity";
    default:
      return null;
  }
}
