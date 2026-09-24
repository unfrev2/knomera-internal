"use client";

import { DecisionForm } from "@/components/decisions/DecisionForm";
import { Button } from "@/components/ui/Button";
import type { Decision } from "@/lib/types";
import { useState } from "react";

export function DecisionDetailActions({ decision }: { decision: Decision }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <DecisionForm
        open={open}
        onClose={() => setOpen(false)}
        mode="edit"
        decision={decision}
      />
    </>
  );
}
