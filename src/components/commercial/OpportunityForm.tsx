"use client";

import {
  createOpportunityAction,
  updateOpportunityAction,
} from "@/app/actions/opportunities";
import { ObjectPicker } from "@/components/links/ObjectPicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { LinkableObject } from "@/lib/domain/linkable";
import { APP_USERS, OPPORTUNITY_STAGE_LABELS } from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import type { Opportunity } from "@/lib/types";
import { OPPORTUNITY_STAGES } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function OpportunityForm({
  open,
  onClose,
  mode,
  opportunity,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  opportunity?: Opportunity;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [organisationId, setOrganisationId] = useState(
    opportunity?.organisation_id ?? "",
  );
  const [organisationLabel, setOrganisationLabel] = useState(
    opportunity?.organisation_name ?? "",
  );

  function handleSelectOrg(item: LinkableObject) {
    if (item.type !== "organisation") return;
    setOrganisationId(item.id);
    setOrganisationLabel(item.title);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    if (!organisationId) {
      setError("Select an organisation.");
      return;
    }
    formData.set("organisation_id", organisationId);
    startTransition(async () => {
      try {
        if (mode === "edit" && opportunity) {
          formData.set("id", opportunity.id);
          await updateOpportunityAction(formData);
        } else {
          await createOpportunityAction(formData);
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
      title={mode === "edit" ? "Edit opportunity" : "Add opportunity"}
    >
      <form action={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          Track commercial validation — not a CRM. Won/lost does not become
          evidence until you interpret it.
        </p>

        <ObjectPicker
          label="Organisation"
          types={["organisation"]}
          onSelect={handleSelectOrg}
          disabled={pending}
        />
        {organisationLabel ? (
          <p className="rounded border border-line bg-cream-tint/50 px-3 py-2 text-sm text-navy">
            {organisationLabel}
          </p>
        ) : (
          <p className="text-xs text-muted">
            Organisations come from Discovery. Log a conversation first if
            needed.
          </p>
        )}

        <Field label="Title" htmlFor="opp-title" required>
          <Input
            id="opp-title"
            name="title"
            defaultValue={opportunity?.title ?? ""}
            placeholder="e.g. Paid pilot discussion"
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Stage" htmlFor="opp-stage" required>
            <Select
              id="opp-stage"
              name="stage"
              defaultValue={opportunity?.stage ?? "prospect"}
              required
            >
              {OPPORTUNITY_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {OPPORTUNITY_STAGE_LABELS[stage]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Owner" htmlFor="opp-owner">
            <Select
              id="opp-owner"
              name="owner"
              defaultValue={opportunity?.owner ?? ""}
            >
              <option value="">Unassigned</option>
              {Object.values(APP_USERS).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Potential value" htmlFor="opp-value">
            <Input
              id="opp-value"
              name="potential_value"
              type="number"
              step="0.01"
              min="0"
              defaultValue={
                opportunity?.potential_value != null
                  ? String(opportunity.potential_value)
                  : ""
              }
              placeholder="20000"
            />
          </Field>
          <Field label="Currency" htmlFor="opp-currency">
            <Input
              id="opp-currency"
              name="currency"
              defaultValue={opportunity?.currency ?? "GBP"}
            />
          </Field>
        </div>

        <Field label="Next action" htmlFor="opp-next">
          <Input
            id="opp-next"
            name="next_action"
            defaultValue={opportunity?.next_action ?? ""}
            placeholder="What needs to happen next?"
          />
        </Field>

        <Field label="Next action date" htmlFor="opp-next-date">
          <Input
            id="opp-next-date"
            name="next_action_date"
            type="date"
            defaultValue={opportunity?.next_action_date ?? ""}
          />
        </Field>

        <Field label="Outcome reason" htmlFor="opp-outcome">
          <Textarea
            id="opp-outcome"
            name="outcome_reason"
            rows={2}
            defaultValue={opportunity?.outcome_reason ?? ""}
            placeholder="If won or lost — why?"
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
            {mode === "edit" ? "Save" : "Add opportunity"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
