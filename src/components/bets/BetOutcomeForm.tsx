"use client";

import { createBetOutcomeAction } from "@/app/actions/bets";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { todayISO } from "@/lib/format";
import { BET_OUTCOME_RESULT_LABELS } from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import { BET_OUTCOME_RESULTS } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function BetOutcomeForm({
  open,
  onClose,
  betId,
}: {
  open: boolean;
  onClose: () => void;
  betId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("bet_id", betId);
    startTransition(async () => {
      try {
        await createBetOutcomeAction(formData);
        onClose();
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Record bet outcome">
      <form action={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          An outcome is not evidence until you explicitly interpret it as such.
        </p>

        <Field label="Summary" htmlFor="outcome-summary" required>
          <Textarea
            id="outcome-summary"
            name="summary"
            rows={3}
            required
            placeholder="What happened?"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Result" htmlFor="outcome-result" required>
            <Select id="outcome-result" name="result" defaultValue="mixed" required>
              {BET_OUTCOME_RESULTS.map((result) => (
                <option key={result} value={result}>
                  {BET_OUTCOME_RESULT_LABELS[result]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date" htmlFor="outcome-date" required>
            <Input
              id="outcome-date"
              name="outcome_date"
              type="date"
              defaultValue={todayISO()}
              required
            />
          </Field>
        </div>

        <Field label="Learning" htmlFor="outcome-learning">
          <Textarea
            id="outcome-learning"
            name="learning"
            rows={3}
            placeholder="What did we learn?"
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
            Record outcome
          </Button>
        </div>
      </form>
    </Modal>
  );
}
