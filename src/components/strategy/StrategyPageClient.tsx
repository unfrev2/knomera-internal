"use client";

import { StrategyItemForm } from "@/components/strategy/StrategyItemForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  STRATEGY_STATUS_LABELS,
  STRATEGY_TYPE_LABELS,
} from "@/lib/labels";
import type { StrategyItem } from "@/lib/types";
import { useState } from "react";

export function StrategyPageClient({ items }: { items: StrategyItem[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<StrategyItem | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-navy md:text-3xl">
            Strategy
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            What are we trying to build, for whom, and why?
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Add statement
        </Button>
      </header>

      {items.length === 0 ? (
        <p className="rounded border border-dashed border-line bg-cream-tint/40 px-5 py-8 text-sm text-muted">
          No strategy statements yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded border border-line bg-white/60 px-5 py-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="neutral"
                      label={STRATEGY_TYPE_LABELS[item.type]}
                    />
                    <Badge
                      variant="neutral"
                      label={STRATEGY_STATUS_LABELS[item.status]}
                    />
                  </div>
                  <h2 className="text-lg font-semibold text-navy">
                    {item.title}
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditing(item)}
                >
                  Edit
                </Button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-navy/85 whitespace-pre-wrap">
                {item.content}
              </p>
            </li>
          ))}
        </ul>
      )}

      <StrategyItemForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
      />
      <StrategyItemForm
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        mode="edit"
        item={editing ?? undefined}
      />
    </div>
  );
}
