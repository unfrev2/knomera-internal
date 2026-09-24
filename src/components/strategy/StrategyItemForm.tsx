"use client";

import {
  createStrategyItemAction,
  updateStrategyItemAction,
} from "@/app/actions/strategy";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  STRATEGY_STATUS_LABELS,
  STRATEGY_TYPE_LABELS,
} from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import type { StrategyItem } from "@/lib/types";
import {
  STRATEGY_ITEM_STATUSES,
  STRATEGY_ITEM_TYPES,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function StrategyItemForm({
  open,
  onClose,
  mode,
  item,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  item?: StrategyItem;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "edit") {
          formData.set("id", item!.id);
          await updateStrategyItemAction(formData);
        } else {
          await createStrategyItemAction(formData);
        }
        onClose();
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Edit strategy" : "Add strategy statement"}
    >
      <form action={handleSubmit} className="space-y-4">
        <Field label="Type" htmlFor="strategy-type" required>
          <Select
            id="strategy-type"
            name="type"
            defaultValue={item?.type ?? "principle"}
            required
          >
            {STRATEGY_ITEM_TYPES.map((type) => (
              <option key={type} value={type}>
                {STRATEGY_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Title" htmlFor="strategy-title" required>
          <Input
            id="strategy-title"
            name="title"
            defaultValue={item?.title ?? ""}
            required
          />
        </Field>

        <Field label="Content" htmlFor="strategy-content" required>
          <Textarea
            id="strategy-content"
            name="content"
            rows={5}
            defaultValue={item?.content ?? ""}
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="strategy-status" required>
            <Select
              id="strategy-status"
              name="status"
              defaultValue={item?.status ?? "active"}
              required
            >
              {STRATEGY_ITEM_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STRATEGY_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sort order" htmlFor="strategy-sort">
            <Input
              id="strategy-sort"
              name="sort_order"
              type="number"
              defaultValue={item?.sort_order ?? 0}
            />
          </Field>
        </div>

        {error ? (
          <p className="text-sm text-coral" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {mode === "edit" ? "Save" : "Add"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
