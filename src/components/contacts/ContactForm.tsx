"use client";

import { createContactAction } from "@/app/actions/discovery";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { rethrowNavigation } from "@/lib/navigation";
import type { Organisation } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ContactForm({
  open,
  onClose,
  organisations,
  organisationId,
}: {
  open: boolean;
  onClose: () => void;
  organisations: Organisation[];
  organisationId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const contact = await createContactAction(formData);
        onClose();
        router.push(`/contacts/${contact.id}`);
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not create contact.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add contact">
      <form action={handleSubmit} className="space-y-4">
        <Field label="Organisation" htmlFor="contact-org" required>
          <Select
            id="contact-org"
            name="organisation_id"
            required
            defaultValue={organisationId ?? ""}
          >
            <option value="">Select an organisation</option>
            {organisations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Name" htmlFor="contact-name" required>
          <Input id="contact-name" name="name" required />
        </Field>
        <Field label="Role" htmlFor="contact-role">
          <Input id="contact-role" name="role" />
        </Field>
        <Field label="Email" htmlFor="contact-email">
          <Input id="contact-email" name="email" type="email" />
        </Field>
        <Field label="Notes" htmlFor="contact-notes">
          <Textarea id="contact-notes" name="notes" rows={3} />
        </Field>
        {error ? (
          <p className="text-sm text-coral" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" loading={pending}>
            Add contact
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
