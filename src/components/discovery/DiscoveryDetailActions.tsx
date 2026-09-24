"use client";

import { DiscoveryEvidenceForm } from "@/components/discovery/DiscoveryEvidenceForm";
import { DiscoverySessionForm } from "@/components/discovery/DiscoverySessionForm";
import { Button } from "@/components/ui/Button";
import type { Contact, DiscoverySession, Organisation } from "@/lib/types";
import { useState } from "react";

export function DiscoveryDetailActions({
  session,
  organisations,
  contacts,
}: {
  session: DiscoverySession;
  organisations: Organisation[];
  contacts: Contact[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
        <Button type="button" onClick={() => setEvidenceOpen(true)}>
          Add evidence
        </Button>
      </div>
      <DiscoverySessionForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        session={session}
        organisations={organisations}
        contacts={contacts}
      />
      <DiscoveryEvidenceForm
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        sessionId={session.id}
        sessionDate={session.session_date}
        sessionTitle={session.title}
      />
    </>
  );
}
