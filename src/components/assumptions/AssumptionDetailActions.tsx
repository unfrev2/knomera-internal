"use client";

import { AssumptionForm } from "@/components/assumptions/AssumptionForm";
import { EvidenceForm } from "@/components/assumptions/EvidenceForm";
import { Button } from "@/components/ui/Button";
import type { Assumption } from "@/lib/types";
import { useState } from "react";

export type AssumptionDetailActionsProps = {
  assumption: Assumption;
  sourceOptions?: string[];
};

export function AssumptionDetailActions({
  assumption,
  sourceOptions = [],
}: AssumptionDetailActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
          Edit assumption
        </Button>
        <Button type="button" onClick={() => setEvidenceOpen(true)}>
          Add evidence
        </Button>
      </div>
      <AssumptionForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        assumption={assumption}
      />
      <EvidenceForm
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        assumptionId={assumption.id}
        sourceOptions={sourceOptions}
      />
    </>
  );
}
