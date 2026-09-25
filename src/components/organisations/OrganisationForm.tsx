"use client";

import { createOrganisationAction } from "@/app/actions/discovery";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ORGANISATION_TYPE_LABELS } from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import { ORGANISATION_TYPES } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function OrganisationForm({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const org = await createOrganisationAction(formData);
        onClose();
        router.push(`/organisations/${org.id}`);
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not create organisation.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add organisation">
      <form action={handleSubmit} className="space-y-4">
        <Field label="Name" htmlFor="org-name" required>
          <Input id="org-name" name="name" required />
        </Field>
        <Field label="Website" htmlFor="org-website">
          <Input id="org-website" name="website" placeholder="https://" />
        </Field>
        <Field label="Type" htmlFor="org-type">
          <Select id="org-type" name="organisation_type" defaultValue="prospect">
            {ORGANISATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {ORGANISATION_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notes" htmlFor="org-notes">
          <Textarea id="org-notes" name="notes" rows={3} />
        </Field>
        {error ? (
          <p className="text-sm text-coral" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" loading={pending}>
            Add organisation
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
