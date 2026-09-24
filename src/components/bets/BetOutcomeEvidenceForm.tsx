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
import {
  DIRECTION_LABELS,
  EVIDENCE_STRENGTH,
} from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import type { BetAssumptionLink, BetOutcome } from "@/lib/types";
import { EVIDENCE_DIRECTIONS } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function BetOutcomeEvidenceForm({
  open,
  onClose,
  betId,
  betTitle,
  outcome,
  linkedAssumptions,
}: {
  open: boolean;
  onClose: () => void;
  betId: string;
  betTitle: string;
  outcome: BetOutcome;
  linkedAssumptions: BetAssumptionLink[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [assumptionId, setAssumptionId] = useState("");
  const [assumptionLabel, setAssumptionLabel] = useState("");
  const [strength, setStrength] = useState(3);

  useEffect(() => {
    if (!open) return;
    if (linkedAssumptions.length === 1) {
      setAssumptionId(linkedAssumptions[0].assumption_id);
      setAssumptionLabel(linkedAssumptions[0].assumption_statement ?? "");
    }
  }, [open, linkedAssumptions]);

  const strengthInfo =
    EVIDENCE_STRENGTH.find((item) => item.value === strength) ??
    EVIDENCE_STRENGTH[0];

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
    formData.set("bet_outcome_id", outcome.id);
    formData.set("bet_id", betId);
    formData.set("evidence_type", "bet_outcome");
    formData.set("source", betTitle);
    formData.set("evidence_date", outcome.outcome_date);
    if (!formData.get("title")) {
      formData.set("title", `Outcome: ${outcome.summary.slice(0, 80)}`);
    }
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
    <Modal
      open={open}
      onClose={onClose}
      title="Turn outcome into evidence?"
    >
      <form action={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          Does this outcome provide evidence for any of the assumptions linked
          to this bet? Only create evidence if you are making that interpretation
          deliberately.
        </p>

        <div className="rounded border border-line bg-cream-tint/50 px-3 py-2 text-sm text-navy">
          <p className="font-medium">{outcome.summary}</p>
          {outcome.learning ? (
            <p className="mt-1 text-muted">{outcome.learning}</p>
          ) : null}
        </div>

        {linkedAssumptions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              Linked assumptions
            </p>
            <ul className="space-y-1">
              {linkedAssumptions.map((link) => (
                <li key={link.assumption_id}>
                  <button
                    type="button"
                    className={[
                      "w-full rounded border px-3 py-2 text-left text-sm transition-colors",
                      assumptionId === link.assumption_id
                        ? "border-navy/30 bg-navy/5 text-navy"
                        : "border-line text-navy/80 hover:bg-cream-tint/50",
                    ].join(" ")}
                    onClick={() => {
                      setAssumptionId(link.assumption_id);
                      setAssumptionLabel(link.assumption_statement ?? "");
                    }}
                  >
                    {link.assumption_statement}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ObjectPicker
            label="Assumption"
            types={["assumption"]}
            onSelect={handleSelectAssumption}
            disabled={pending}
          />
        )}

        {assumptionLabel ? (
          <p className="rounded border border-line bg-cream-tint/50 px-3 py-2 text-sm text-navy">
            {assumptionLabel}
          </p>
        ) : null}

        <Field label="Evidence title" htmlFor="bet-ev-title" required>
          <Input
            id="bet-ev-title"
            name="title"
            defaultValue={`Outcome: ${outcome.summary.slice(0, 80)}`}
            required
          />
        </Field>

        <Field label="Description" htmlFor="bet-ev-desc">
          <Textarea
            id="bet-ev-desc"
            name="description"
            rows={3}
            defaultValue={outcome.learning ?? outcome.summary}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Direction" htmlFor="bet-ev-direction" required>
            <Select
              id="bet-ev-direction"
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
          <Field
            label={`Strength: ${strengthInfo.label}`}
            htmlFor="bet-ev-strength"
            required
          >
            <Input
              id="bet-ev-strength"
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
            Skip
          </Button>
          <Button type="submit" loading={pending}>
            Create evidence
          </Button>
        </div>
      </form>
    </Modal>
  );
}
