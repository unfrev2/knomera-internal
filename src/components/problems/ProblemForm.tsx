"use client";

import {
  createProblemAction,
  updateProblemAction,
} from "@/app/actions/problems";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  APP_USERS,
  CONFIDENCE_LABELS,
  IMPORTANCE_LABELS,
  PROBLEM_STATUS_LABELS,
} from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import type { Problem } from "@/lib/types";
import {
  CONFIDENCE_LEVELS,
  IMPORTANCE_LEVELS,
  PROBLEM_STATUSES,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ProblemForm({
  open,
  onClose,
  mode,
  problem,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  problem?: Problem;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "edit") {
          formData.set("id", problem!.id);
          await updateProblemAction(formData);
        } else {
          await createProblemAction(formData);
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
      title={mode === "edit" ? "Edit problem" : "Add problem"}
    >
      <form action={handleSubmit} className="space-y-4">
        <Field label="Problem" htmlFor="problem-title" required>
          <Input
            id="problem-title"
            name="title"
            defaultValue={problem?.title ?? ""}
            required
          />
        </Field>

        <Field
          label="Why it matters"
          htmlFor="problem-description"
          hint="Short description of the customer or business pain."
        >
          <Textarea
            id="problem-description"
            name="description"
            rows={4}
            defaultValue={problem?.description ?? ""}
          />
        </Field>

        <Field label="Who experiences it" htmlFor="problem-customer">
          <Textarea
            id="problem-customer"
            name="target_customer"
            rows={2}
            defaultValue={problem?.target_customer ?? ""}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Severity" htmlFor="problem-severity" required>
            <Select
              id="problem-severity"
              name="severity"
              defaultValue={problem?.severity ?? "medium"}
              required
            >
              {IMPORTANCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {IMPORTANCE_LABELS[level]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Confidence" htmlFor="problem-confidence" required>
            <Select
              id="problem-confidence"
              name="confidence"
              defaultValue={problem?.confidence ?? "low"}
              required
            >
              {CONFIDENCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {CONFIDENCE_LABELS[level]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="problem-status" required>
            <Select
              id="problem-status"
              name="status"
              defaultValue={problem?.status ?? "observed"}
              required
            >
              {PROBLEM_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PROBLEM_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Owner" htmlFor="problem-owner">
            <Select
              id="problem-owner"
              name="owner"
              defaultValue={problem?.owner ?? ""}
            >
              <option value="">Unassigned</option>
              {Object.values(APP_USERS).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </Select>
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
            {mode === "edit" ? "Save" : "Add problem"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
