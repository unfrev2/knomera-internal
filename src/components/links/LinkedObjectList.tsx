import {
  LINKABLE_TYPE_LABELS,
  type LinkableObject,
  type LinkableObjectType,
} from "@/lib/domain/linkable";
import { X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type LinkedObjectListProps = {
  title: string;
  items: LinkableObject[];
  emptyMessage?: string;
  /** Optional action slot (e.g. ObjectPicker trigger). */
  action?: ReactNode;
  onRemove?: (item: LinkableObject) => void;
  className?: string;
};

function TypeLabel({ type }: { type: LinkableObjectType }) {
  return (
    <span className="shrink-0 text-[11px] font-medium tracking-wide text-muted uppercase">
      {LINKABLE_TYPE_LABELS[type]}
    </span>
  );
}

export function LinkedObjectList({
  title,
  items,
  emptyMessage = "Nothing linked yet.",
  action,
  onRemove,
  className = "",
}: LinkedObjectListProps) {
  return (
    <section className={["space-y-3", className].filter(Boolean).join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-navy">{title}</h2>
        {action}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">{emptyMessage}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {items.map((item) => (
            <li
              key={`${item.type}:${item.id}`}
              className="flex items-start gap-3 py-2.5"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <TypeLabel type={item.type} />
                  {item.meta ? (
                    <span className="text-xs text-muted">{item.meta}</span>
                  ) : null}
                </div>
                <Link
                  href={item.href}
                  className="block text-sm font-medium text-navy hover:underline"
                >
                  {item.title}
                </Link>
                {item.subtitle ? (
                  <p className="truncate text-xs text-muted">{item.subtitle}</p>
                ) : null}
              </div>
              {onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  className="rounded p-1 text-muted transition-colors hover:bg-cream-tint hover:text-navy"
                  aria-label={`Remove ${item.title}`}
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Compact chip-style row for dense tables and side panels. */
export function LinkedObjectChips({
  items,
  emptyLabel = "None",
}: {
  items: LinkableObject[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <span className="text-sm text-muted">{emptyLabel}</span>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={`${item.type}:${item.id}`}>
          <Link
            href={item.href}
            className="inline-flex max-w-[16rem] items-center rounded-sm bg-cream-tint px-2 py-0.5 text-xs font-medium text-navy ring-1 ring-line hover:bg-white"
            title={item.title}
          >
            <span className="truncate">{item.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
