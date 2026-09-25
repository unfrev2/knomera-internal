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
  EVIDENCE_TYPE_LABELS,
} from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import { EVIDENCE_DIRECTIONS } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DiscoveryEvidenceForm({
  open,
  onClose,
  sessionId,
  sessionDate,
  sessionTitle,
  organisationId,
  contactId,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  sessionDate: string;
  sessionTitle: string;
  organisationId?: string | null;
  contactId?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [assumptionId, setAssumptionId] = useState("");
  const [assumptionLabel, setAssumptionLabel] = useState("");
  const [strength, setStrength] = useState(3);

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
    formData.set("discovery_session_id", sessionId);
    if (organisationId) formData.set("organisation_id", organisationId);
    if (contactId) formData.set("contact_id", contactId);
    formData.set("evidence_type", "customer_interview");
    formData.set("source", sessionTitle);
    formData.set("evidence_date", sessionDate);
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
    <Modal open={open} onClose={onClose} title="Add evidence from this conversation">
      <form action={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          Evidence still attaches to an assumption. This conversation becomes the
          provenance.
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

        <Field label="Title" htmlFor="disc-ev-title" required>
          <Input id="disc-ev-title" name="title" required />
        </Field>

        <Field label="Description" htmlFor="disc-ev-desc">
          <Textarea id="disc-ev-desc" name="description" rows={4} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Direction" htmlFor="disc-ev-direction" required>
            <Select id="disc-ev-direction" name="direction" defaultValue="supports" required>
              {EVIDENCE_DIRECTIONS.map((direction) => (
                <option key={direction} value={direction}>
                  {DIRECTION_LABELS[direction]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Strength" htmlFor="disc-ev-strength" required>
            <Select
              id="disc-ev-strength"
              name="strength"
              value={String(strength)}
              required
              onChange={(event) => setStrength(Number(event.target.value))}
            >
              {EVIDENCE_STRENGTH.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.value} — {item.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="text-xs text-muted">{strengthInfo.explanation}</p>

        <input type="hidden" name="evidence_type" value="customer_interview" />
        <p className="text-xs text-muted">
          Type: {EVIDENCE_TYPE_LABELS.customer_interview} · Date: {sessionDate} ·
          Source: {sessionTitle}
        </p>

        {error ? (
          <p className="text-sm text-coral" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={pending} disabled={!assumptionId}>
            Add evidence
          </Button>
        </div>
      </form>
    </Modal>
  );
}
