"use client";

import {
  createDecisionAction,
  updateDecisionAction,
} from "@/app/actions/decisions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { todayISO } from "@/lib/format";
import { APP_USERS, DECISION_STATUS_LABELS } from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import type { Decision } from "@/lib/types";
import { DECISION_STATUSES } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DecisionForm({
  open,
  onClose,
  mode,
  decision,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  decision?: Decision;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "edit" && decision) {
          formData.set("id", decision.id);
          await updateDecisionAction(formData);
        } else {
          await createDecisionAction(formData);
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
      title={mode === "edit" ? "Edit decision" : "Record a decision"}
    >
      <form action={handleSubmit} className="space-y-4">
        <Field label="Title" htmlFor="decision-title" required>
          <Input
            id="decision-title"
            name="title"
            defaultValue={decision?.title ?? ""}
            placeholder="Short name for this decision"
            required
          />
        </Field>

        <Field
          label="What did we decide?"
          htmlFor="decision-body"
          required
          hint="State the decision clearly as a historical record."
        >
          <Textarea
            id="decision-body"
            name="decision"
            rows={3}
            defaultValue={decision?.decision ?? ""}
            required
          />
        </Field>

        <Field label="Context" htmlFor="decision-context">
          <Textarea
            id="decision-context"
            name="context"
            rows={3}
            defaultValue={decision?.context ?? ""}
            placeholder="What was going on when we made this?"
          />
        </Field>

        <Field label="Why?" htmlFor="decision-rationale">
          <Textarea
            id="decision-rationale"
            name="rationale"
            rows={4}
            defaultValue={decision?.rationale ?? ""}
            placeholder="The judgement we made at the time"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="decision-date" required>
            <Input
              id="decision-date"
              name="decision_date"
              type="date"
              defaultValue={decision?.decision_date ?? todayISO()}
              required
            />
          </Field>
          <Field label="Status" htmlFor="decision-status" required>
            <Select
              id="decision-status"
              name="status"
              defaultValue={decision?.status ?? "active"}
              required
            >
              {DECISION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {DECISION_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Decided by" htmlFor="decision-by">
            <Select
              id="decision-by"
              name="decided_by"
              defaultValue={decision?.decided_by ?? ""}
            >
              <option value="">Unassigned</option>
              {Object.values(APP_USERS).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Revisit date" htmlFor="decision-revisit-date">
            <Input
              id="decision-revisit-date"
              name="revisit_date"
              type="date"
              defaultValue={decision?.revisit_date ?? ""}
            />
          </Field>
        </div>

        <Field
          label="What would cause us to reconsider?"
          htmlFor="decision-revisit"
        >
          <Textarea
            id="decision-revisit"
            name="revisit_trigger"
            rows={3}
            defaultValue={decision?.revisit_trigger ?? ""}
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
            {mode === "edit" ? "Save" : "Record decision"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
