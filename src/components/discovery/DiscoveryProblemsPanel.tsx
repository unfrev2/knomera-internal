"use client";

import {
  linkProblemToDiscoveryAction,
  unlinkProblemFromDiscoveryAction,
} from "@/app/actions/discovery";
import { ObjectPicker } from "@/components/links/ObjectPicker";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { LinkableObject } from "@/lib/domain/linkable";
import { rethrowNavigation } from "@/lib/navigation";
import type { Problem } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DiscoveryProblemsPanel({
  sessionId,
  problems,
}: {
  sessionId: string;
  problems: Problem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSelect(item: LinkableObject) {
    if (item.type !== "problem") return;
    setError(null);
    const formData = new FormData();
    formData.set("discovery_session_id", sessionId);
    formData.set("problem_id", item.id);
    startTransition(async () => {
      try {
        await linkProblemToDiscoveryAction(formData);
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not link.");
      }
    });
  }

  function handleUnlink(problemId: string) {
    setError(null);
    const formData = new FormData();
    formData.set("discovery_session_id", sessionId);
    formData.set("problem_id", problemId);
    startTransition(async () => {
      try {
        await unlinkProblemFromDiscoveryAction(formData);
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not unlink.");
      }
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-navy">Problems discussed</h2>
        <p className="mt-1 text-sm text-muted">
          Which customer problems did this conversation touch?
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
        <p className="text-sm text-muted">No problems linked yet.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {problems.map((problem) => (
            <li
              key={problem.id}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0 space-y-1.5">
                <Link
                  href={`/problems/${problem.id}`}
                  className="block text-sm font-medium text-navy hover:underline"
                >
                  {problem.title}
                </Link>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="importance" value={problem.severity} />
                  <Badge variant="problem-status" value={problem.status} />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => handleUnlink(problem.id)}
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
