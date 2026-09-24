"use client";

import {
  createFocusItemAction,
  updateFocusItemAction,
} from "@/app/actions/focus";
import { ObjectPicker } from "@/components/links/ObjectPicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { LinkableObject } from "@/lib/domain/linkable";
import { weekStartISO } from "@/lib/format";
import {
  APP_USERS,
  FOCUS_STATUS_LABELS,
} from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import type { FocusItem } from "@/lib/types";
import { FOCUS_ITEM_STATUSES } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type LinkKind = "assumption" | "bet" | "opportunity" | null;

export function FocusItemForm({
  open,
  onClose,
  mode,
  item,
  defaultOwner,
  defaultWeekStart,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  item?: FocusItem;
  defaultOwner?: string;
  defaultWeekStart?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [linkKind, setLinkKind] = useState<LinkKind>(() => {
    if (item?.linked_assumption_id) return "assumption";
    if (item?.linked_bet_id) return "bet";
    if (item?.linked_opportunity_id) return "opportunity";
    return null;
  });
  const [linkedId, setLinkedId] = useState(
    item?.linked_assumption_id ??
      item?.linked_bet_id ??
      item?.linked_opportunity_id ??
      "",
  );
  const [linkedLabel, setLinkedLabel] = useState(
    item?.linked_assumption_statement ??
      item?.linked_bet_title ??
      item?.linked_opportunity_title ??
      "",
  );

  function handleSelectLink(selected: LinkableObject) {
    if (
      selected.type !== "assumption" &&
      selected.type !== "bet" &&
      selected.type !== "opportunity"
    ) {
      return;
    }
    setLinkKind(selected.type);
    setLinkedId(selected.id);
    setLinkedLabel(selected.title);
  }

  function clearLink() {
    setLinkKind(null);
    setLinkedId("");
    setLinkedLabel("");
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("linked_assumption_id", linkKind === "assumption" ? linkedId : "");
    formData.set("linked_bet_id", linkKind === "bet" ? linkedId : "");
    formData.set(
      "linked_opportunity_id",
      linkKind === "opportunity" ? linkedId : "",
    );
    startTransition(async () => {
      try {
        if (mode === "edit" && item) {
          formData.set("id", item.id);
          await updateFocusItemAction(formData);
        } else {
          await createFocusItemAction(formData);
        }
        onClose();
        clearLink();
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
      title={mode === "edit" ? "Edit focus" : "Add focus"}
    >
      <form action={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          What matters this week — not a backlog. Keep it short.
        </p>

        <Field label="Focus" htmlFor="focus-title" required>
          <Input
            id="focus-title"
            name="title"
            defaultValue={item?.title ?? ""}
            placeholder="One clear thing"
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Owner" htmlFor="focus-owner" required>
            <Select
              id="focus-owner"
              name="owner"
              defaultValue={item?.owner ?? defaultOwner ?? "jon"}
              required
            >
              {Object.values(APP_USERS).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="focus-status" required>
            <Select
              id="focus-status"
              name="status"
              defaultValue={item?.status ?? "active"}
              required
            >
              {FOCUS_ITEM_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {FOCUS_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Week starting (Monday)" htmlFor="focus-week" required>
          <Input
            id="focus-week"
            name="week_start"
            type="date"
            defaultValue={
              item?.week_start ?? defaultWeekStart ?? weekStartISO()
            }
            required
          />
        </Field>

        <div className="space-y-2">
          <p className="text-sm font-medium text-navy">Optional link</p>
          <ObjectPicker
            label="Link assumption, bet, or opportunity"
            types={["assumption", "bet", "opportunity"]}
            onSelect={handleSelectLink}
            disabled={pending}
          />
          {linkedLabel ? (
            <div className="flex items-center justify-between gap-2 rounded border border-line bg-cream-tint/50 px-3 py-2 text-sm text-navy">
              <span className="min-w-0 truncate">{linkedLabel}</span>
              <Button type="button" variant="ghost" size="sm" onClick={clearLink}>
                Clear
              </Button>
            </div>
          ) : null}
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
            {mode === "edit" ? "Save" : "Add focus"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
