"use client";

import {
  createAssumptionAction,
  updateAssumptionAction,
} from "@/app/actions/assumptions";
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
  STATUS_LABELS,
} from "@/lib/labels";
import { CATEGORIES } from "@/lib/seed/assumptions";
import type { Assumption } from "@/lib/types";
import {
  ASSUMPTION_STATUSES,
  CONFIDENCE_LEVELS,
  IMPORTANCE_LEVELS,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { rethrowNavigation } from "@/lib/navigation";

export type AssumptionFormProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  assumption?: Assumption;
  /** When set, scroll/focus confidence after save (detail page prompt). */
  focusConfidenceOnOpen?: boolean;
};

export function AssumptionForm({
  open,
  onClose,
  mode,
  assumption,
  focusConfidenceOnOpen = false,
}: AssumptionFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const title =
    mode === "create" ? "Add assumption" : "Edit assumption";

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "create") {
          await createAssumptionAction(formData);
        } else if (assumption) {
          await updateAssumptionAction(assumption.id, formData);
        }
        onClose();
        router.refresh();
      } catch (err) {
          rethrowNavigation(err);
          setError(
            err instanceof Error ? err.message : "Something went wrong.",
          );
        }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form action={handleSubmit} className="space-y-5">
        <Field label="Assumption" htmlFor="statement" required>
          <Textarea
            id="statement"
            name="statement"
            required
            defaultValue={assumption?.statement ?? ""}
            rows={3}
          />
        </Field>

        <Field label="Description" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            defaultValue={assumption?.description ?? ""}
            rows={3}
          />
        </Field>

        <Field label="Category" htmlFor="category" required>
          <Select
            id="category"
            name="category"
            required
            defaultValue={assumption?.category ?? CATEGORIES[0]}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Importance" htmlFor="importance" required>
            <Select
              id="importance"
              name="importance"
              required
              defaultValue={assumption?.importance ?? "medium"}
            >
              {IMPORTANCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {IMPORTANCE_LABELS[level]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Confidence"
            htmlFor="confidence"
            required
            hint={
              focusConfidenceOnOpen
                ? "Update founder confidence based on new evidence."
                : undefined
            }
          >
            <Select
              id="confidence"
              name="confidence"
              required
              defaultValue={assumption?.confidence ?? "low"}
              autoFocus={focusConfidenceOnOpen}
            >
              {CONFIDENCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {CONFIDENCE_LABELS[level]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Status" htmlFor="status">
          <Select
            id="status"
            name="status"
            defaultValue={assumption?.status ?? "untested"}
          >
            {ASSUMPTION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Owner" htmlFor="owner">
          <Select
            id="owner"
            name="owner"
            defaultValue={assumption?.owner ?? ""}
          >
            <option value="">Unassigned</option>
            {Object.values(APP_USERS).map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Next action" htmlFor="next_action">
          <Textarea
            id="next_action"
            name="next_action"
            defaultValue={assumption?.next_action ?? ""}
            rows={2}
          />
        </Field>

        <Field label="Target date" htmlFor="target_date">
          <Input
            id="target_date"
            name="target_date"
            type="date"
            defaultValue={assumption?.target_date ?? ""}
          />
        </Field>

        {error ? (
          <p className="text-sm text-coral" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t border-line pt-5">
          <Button type="submit" loading={pending}>
            {mode === "create" ? "Create assumption" : "Save changes"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
