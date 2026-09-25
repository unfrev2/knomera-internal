"use client";

import { ContactForm } from "@/components/contacts/ContactForm";
import { AddEvidenceButton } from "@/components/evidence/AddEvidenceButton";
import { Button } from "@/components/ui/Button";
import type { Organisation } from "@/lib/types";
import { useState } from "react";

export function OrganisationDetailActions({
  organisation,
  organisations,
}: {
  organisation: Organisation;
  organisations: Organisation[];
}) {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => setContactOpen(true)}>
          + Add contact
        </Button>
        <AddEvidenceButton
          prefill={{ organisationId: organisation.id }}
          returnTo={`/organisations/${organisation.id}`}
        />
      </div>
      <ContactForm
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        organisations={organisations}
        organisationId={organisation.id}
      />
    </>
  );
}
