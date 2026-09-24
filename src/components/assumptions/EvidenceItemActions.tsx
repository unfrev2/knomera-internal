"use client";

import { deleteEvidenceAction } from "@/app/actions/evidence";
import { EvidenceForm } from "@/components/assumptions/EvidenceForm";
import { Button } from "@/components/ui/Button";
import { rethrowNavigation } from "@/lib/navigation";
import type { Evidence } from "@/lib/types";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type EvidenceItemActionsProps = {
  evidence: Evidence;
  sourceOptions?: string[];
};

export function EvidenceItemActions({
  evidence,
  sourceOptions = [],
}: EvidenceItemActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete evidence “${evidence.title}”? This cannot be undone.`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await deleteEvidenceAction(evidence.id);
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not delete evidence.");
      }
    });
  }

  return (
    <>
      <div className="flex shrink-0 flex-nowrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditOpen(true)}
          aria-label="Edit evidence"
          className="shrink-0"
        >
          <Pencil className="size-3.5 shrink-0" aria-hidden />
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          loading={pending}
          onClick={handleDelete}
          aria-label="Delete evidence"
          className="shrink-0 text-coral hover:bg-coral/10"
        >
          <Trash2 className="size-3.5 shrink-0" aria-hidden />
          Delete
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-coral" role="alert">
          {error}
        </p>
      ) : null}
      <EvidenceForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        assumptionId={evidence.assumption_id}
        mode="edit"
        evidence={evidence}
        sourceOptions={sourceOptions}
      />
    </>
  );
}
