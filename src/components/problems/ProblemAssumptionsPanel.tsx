"use client";

import {
  linkAssumptionToProblemAction,
  unlinkAssumptionFromProblemAction,
} from "@/app/actions/problems";
import { ObjectPicker } from "@/components/links/ObjectPicker";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PROBLEM_RELATIONSHIP_LABELS } from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import type { LinkableObject } from "@/lib/domain/linkable";
import type { ProblemAssumptionLink } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ProblemAssumptionsPanel({
  problemId,
  links,
}: {
  problemId: string;
  links: ProblemAssumptionLink[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSelect(item: LinkableObject) {
    if (item.type !== "assumption") return;
    setError(null);
    const formData = new FormData();
    formData.set("problem_id", problemId);
    formData.set("assumption_id", item.id);
    formData.set("relationship_type", "supports_problem");
    startTransition(async () => {
      try {
        await linkAssumptionToProblemAction(formData);
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not link.");
      }
    });
  }

  function handleUnlink(assumptionId: string) {
    setError(null);
    const formData = new FormData();
    formData.set("problem_id", problemId);
    formData.set("assumption_id", assumptionId);
    startTransition(async () => {
      try {
        await unlinkAssumptionFromProblemAction(formData);
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
        <h2 className="text-lg font-semibold text-navy">
          What we currently believe
        </h2>
        <p className="mt-1 text-sm text-muted">
          Linked assumptions that underpin this problem.
        </p>
      </div>

      <ObjectPicker
        label="Link an assumption"
        types={["assumption"]}
        excludeIds={links.map((link) => link.assumption_id)}
        onSelect={handleSelect}
        disabled={pending}
      />

      {error ? (
        <p className="text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}

      {links.length === 0 ? (
        <p className="text-sm text-muted">No assumptions linked yet.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {links.map((link) => (
            <li
              key={link.assumption_id}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0 space-y-1.5">
                <Link
                  href={`/assumptions/${link.assumption_id}`}
                  className="block text-sm font-medium text-navy hover:underline"
                >
                  {link.assumption_statement}
                </Link>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="neutral"
                    label={PROBLEM_RELATIONSHIP_LABELS[link.relationship_type]}
                  />
                  {link.assumption_importance ? (
                    <Badge
                      variant="importance"
                      value={link.assumption_importance}
                    />
                  ) : null}
                  {link.assumption_confidence ? (
                    <Badge
                      variant="confidence"
                      value={link.assumption_confidence}
                    />
                  ) : null}
                  {link.assumption_status ? (
                    <Badge variant="status" value={link.assumption_status} />
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => handleUnlink(link.assumption_id)}
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
