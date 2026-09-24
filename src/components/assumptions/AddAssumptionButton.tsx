"use client";

import { AssumptionForm } from "@/components/assumptions/AssumptionForm";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export function AddAssumptionButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Add assumption
      </Button>
      <AssumptionForm
        open={open}
        onClose={() => setOpen(false)}
        mode="create"
      />
    </>
  );
}
