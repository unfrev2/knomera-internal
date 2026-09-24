"use client";

import { AssumptionForm } from "@/components/assumptions/AssumptionForm";
import { Button } from "@/components/ui/Button";
import type { Assumption } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type ConfidencePromptProps = {
  assumption: Assumption;
  show: boolean;
};

export function ConfidencePrompt({ assumption, show }: ConfidencePromptProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  if (!show) return null;

  function dismiss() {
    router.replace(`/assumptions/${assumption.id}`, { scroll: false });
  }

  return (
    <>
      <div
        className="rounded border border-blue/25 bg-blue/8 px-4 py-4"
        role="status"
      >
        <p className="text-sm leading-relaxed text-navy">
          New evidence has been added. Does this change our confidence in this
          assumption?
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => setEditOpen(true)}>
            Review confidence
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
            Not now
          </Button>
        </div>
      </div>
      <AssumptionForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        assumption={assumption}
        focusConfidenceOnOpen
      />
    </>
  );
}
