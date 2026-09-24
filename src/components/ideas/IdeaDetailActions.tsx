"use client";

import { IdeaForm } from "@/components/ideas/IdeaForm";
import { Button } from "@/components/ui/Button";
import type { Idea } from "@/lib/types";
import { useState } from "react";

export function IdeaDetailActions({ idea }: { idea: Idea }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <IdeaForm open={open} onClose={() => setOpen(false)} mode="edit" idea={idea} />
    </>
  );
}
