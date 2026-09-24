"use client";

import { IdeaForm } from "@/components/ideas/IdeaForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { IDEA_STATUS_LABELS, displayName } from "@/lib/labels";
import type { Idea } from "@/lib/types";
import { IDEA_STATUSES } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type IdeasTableFilters = {
  search?: string;
  status?: string;
  submitted_by?: string;
};

export function IdeasTable({
  ideas,
  filters,
}: {
  ideas: Idea[];
  filters: IdeasTableFilters;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  function applyFilters(formData: FormData) {
    const params = new URLSearchParams();
    for (const key of ["search", "status", "submitted_by"]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `/ideas?${qs}` : "/ideas");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-navy md:text-3xl">Ideas</h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Cheap thoughts worth keeping. Not a roadmap — just a place so good
            ideas don&apos;t disappear.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Capture idea
        </Button>
      </header>

      <form action={applyFilters} className="grid gap-3 md:grid-cols-4">
        <Field label="Search" htmlFor="ideas-search" className="md:col-span-2">
          <Input
            id="ideas-search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Search ideas…"
          />
        </Field>
        <Field label="Status" htmlFor="ideas-status">
          <Select
            id="ideas-status"
            name="status"
            defaultValue={filters.status ?? ""}
          >
            <option value="">All</option>
            {IDEA_STATUSES.map((status) => (
              <option key={status} value={status}>
                {IDEA_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="submit" variant="secondary" className="w-full">
            Filter
          </Button>
        </div>
      </form>

      {ideas.length === 0 ? (
        <EmptyState
          title="No ideas yet"
          description="Capture a thought quickly. Analysis and commitment belong in Bets."
          action={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Capture idea
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-line rounded border border-line bg-white/50">
          {ideas.map((idea) => (
            <li key={idea.id} className="px-4 py-4 hover:bg-cream-tint/40">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <Link
                    href={`/ideas/${idea.id}`}
                    className="font-medium text-navy hover:underline"
                  >
                    {idea.title}
                  </Link>
                  {idea.description ? (
                    <p className="line-clamp-2 text-sm text-muted">
                      {idea.description}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted">
                    {displayName(idea.submitted_by)}
                  </p>
                </div>
                <Badge variant="idea-status" value={idea.status} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <IdeaForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
      />
    </div>
  );
}
