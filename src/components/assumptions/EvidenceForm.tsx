"use client";

import { createEvidenceAction } from "@/app/actions/evidence";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { todayISO } from "@/lib/format";
import {
  DIRECTION_LABELS,
  EVIDENCE_STRENGTH,
  EVIDENCE_TYPE_LABELS,
} from "@/lib/labels";
import { EVIDENCE_DIRECTIONS, EVIDENCE_TYPES } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { rethrowNavigation } from "@/lib/navigation";

export type EvidenceFormProps = {
  open: boolean;
  onClose: () => void;
  assumptionId: string;
};

export function EvidenceForm({
  open,
  onClose,
  assumptionId,
}: EvidenceFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [strength, setStrength] = useState(3);

  const strengthInfo =
    EVIDENCE_STRENGTH.find((item) => item.value === strength) ??
    EVIDENCE_STRENGTH[0];

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createEvidenceAction(formData);
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
    <Modal open={open} onClose={onClose} title="Add evidence">
      <form action={handleSubmit} className="space-y-5">
        <input type="hidden" name="assumption_id" value={assumptionId} />

        <Field label="Title" htmlFor="evidence-title" required>
          <Input id="evidence-title" name="title" required />
        </Field>

        <Field label="Description" htmlFor="evidence-description">
          <Textarea id="evidence-description" name="description" rows={3} />
        </Field>

        <Field label="Type" htmlFor="evidence_type" required>
          <Select id="evidence_type" name="evidence_type" required defaultValue="customer_interview">
            {EVIDENCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {EVIDENCE_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Strength"
          htmlFor="strength"
          required
          hint={`${strengthInfo.label} — ${strengthInfo.explanation}`}
        >
          <Select
            id="strength"
            name="strength"
            required
            value={String(strength)}
            onChange={(event) => setStrength(Number(event.target.value))}
          >
            {EVIDENCE_STRENGTH.map((item) => (
              <option key={item.value} value={item.value}>
                {item.value}. {item.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Direction" htmlFor="direction" required>
          <Select id="direction" name="direction" required defaultValue="supports">
            {EVIDENCE_DIRECTIONS.map((direction) => (
              <option key={direction} value={direction}>
                {DIRECTION_LABELS[direction]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Source" htmlFor="source">
          <Input id="source" name="source" placeholder="Person, document, or link" />
        </Field>

        <Field label="Evidence date" htmlFor="evidence_date" required>
          <Input
            id="evidence_date"
            name="evidence_date"
            type="date"
            required
            defaultValue={todayISO()}
          />
        </Field>

        {error ? (
          <p className="text-sm text-coral" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t border-line pt-5">
          <Button type="submit" loading={pending}>
            Add evidence
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
