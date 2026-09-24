"use client";

import {
  linkAssumptionToIdeaAction,
  linkProblemToIdeaAction,
  unlinkAssumptionFromIdeaAction,
  unlinkProblemFromIdeaAction,
} from "@/app/actions/ideas";
import { ObjectPicker } from "@/components/links/ObjectPicker";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { LinkableObject } from "@/lib/domain/linkable";
import { rethrowNavigation } from "@/lib/navigation";
import type { Assumption, Problem } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

function useLinkActions(ideaId: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(
    action: (formData: FormData) => Promise<void>,
    fields: Record<string, string>,
  ) {
    setError(null);
    const formData = new FormData();
    formData.set("idea_id", ideaId);
    for (const [key, value] of Object.entries(fields)) {
      formData.set(key, value);
    }
    startTransition(async () => {
      try {
        await action(formData);
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not update link.");
      }
    });
  }

  return { pending, error, run };
}

export function IdeaProblemsPanel({
  ideaId,
  problems,
}: {
  ideaId: string;
  problems: Problem[];
}) {
  const { pending, error, run } = useLinkActions(ideaId);

  function handleSelect(item: LinkableObject) {
    if (item.type !== "problem") return;
    run(linkProblemToIdeaAction, { problem_id: item.id });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-navy">Related problems</h2>
        <p className="mt-1 text-sm text-muted">
          Optional — only if this idea clearly touches a known problem.
        </p>
      </div>
      <ObjectPicker
        label="Link a problem"
        types={["problem"]}
        excludeIds={problems.map((p) => p.id)}
        onSelect={handleSelect}
        disabled={pending}
      />
      {error ? (
        <p className="text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}
      {problems.length === 0 ? (
        <p className="text-sm text-muted">No problems linked.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {problems.map((problem) => (
            <li
              key={problem.id}
              className="flex items-start justify-between gap-3 py-3"
            >
              <Link
                href={`/problems/${problem.id}`}
                className="text-sm font-medium text-navy hover:underline"
              >
                {problem.title}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(unlinkProblemFromIdeaAction, { problem_id: problem.id })
                }
              >
                Unlink
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function IdeaAssumptionsPanel({
  ideaId,
  assumptions,
}: {
  ideaId: string;
  assumptions: Assumption[];
}) {
  const { pending, error, run } = useLinkActions(ideaId);

  function handleSelect(item: LinkableObject) {
    if (item.type !== "assumption") return;
    run(linkAssumptionToIdeaAction, { assumption_id: item.id });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-navy">Related assumptions</h2>
        <p className="mt-1 text-sm text-muted">
          Light links only — ideas should not require deep analysis.
        </p>
      </div>
      <ObjectPicker
        label="Link an assumption"
        types={["assumption"]}
        excludeIds={assumptions.map((a) => a.id)}
        onSelect={handleSelect}
        disabled={pending}
      />
      {error ? (
        <p className="text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}
      {assumptions.length === 0 ? (
        <p className="text-sm text-muted">No assumptions linked.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {assumptions.map((assumption) => (
            <li
              key={assumption.id}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0 space-y-1.5">
                <Link
                  href={`/assumptions/${assumption.id}`}
                  className="block text-sm font-medium text-navy hover:underline"
                >
                  {assumption.statement}
                </Link>
                <Badge variant="confidence" value={assumption.confidence} />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(unlinkAssumptionFromIdeaAction, {
                    assumption_id: assumption.id,
                  })
                }
              >
                Unlink
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
