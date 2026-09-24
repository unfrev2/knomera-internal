"use client";

import {
  linkAssumptionToBetAction,
  linkProblemToBetAction,
  unlinkAssumptionFromBetAction,
  unlinkProblemFromBetAction,
} from "@/app/actions/bets";
import { BetOutcomeEvidenceForm } from "@/components/bets/BetOutcomeEvidenceForm";
import { ObjectPicker } from "@/components/links/ObjectPicker";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { LinkableObject } from "@/lib/domain/linkable";
import {
  BET_OUTCOME_RESULT_LABELS,
  BET_RELATIONSHIP_LABELS,
} from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import type {
  BetAssumptionLink,
  BetAssumptionRelationship,
  BetOutcome,
  Problem,
} from "@/lib/types";
import { BET_ASSUMPTION_RELATIONSHIPS } from "@/lib/types";
import { formatDateShort } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

function useLinkActions(betId: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(
    action: (formData: FormData) => Promise<void>,
    fields: Record<string, string>,
  ) {
    setError(null);
    const formData = new FormData();
    formData.set("bet_id", betId);
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

export function BetProblemsPanel({
  betId,
  problems,
}: {
  betId: string;
  problems: Problem[];
}) {
  const { pending, error, run } = useLinkActions(betId);

  function handleSelect(item: LinkableObject) {
    if (item.type !== "problem") return;
    run(linkProblemToBetAction, { problem_id: item.id });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-navy">Problems</h2>
        <p className="mt-1 text-sm text-muted">
          Which customer problems does this bet address?
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
                  run(unlinkProblemFromBetAction, { problem_id: problem.id })
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

export function BetAssumptionsPanel({
  betId,
  links,
}: {
  betId: string;
  links: BetAssumptionLink[];
}) {
  const { pending, error, run } = useLinkActions(betId);
  const [relationship, setRelationship] =
    useState<BetAssumptionRelationship>("tests");

  function handleSelect(item: LinkableObject) {
    if (item.type !== "assumption") return;
    run(linkAssumptionToBetAction, {
      assumption_id: item.id,
      relationship_type: relationship,
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-navy">Assumptions</h2>
        <p className="mt-1 text-sm text-muted">
          Distinguish depends on, tests, and informed by — they mean different
          things.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-48">
          <label
            htmlFor="bet-rel"
            className="mb-1.5 block text-xs font-medium text-muted"
          >
            Relationship
          </label>
          <Select
            id="bet-rel"
            value={relationship}
            onChange={(event) =>
              setRelationship(event.target.value as BetAssumptionRelationship)
            }
          >
            {BET_ASSUMPTION_RELATIONSHIPS.map((rel) => (
              <option key={rel} value={rel}>
                {BET_RELATIONSHIP_LABELS[rel]}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-0 flex-1">
          <ObjectPicker
            label="Link an assumption"
            types={["assumption"]}
            excludeIds={links.map((l) => l.assumption_id)}
            onSelect={handleSelect}
            disabled={pending}
          />
        </div>
      </div>
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
                    label={BET_RELATIONSHIP_LABELS[link.relationship_type]}
                  />
                  {link.assumption_confidence ? (
                    <Badge
                      variant="confidence"
                      value={link.assumption_confidence}
                    />
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(unlinkAssumptionFromBetAction, {
                    assumption_id: link.assumption_id,
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

export function BetOutcomesPanel({
  betId,
  betTitle,
  outcomes,
  linkedAssumptions,
  promptOutcomeId,
}: {
  betId: string;
  betTitle: string;
  outcomes: BetOutcome[];
  linkedAssumptions: BetAssumptionLink[];
  promptOutcomeId?: string | null;
}) {
  const [evidenceOutcome, setEvidenceOutcome] = useState<BetOutcome | null>(
    () =>
      promptOutcomeId
        ? (outcomes.find((o) => o.id === promptOutcomeId) ?? null)
        : null,
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-navy">Outcomes</h2>
        <p className="mt-1 text-sm text-muted">
          What happened. Evidence is created only when you choose to interpret an
          outcome as such.
        </p>
      </div>
      {outcomes.length === 0 ? (
        <p className="text-sm text-muted">No outcomes recorded yet.</p>
      ) : (
        <ul className="space-y-4">
          {outcomes.map((outcome) => (
            <li
              key={outcome.id}
              className="rounded border border-line bg-white/60 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <Badge
                    variant="neutral"
                    label={BET_OUTCOME_RESULT_LABELS[outcome.result]}
                  />
                  <p className="text-xs text-muted">
                    {formatDateShort(outcome.outcome_date)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEvidenceOutcome(outcome)}
                >
                  Create evidence
                </Button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-navy whitespace-pre-wrap">
                {outcome.summary}
              </p>
              {outcome.learning ? (
                <p className="mt-2 text-sm text-muted whitespace-pre-wrap">
                  <span className="font-medium text-navy/70">Learning: </span>
                  {outcome.learning}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {evidenceOutcome ? (
        <BetOutcomeEvidenceForm
          open
          onClose={() => setEvidenceOutcome(null)}
          betId={betId}
          betTitle={betTitle}
          outcome={evidenceOutcome}
          linkedAssumptions={linkedAssumptions}
        />
      ) : null}
    </section>
  );
}
