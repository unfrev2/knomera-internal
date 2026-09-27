import {
  getEntityVisual,
  resolveEntityVisualKind,
  type EntityVisualKind,
} from "@/lib/domain/entity-visuals";
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const SIZE = {
  sm: { well: "size-5", icon: "size-3" },
  md: { well: "size-6", icon: "size-3.5" },
  lg: { well: "size-7", icon: "size-4" },
} as const;

export type EntityTypeMarkProps = {
  type: EntityVisualKind | string;
  size?: keyof typeof SIZE;
  className?: string;
  /** Hide coloured well; icon only (e.g. dense lists). */
  bare?: boolean;
};

export function EntityTypeMark({
  type,
  size = "md",
  className = "",
  bare = false,
}: EntityTypeMarkProps) {
  const kind = resolveEntityVisualKind(type);
  if (!kind) return null;
  const visual = getEntityVisual(kind);
  const Icon = visual.icon;
  const dims = SIZE[size];

  if (bare) {
    return (
      <Icon
        className={[dims.icon, "shrink-0", visual.tone.accent, className]
          .filter(Boolean)
          .join(" ")}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-sm",
        dims.well,
        visual.tone.well,
        visual.tone.accent,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={visual.label}
      aria-hidden
    >
      <Icon className={dims.icon} />
    </span>
  );
}

export type EntityTypeLabelProps = {
  type: EntityVisualKind | string;
  size?: keyof typeof SIZE;
  className?: string;
  /** Show coloured icon well (default true). */
  showMark?: boolean;
  /** Show label text (default true). */
  showLabel?: boolean;
};

/** Icon + uppercase type name for related rows / search results. */
export function EntityTypeLabel({
  type,
  size = "sm",
  className = "",
  showMark = true,
  showLabel = true,
}: EntityTypeLabelProps) {
  const kind = resolveEntityVisualKind(type);
  if (!kind) return null;
  const visual = getEntityVisual(kind);

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showMark ? <EntityTypeMark type={kind} size={size} /> : null}
      {showLabel ? (
        <span
          className={[
            "text-[11px] font-medium tracking-wide uppercase",
            visual.tone.accent,
          ].join(" ")}
        >
          {visual.label}
        </span>
      ) : (
        <span className="sr-only">{visual.label}</span>
      )}
    </span>
  );
}

export type EntityLinkProps = Omit<
  ComponentPropsWithoutRef<typeof Link>,
  "children"
> & {
  type: EntityVisualKind | string;
  children: ReactNode;
  /** Chip styling for dense related content. */
  variant?: "inline" | "chip" | "block";
  markSize?: keyof typeof SIZE;
  className?: string;
};

/** Typed link with icon — use for related content and cross-object references. */
export function EntityLink({
  type,
  children,
  variant = "inline",
  markSize = "sm",
  className = "",
  ...linkProps
}: EntityLinkProps) {
  const kind = resolveEntityVisualKind(type);
  const visual = kind ? getEntityVisual(kind) : null;

  if (variant === "chip") {
    return (
      <Link
        {...linkProps}
        className={[
          "inline-flex max-w-full items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium transition-colors hover:bg-white",
          visual?.tone.chip ?? "bg-cream-tint text-navy ring-1 ring-line",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {kind ? <EntityTypeMark type={kind} size={markSize} bare /> : null}
        <span className="truncate">{children}</span>
      </Link>
    );
  }

  if (variant === "block") {
    return (
      <Link
        {...linkProps}
        className={[
          "flex gap-2.5 font-medium text-navy hover:underline",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {kind ? (
          <EntityTypeMark type={kind} size={markSize} className="mt-0.5" />
        ) : null}
        <span className="min-w-0 flex-1">{children}</span>
      </Link>
    );
  }

  return (
    <Link
      {...linkProps}
      className={[
        "inline-flex max-w-full items-center gap-1.5 font-medium text-navy hover:underline",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {kind ? <EntityTypeMark type={kind} size={markSize} /> : null}
      <span className="min-w-0 truncate">{children}</span>
    </Link>
  );
}
