"use client";

import { ProblemForm } from "@/components/problems/ProblemForm";
import { Button } from "@/components/ui/Button";
import type { Problem } from "@/lib/types";
import { useState } from "react";

export function ProblemDetailActions({ problem }: { problem: Problem }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <ProblemForm
        open={open}
        onClose={() => setOpen(false)}
        mode="edit"
        problem={problem}
      />
    </>
  );
}
