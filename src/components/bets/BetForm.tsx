"use client";

import {
  createBetAction,
  updateBetAction,
} from "@/app/actions/bets";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { APP_USERS, BET_STATUS_LABELS } from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import type { Bet } from "@/lib/types";
import { BET_STATUSES } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function BetForm({
  open,
  onClose,
  mode,
  bet,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  bet?: Bet;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "edit" && bet) {
          formData.set("id", bet.id);
          await updateBetAction(formData);
        } else {
          await createBetAction(formData);
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
      title={mode === "edit" ? "Edit bet" : "Create a bet"}
    >
      <form action={handleSubmit} className="space-y-4">
        <Field label="Title" htmlFor="bet-title" required>
          <Input
            id="bet-title"
            name="title"
            defaultValue={bet?.title ?? ""}
            placeholder="What are we committing to?"
            required
          />
        </Field>

        <Field label="Hypothesis" htmlFor="bet-hypothesis">
          <Textarea
            id="bet-hypothesis"
            name="hypothesis"
            rows={3}
            defaultValue={bet?.hypothesis ?? ""}
            placeholder="If we do X, we expect Y because Z"
          />
        </Field>

        <Field label="Description" htmlFor="bet-description">
          <Textarea
            id="bet-description"
            name="description"
            rows={3}
            defaultValue={bet?.description ?? ""}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="bet-status" required>
            <Select
              id="bet-status"
              name="status"
              defaultValue={bet?.status ?? "proposed"}
              required
            >
              {BET_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {BET_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Owner" htmlFor="bet-owner">
            <Select id="bet-owner" name="owner" defaultValue={bet?.owner ?? ""}>
              <option value="">Unassigned</option>
              {Object.values(APP_USERS).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Started" htmlFor="bet-started">
            <Input
              id="bet-started"
              name="started_at"
              type="date"
              defaultValue={bet?.started_at ?? ""}
            />
          </Field>
          <Field label="Target date" htmlFor="bet-target">
            <Input
              id="bet-target"
              name="target_date"
              type="date"
              defaultValue={bet?.target_date ?? ""}
            />
          </Field>
        </div>

        <Field label="Success criteria" htmlFor="bet-success">
          <Textarea
            id="bet-success"
            name="success_criteria"
            rows={2}
            defaultValue={bet?.success_criteria ?? ""}
          />
        </Field>

        <Field label="Expected outcome" htmlFor="bet-expected">
          <Textarea
            id="bet-expected"
            name="expected_outcome"
            rows={2}
            defaultValue={bet?.expected_outcome ?? ""}
          />
        </Field>

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
            {mode === "edit" ? "Save" : "Create bet"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
