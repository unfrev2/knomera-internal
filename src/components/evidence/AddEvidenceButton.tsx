"use client";

import { EvidenceForm } from "@/components/assumptions/EvidenceForm";
import type { EvidenceSourcePrefill } from "@/components/evidence/EvidenceSourceFields";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export function AddEvidenceButton({
  prefill,
  returnTo,
  label = "Add evidence",
}: {
  prefill?: EvidenceSourcePrefill;
  returnTo?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <EvidenceForm
        open={open}
        onClose={() => setOpen(false)}
        prefill={prefill}
        returnTo={returnTo}
      />
    </>
  );
}
