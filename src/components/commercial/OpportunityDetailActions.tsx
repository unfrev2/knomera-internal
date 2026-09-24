"use client";

import { OpportunityForm } from "@/components/commercial/OpportunityForm";
import { CommercialEvidenceForm } from "@/components/commercial/CommercialEvidenceForm";
import { Button } from "@/components/ui/Button";
import type { Opportunity } from "@/lib/types";
import { useState } from "react";

export function OpportunityDetailActions({
  opportunity,
}: {
  opportunity: Opportunity;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
        Edit
      </Button>
      <Button type="button" onClick={() => setEvidenceOpen(true)}>
        Add evidence
      </Button>
      <OpportunityForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        opportunity={opportunity}
      />
      <CommercialEvidenceForm
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        opportunity={opportunity}
      />
    </div>
  );
}
