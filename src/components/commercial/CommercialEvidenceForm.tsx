"use client";

import { createEvidenceAction } from "@/app/actions/evidence";
import { ObjectPicker } from "@/components/links/ObjectPicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { LinkableObject } from "@/lib/domain/linkable";
import { todayISO } from "@/lib/format";
import {
  DIRECTION_LABELS,
  EVIDENCE_STRENGTH,
} from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import type { Opportunity } from "@/lib/types";
import { EVIDENCE_DIRECTIONS } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function CommercialEvidenceForm({
  open,
  onClose,
  opportunity,
}: {
  open: boolean;
  onClose: () => void;
  opportunity: Opportunity;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [assumptionId, setAssumptionId] = useState("");
  const [assumptionLabel, setAssumptionLabel] = useState("");
  const [strength, setStrength] = useState(5);

  const strengthInfo =
    EVIDENCE_STRENGTH.find((item) => item.value === strength) ??
    EVIDENCE_STRENGTH[0];

  const sourceLabel = opportunity.organisation_name
    ? `${opportunity.organisation_name}: ${opportunity.title}`
    : opportunity.title;

  function handleSelectAssumption(item: LinkableObject) {
    if (item.type !== "assumption") return;
    setAssumptionId(item.id);
    setAssumptionLabel(item.title);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    if (!assumptionId) {
      setError("Select an assumption.");
      return;
    }
    formData.set("assumption_id", assumptionId);
    formData.set("opportunity_id", opportunity.id);
    formData.set("evidence_type", "commercial");
    formData.set("source", sourceLabel);
    startTransition(async () => {
      try {
        await createEvidenceAction(formData);
        onClose();
        setAssumptionId("");
        setAssumptionLabel("");
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not save evidence.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add commercial evidence">
      <form action={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          Commercial behaviour is strong signal — but only becomes evidence when
          you link it to an assumption with direction and strength.
        </p>

        <ObjectPicker
          label="Assumption"
          types={["assumption"]}
          onSelect={handleSelectAssumption}
          disabled={pending}
        />
        {assumptionLabel ? (
          <p className="rounded border border-line bg-cream-tint/50 px-3 py-2 text-sm text-navy">
            {assumptionLabel}
          </p>
        ) : null}

        <Field label="Title" htmlFor="comm-ev-title" required>
          <Input
            id="comm-ev-title"
            name="title"
            required
            placeholder="e.g. Signed £20k pilot"
          />
        </Field>

        <Field label="Description" htmlFor="comm-ev-desc">
          <Textarea
            id="comm-ev-desc"
            name="description"
            rows={3}
            placeholder="What happened commercially, and why it matters."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Direction" htmlFor="comm-ev-direction" required>
            <Select
              id="comm-ev-direction"
              name="direction"
              defaultValue="supports"
              required
            >
              {EVIDENCE_DIRECTIONS.map((direction) => (
                <option key={direction} value={direction}>
                  {DIRECTION_LABELS[direction]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date" htmlFor="comm-ev-date" required>
            <Input
              id="comm-ev-date"
              name="evidence_date"
              type="date"
              defaultValue={todayISO()}
              required
            />
          </Field>
          <Field
            label={`Strength: ${strengthInfo.label}`}
            htmlFor="comm-ev-strength"
            className="sm:col-span-2"
            required
          >
            <Input
              id="comm-ev-strength"
              name="strength"
              type="range"
              min={1}
              max={5}
              value={strength}
              onChange={(event) => setStrength(Number(event.target.value))}
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
            Create evidence
          </Button>
        </div>
      </form>
    </Modal>
  );
}
