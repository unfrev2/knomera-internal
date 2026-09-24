"use client";

import {
  linkAssumptionToDecisionAction,
  linkEvidenceToDecisionAction,
  linkProblemToDecisionAction,
  unlinkAssumptionFromDecisionAction,
  unlinkEvidenceFromDecisionAction,
  unlinkProblemFromDecisionAction,
} from "@/app/actions/decisions";
import { ObjectPicker } from "@/components/links/ObjectPicker";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { LinkableObject } from "@/lib/domain/linkable";
import { rethrowNavigation } from "@/lib/navigation";
import type { Assumption, Evidence, Problem } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

function useLinkActions(decisionId: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(
    action: (formData: FormData) => Promise<void>,
    fields: Record<string, string>,
  ) {
    setError(null);
    const formData = new FormData();
    formData.set("decision_id", decisionId);
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

export function DecisionAssumptionsPanel({
  decisionId,
  assumptions,
}: {
  decisionId: string;
  assumptions: Assumption[];
}) {
  const { pending, error, run } = useLinkActions(decisionId);

  function handleSelect(item: LinkableObject) {
    if (item.type !== "assumption") return;
    run(linkAssumptionToDecisionAction, { assumption_id: item.id });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-navy">
          Which assumptions mattered?
        </h2>
        <p className="mt-1 text-sm text-muted">
          Beliefs that influenced this decision at the time.
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
        <p className="text-sm text-muted">No assumptions linked yet.</p>
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
                <div className="flex flex-wrap gap-2">
                  <Badge variant="confidence" value={assumption.confidence} />
                  <Badge variant="status" value={assumption.status} />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(unlinkAssumptionFromDecisionAction, {
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

export function DecisionEvidencePanel({
  decisionId,
  evidence,
}: {
  decisionId: string;
  evidence: Evidence[];
}) {
  const { pending, error, run } = useLinkActions(decisionId);

  function handleSelect(item: LinkableObject) {
    if (item.type !== "evidence") return;
    run(linkEvidenceToDecisionAction, { evidence_id: item.id });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-navy">
          Which evidence influenced us?
        </h2>
        <p className="mt-1 text-sm text-muted">
          What we knew at the time — preserved even if beliefs change later.
        </p>
      </div>
      <ObjectPicker
        label="Link evidence"
        types={["evidence"]}
        excludeIds={evidence.map((e) => e.id)}
        onSelect={handleSelect}
        disabled={pending}
      />
      {error ? (
        <p className="text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}
      {evidence.length === 0 ? (
        <p className="text-sm text-muted">No evidence linked yet.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {evidence.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-navy">{item.title}</p>
                {item.assumption_statement ? (
                  <p className="text-xs text-muted">
                    On: {item.assumption_statement}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="direction" value={item.direction} />
                  <Badge
                    variant="neutral"
                    label={`Strength ${item.strength}`}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(unlinkEvidenceFromDecisionAction, {
                    evidence_id: item.id,
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

export function DecisionProblemsPanel({
  decisionId,
  problems,
}: {
  decisionId: string;
  problems: Problem[];
}) {
  const { pending, error, run } = useLinkActions(decisionId);

  function handleSelect(item: LinkableObject) {
    if (item.type !== "problem") return;
    run(linkProblemToDecisionAction, { problem_id: item.id });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-navy">Related problems</h2>
        <p className="mt-1 text-sm text-muted">
          Customer problems this decision was meant to address.
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
                onClick={() =>
                  run(unlinkProblemFromDecisionAction, {
                    problem_id: problem.id,
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
