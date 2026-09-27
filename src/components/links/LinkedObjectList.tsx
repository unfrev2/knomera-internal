import {
  EntityLink,
  EntityTypeLabel,
  EntityTypeMark,
} from "@/components/links/EntityType";
import type { LinkableObject } from "@/lib/domain/linkable";
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
              <EntityTypeMark
                type={item.type}
                size="md"
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <EntityTypeLabel type={item.type} showMark={false} />
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
          <EntityLink
            type={item.type}
            href={item.href}
            variant="chip"
            title={item.title}
          >
            {item.title}
          </EntityLink>
        </li>
      ))}
    </ul>
  );
}
