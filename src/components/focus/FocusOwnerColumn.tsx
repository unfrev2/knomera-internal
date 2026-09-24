"use client";

import {
  deleteFocusItemAction,
  setFocusItemStatusAction,
} from "@/app/actions/focus";
import { FocusItemForm } from "@/components/focus/FocusItemForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { hrefForLinkable } from "@/lib/domain/linkable";
import { rethrowNavigation } from "@/lib/navigation";
import type { FocusItem } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function FocusOwnerColumn({
  ownerName,
  ownerId,
  items,
  weekStart,
}: {
  ownerName: string;
  ownerId: string;
  items: FocusItem[];
  weekStart: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<FocusItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(
    action: (formData: FormData) => Promise<void>,
    fields: Record<string, string>,
  ) {
    setError(null);
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      formData.set(key, value);
    }
    startTransition(async () => {
      try {
        await action(formData);
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not update.");
      }
    });
  }

  const active = items.filter(
    (item) => item.status === "active" || item.status === "planned",
  );
  const finished = items.filter(
    (item) => item.status === "done" || item.status === "dropped",
  );

  return (
    <section className="space-y-4 rounded border border-line bg-white/50 px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-navy">{ownerName}</h2>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          Add
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}

      {active.length === 0 ? (
        <p className="text-sm text-muted">Nothing in focus this week.</p>
      ) : (
        <ul className="space-y-3">
          {active.map((item) => (
            <FocusRow
              key={item.id}
              item={item}
              pending={pending}
              onEdit={() => setEditing(item)}
              onStatus={(status) =>
                run(setFocusItemStatusAction, { id: item.id, status })
              }
              onDelete={() => run(deleteFocusItemAction, { id: item.id })}
            />
          ))}
        </ul>
      )}

      {finished.length > 0 ? (
        <div className="space-y-2 border-t border-line pt-4">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            Closed
          </p>
          <ul className="space-y-2">
            {finished.map((item) => (
              <FocusRow
                key={item.id}
                item={item}
                pending={pending}
                muted
                onEdit={() => setEditing(item)}
                onStatus={(status) =>
                  run(setFocusItemStatusAction, { id: item.id, status })
                }
                onDelete={() => run(deleteFocusItemAction, { id: item.id })}
              />
            ))}
          </ul>
        </div>
      ) : null}

      <FocusItemForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        defaultOwner={ownerId}
        defaultWeekStart={weekStart}
      />
      {editing ? (
        <FocusItemForm
          open
          onClose={() => setEditing(null)}
          mode="edit"
          item={editing}
        />
      ) : null}
    </section>
  );
}

function FocusRow({
  item,
  pending,
  muted = false,
  onEdit,
  onStatus,
  onDelete,
}: {
  item: FocusItem;
  pending: boolean;
  muted?: boolean;
  onEdit: () => void;
  onStatus: (status: "active" | "done" | "dropped" | "planned") => void;
  onDelete: () => void;
}) {
  const link =
    item.linked_assumption_id != null
      ? {
          href: hrefForLinkable("assumption", item.linked_assumption_id),
          label: item.linked_assumption_statement ?? "Assumption",
        }
      : item.linked_bet_id != null
        ? {
            href: hrefForLinkable("bet", item.linked_bet_id),
            label: item.linked_bet_title ?? "Bet",
          }
        : item.linked_opportunity_id != null
          ? {
              href: hrefForLinkable("opportunity", item.linked_opportunity_id),
              label: item.linked_opportunity_title ?? "Opportunity",
            }
          : null;

  return (
    <li
      className={[
        "space-y-2 rounded border border-line px-3 py-3",
        muted ? "bg-cream-tint/30 opacity-80" : "bg-white/70",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-navy">{item.title}</p>
        <Badge variant="focus-status" value={item.status} />
      </div>
      {link ? (
        <Link
          href={link.href}
          className="block truncate text-xs text-muted hover:text-navy hover:underline"
        >
          {link.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap gap-1">
        {item.status !== "done" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => onStatus("done")}
          >
            Done
          </Button>
        ) : null}
        {item.status !== "active" && item.status !== "done" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => onStatus("active")}
          >
            Activate
          </Button>
        ) : null}
        {item.status !== "dropped" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => onStatus("dropped")}
          >
            Drop
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={onEdit}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={onDelete}
        >
          Remove
        </Button>
      </div>
    </li>
  );
}
