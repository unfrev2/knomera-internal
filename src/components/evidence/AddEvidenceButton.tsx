"use client";

import { EvidenceCaptureForm } from "@/components/evidence/EvidenceCaptureForm";
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
      <EvidenceCaptureForm
        open={open}
        onClose={() => setOpen(false)}
        prefill={prefill}
        returnTo={returnTo}
      />
    </>
  );
}
