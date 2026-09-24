"use client";

import {
  createIdeaAction,
  updateIdeaAction,
} from "@/app/actions/ideas";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { APP_USERS, IDEA_STATUS_LABELS } from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import type { Idea } from "@/lib/types";
import { IDEA_STATUSES } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function IdeaForm({
  open,
  onClose,
  mode,
  idea,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  idea?: Idea;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "edit" && idea) {
          formData.set("id", idea.id);
          await updateIdeaAction(formData);
        } else {
          await createIdeaAction(formData);
        }
        onClose();
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Edit idea" : "Capture an idea"}
    >
      <form action={handleSubmit} className="space-y-4">
        <Field label="Title" htmlFor="idea-title" required>
          <Input
            id="idea-title"
            name="title"
            defaultValue={idea?.title ?? ""}
            placeholder="A thought worth not losing"
            required
          />
        </Field>

        <Field label="Notes" htmlFor="idea-description">
          <Textarea
            id="idea-description"
            name="description"
            rows={3}
            defaultValue={idea?.description ?? ""}
            placeholder="Optional context — keep it light"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="idea-status" required>
            <Select
              id="idea-status"
              name="status"
              defaultValue={idea?.status ?? "inbox"}
              required
            >
              {IDEA_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {IDEA_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Submitted by" htmlFor="idea-by">
            <Select
              id="idea-by"
              name="submitted_by"
              defaultValue={idea?.submitted_by ?? ""}
            >
              <option value="">Unassigned</option>
              {Object.values(APP_USERS).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {error ? (
          <p className="text-sm text-coral" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {mode === "edit" ? "Save" : "Capture idea"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
