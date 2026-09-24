import type { ReactNode } from "react";

/**
 * Shared page layout primitives.
 *
 * Width:
 * - wide   — list/table surfaces (use full main column)
 * - narrow — detail / reading surfaces (readable measure)
 *
 * Hierarchy:
 * - Page title: text-2xl → md:text-3xl
 * - Section: text-lg
 * - Supporting copy: text-sm text-muted
 */

export type PageWidth = "wide" | "narrow";

const WIDTH_CLASS: Record<PageWidth, string> = {
  wide: "mx-auto w-full max-w-6xl",
  narrow: "mx-auto w-full max-w-3xl",
};

export function PageFrame({
  width = "wide",
  children,
  className = "",
}: {
  width?: PageWidth;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[WIDTH_CLASS[width], "space-y-8", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Small uppercase label above the title (detail pages). */
  eyebrow?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          {eyebrow ? (
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
            {title}
          </h1>
          {description ? (
            <div className="max-w-2xl text-sm leading-relaxed text-muted">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {children}
    </header>
  );
}

export function SectionHeading({
  title,
  description,
  actions,
  as: Tag = "h2",
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <Tag className="text-lg font-semibold text-navy">{title}</Tag>
        {description ? (
          <div className="text-sm leading-relaxed text-muted">{description}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function PageAlert({ children }: { children: ReactNode }) {
  return (
    <p className="rounded border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-navy">
      {children}
    </p>
  );
}
