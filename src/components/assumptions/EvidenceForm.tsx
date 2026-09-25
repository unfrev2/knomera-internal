"use client";

import {
  createEvidenceAction,
  getEvidenceAttributionOptionsAction,
  updateEvidenceAction,
} from "@/app/actions/evidence";
import { EvidenceSourceFields, type EvidenceSourcePrefill } from "@/components/evidence/EvidenceSourceFields";
import { ObjectPicker } from "@/components/links/ObjectPicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { EvidenceAttributionOption } from "@/lib/db/evidence";
import type { LinkableObject } from "@/lib/domain/linkable";
import { todayISO } from "@/lib/format";
import {
  DIRECTION_LABELS,
  EVIDENCE_STRENGTH,
  EVIDENCE_TYPE_LABELS,
} from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import type { Evidence } from "@/lib/types";
import { EVIDENCE_DIRECTIONS, EVIDENCE_TYPES } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const EMPTY_OPTIONS: EvidenceAttributionOption = {
  organisations: [],
  contacts: [],
  sessions: [],
  sources: [],
};

export type EvidenceFormProps = {
  open: boolean;
  onClose: () => void;
  assumptionId?: string;
  mode?: "create" | "edit";
  evidence?: Evidence;
  sourceOptions?: string[];
  prefill?: EvidenceSourcePrefill;
  returnTo?: string;
};

export function EvidenceForm({
  open,
  onClose,
  assumptionId,
  mode = "create",
  evidence,
  prefill,
  returnTo,
}: EvidenceFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [strength, setStrength] = useState(evidence?.strength ?? 3);
  const [selectedAssumptionId, setSelectedAssumptionId] = useState(
    assumptionId ?? evidence?.assumption_id ?? "",
  );
  const [assumptionLabel, setAssumptionLabel] = useState("");
  const [options, setOptions] = useState<EvidenceAttributionOption>(EMPTY_OPTIONS);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    startTransition(async () => {
      try {
        const next = await getEvidenceAttributionOptionsAction();
        if (!cancelled) setOptions(next);
      } catch {
        if (!cancelled) setOptions(EMPTY_OPTIONS);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const strengthInfo =
    EVIDENCE_STRENGTH.find((item) => item.value === strength) ??
    EVIDENCE_STRENGTH[0];

  const title = mode === "edit" ? "Edit evidence" : "Add evidence";
  const needsAssumptionPicker = !assumptionId && mode === "create";

  function handleSelectAssumption(item: LinkableObject) {
    if (item.type !== "assumption") return;
    setSelectedAssumptionId(item.id);
    setAssumptionLabel(item.title);
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    if (!selectedAssumptionId) {
      setError("Select an assumption.");
      return;
    }
    formData.set("assumption_id", selectedAssumptionId);
    startTransition(async () => {
      try {
        if (mode === "edit" && evidence) {
          await updateEvidenceAction(evidence.id, formData);
          onClose();
          router.refresh();
        } else {
          await createEvidenceAction(formData);
          onClose();
          router.refresh();
        }
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        action={handleSubmit}
        className="space-y-5"
        key={`${open}:${evidence?.id ?? "new"}:${assumptionId ?? ""}`}
      >
        {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}

        {needsAssumptionPicker ? (
          <div className="space-y-2">
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
          </div>
        ) : (
          <input type="hidden" name="assumption_id" value={selectedAssumptionId} />
        )}

        <Field label="Title" htmlFor="evidence-title" required>
          <Input
            id="evidence-title"
            name="title"
            required
            defaultValue={evidence?.title ?? ""}
          />
        </Field>

        <Field label="Description" htmlFor="evidence-description">
          <Textarea
            id="evidence-description"
            name="description"
            rows={3}
            defaultValue={evidence?.description ?? ""}
          />
        </Field>

        <EvidenceSourceFields
          key={`${evidence?.id ?? "new"}:${prefill?.organisationId ?? ""}:${prefill?.contactId ?? ""}:${prefill?.discoverySessionId ?? ""}`}
          options={options}
          evidence={evidence}
          prefill={prefill}
          onOptionsChange={setOptions}
        />

        <Field label="Type" htmlFor="evidence_type" required>
          <Select
            id="evidence_type"
            name="evidence_type"
            required
            defaultValue={evidence?.evidence_type ?? "customer_interview"}
          >
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
          <Select
            id="direction"
            name="direction"
            required
            defaultValue={evidence?.direction ?? "supports"}
          >
            {EVIDENCE_DIRECTIONS.map((direction) => (
              <option key={direction} value={direction}>
                {DIRECTION_LABELS[direction]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Evidence date" htmlFor="evidence_date" required>
          <Input
            id="evidence_date"
            name="evidence_date"
            type="date"
            required
            defaultValue={evidence?.evidence_date ?? todayISO()}
          />
        </Field>

        {error ? (
          <p className="text-sm text-coral" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t border-line pt-5">
          <Button type="submit" loading={pending} disabled={needsAssumptionPicker && !selectedAssumptionId}>
            {mode === "edit" ? "Save changes" : "Add evidence"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
