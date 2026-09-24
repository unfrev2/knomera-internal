"use client";

import { ProblemForm } from "@/components/problems/ProblemForm";
import { PageHeader } from "@/components/layout/Page";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  CONFIDENCE_LABELS,
  IMPORTANCE_LABELS,
  PROBLEM_STATUS_LABELS,
  displayName,
} from "@/lib/labels";
import type { Problem } from "@/lib/types";
import {
  CONFIDENCE_LEVELS,
  IMPORTANCE_LEVELS,
  PROBLEM_STATUSES,
} from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type ProblemsTableFilters = {
  search?: string;
  status?: string;
  severity?: string;
  confidence?: string;
  owner?: string;
};

export function ProblemsTable({
  problems,
  filters,
}: {
  problems: Problem[];
  filters: ProblemsTableFilters;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  function applyFilters(formData: FormData) {
    const params = new URLSearchParams();
    for (const key of ["search", "status", "severity", "confidence", "owner"]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `/problems?${qs}` : "/problems");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Problems"
        description="Which customer problems do we believe matter?"
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Add problem
          </Button>
        }
      />

      <form action={applyFilters} className="grid gap-3 md:grid-cols-6">
        <Field label="Search" htmlFor="problems-search" className="md:col-span-2">
          <Input
            id="problems-search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Search problems…"
          />
        </Field>
        <Field label="Severity" htmlFor="problems-severity">
          <Select
            id="problems-severity"
            name="severity"
            defaultValue={filters.severity ?? ""}
          >
            <option value="">All</option>
            {IMPORTANCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {IMPORTANCE_LABELS[level]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Confidence" htmlFor="problems-confidence">
          <Select
            id="problems-confidence"
            name="confidence"
            defaultValue={filters.confidence ?? ""}
          >
            <option value="">All</option>
            {CONFIDENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {CONFIDENCE_LABELS[level]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="problems-status">
          <Select
            id="problems-status"
            name="status"
            defaultValue={filters.status ?? ""}
          >
            <option value="">All</option>
            {PROBLEM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROBLEM_STATUS_LABELS[status]}
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

      {problems.length === 0 ? (
        <EmptyState
          title="No problems yet"
          description="Capture the customer problems Knomera is oriented around, then link the assumptions that underpin them."
          action={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Add problem
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-white/50">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-cream-tint/60 text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Problem</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Confidence</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assumptions</th>
                <th className="px-4 py-3 font-medium">Evidence</th>
                <th className="px-4 py-3 font-medium">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {problems.map((problem) => (
                <tr key={problem.id} className="hover:bg-cream-tint/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/problems/${problem.id}`}
                      className="font-medium text-navy hover:underline"
                    >
                      {problem.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="importance" value={problem.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="confidence" value={problem.confidence} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="problem-status" value={problem.status} />
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {problem.linked_assumption_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {problem.evidence_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-navy/80">
                    {displayName(problem.owner)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProblemForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
      />
    </div>
  );
}
