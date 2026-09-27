"use client";

import { runOrganisationCompetitorSweepAction } from "@/app/actions/research";
import { ContactForm } from "@/components/contacts/ContactForm";
import { AddEvidenceButton } from "@/components/evidence/AddEvidenceButton";
import { Button } from "@/components/ui/Button";
import { rethrowNavigation } from "@/lib/navigation";
import type { Organisation } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function OrganisationDetailActions({
  organisation,
  organisations,
  webConfigured,
}: {
  organisation: Organisation;
  organisations: Organisation[];
  webConfigured: boolean;
}) {
  const router = useRouter();
  const [contactOpen, setContactOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isCompetitor = organisation.organisation_type === "competitor";

  function runCompetitorSweep() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await runOrganisationCompetitorSweepAction({
          organisationId: organisation.id,
        });
        setMessage(result.message);
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Research failed.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => setContactOpen(true)}>
          + Add contact
        </Button>
        <AddEvidenceButton
          prefill={{ organisationId: organisation.id }}
          returnTo={`/organisations/${organisation.id}`}
        />
        {isCompetitor ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending || !webConfigured}
            loading={pending}
            onClick={runCompetitorSweep}
          >
            Run competitor sweep
          </Button>
        ) : null}
      </div>
      {isCompetitor && !webConfigured ? (
        <p className="text-right text-sm text-muted">
          Web research is not configured.
        </p>
      ) : null}
      {message ? (
        <p className="text-right text-sm text-navy">
          {message}{" "}
          <Link href="/evidence/research" className="text-blue hover:underline">
            View queue
          </Link>
        </p>
      ) : null}
      {error ? (
        <p className="text-right text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}
      <ContactForm
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        organisations={organisations}
        organisationId={organisation.id}
      />
    </div>
  );
}
