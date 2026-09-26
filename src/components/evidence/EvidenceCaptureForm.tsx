"use client";

import {
  createSuggestedAssumptionAction,
  matchEvidenceAssumptionsAction,
  saveMatchedEvidenceAction,
} from "@/app/actions/evidence-matching";
import { getEvidenceAttributionOptionsAction } from "@/app/actions/evidence";
import { EvidenceForm } from "@/components/assumptions/EvidenceForm";
import { EvidenceSourceFields, type EvidenceSourcePrefill } from "@/components/evidence/EvidenceSourceFields";
import { ObjectPicker } from "@/components/links/ObjectPicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { EvidenceAttributionOption } from "@/lib/db/evidence";
import type {
  MatchingCandidateOption,
  ProposedEvidenceItem,
} from "@/lib/domain/evidence-matching";
import type { LinkableObject } from "@/lib/domain/linkable";
import { todayISO } from "@/lib/format";
import {
  DIRECTION_LABELS,
  EVIDENCE_STRENGTH,
  EVIDENCE_TYPE_LABELS,
} from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import { EVIDENCE_DIRECTIONS, EVIDENCE_TYPES } from "@/lib/types";
import { useEffect, useState, useTransition } from "react";

const EMPTY_OPTIONS: EvidenceAttributionOption = {
  organisations: [],
  contacts: [],
  sessions: [],
  sources: [],
};

type ReviewItem = ProposedEvidenceItem & {
  key: string;
  evidenceType: (typeof EVIDENCE_TYPES)[number];
};

export function EvidenceCaptureForm({
  open,
  onClose,
  prefill,
  returnTo,
}: {
  open: boolean;
  onClose: () => void;
  prefill?: EvidenceSourcePrefill;
  returnTo?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<EvidenceAttributionOption>(EMPTY_OPTIONS);
  const [rawText, setRawText] = useState("");
  const [evidenceDate, setEvidenceDate] = useState(todayISO());
  const [mode, setMode] = useState<"capture" | "review" | "manual">("capture");
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [matchCandidates, setMatchCandidates] = useState<
    MatchingCandidateOption[]
  >([]);
  const [analysedDeeperReason, setAnalysedDeeperReason] = useState<string | null>(
    null,
  );
  const [sourceSnapshot, setSourceSnapshot] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    startTransition(async () => {
      try {
        const next = await getEvidenceAttributionOptionsAction();
        if (!cancelled) setOptions(next);
      } catch {
        if (!cancelled) setOptions(EMPTY_OPTIONS);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function reset() {
    setError(null);
    setRawText("");
    setEvidenceDate(todayISO());
    setMode("capture");
    setReviewItems([]);
    setMatchCandidates([]);
    setAnalysedDeeperReason(null);
    setSourceSnapshot({});
  }

  function handleClose() {
    reset();
    onClose();
  }

  function readSourceFromForm(form: HTMLFormElement) {
    const fd = new FormData(form);
    return {
      organisation_id: String(fd.get("organisation_id") ?? "") || null,
      contact_id: String(fd.get("contact_id") ?? "") || null,
      discovery_session_id: String(fd.get("discovery_session_id") ?? "") || null,
      evidence_source_id: String(fd.get("evidence_source_id") ?? "") || null,
      new_source_type: String(fd.get("new_source_type") ?? "") || null,
      new_source_title: String(fd.get("new_source_title") ?? "") || null,
      new_source_url: String(fd.get("new_source_url") ?? "") || null,
      new_source_description:
        String(fd.get("new_source_description") ?? "") || null,
      evidence_date: String(fd.get("evidence_date") ?? todayISO()),
    };
  }

  function runMatch(forceReasoning = false) {
    setError(null);
    const form = document.getElementById(
      "evidence-capture-form",
    ) as HTMLFormElement | null;
    if (!form) return;
    const source = readSourceFromForm(form);
    setSourceSnapshot(
      Object.fromEntries(
        Object.entries(source).map(([k, v]) => [k, v ?? ""]),
      ),
    );
    setEvidenceDate(source.evidence_date);

    startTransition(async () => {
      try {
        const result = await matchEvidenceAssumptionsAction({
          rawText,
          forceReasoning,
        });
        if (process.env.NODE_ENV === "development" && result.debug) {
          console.info(
            "[evidence-matching] Find matching assumptions",
            result.debug,
          );
          console.info(
            "[evidence-matching] Result",
            result.ok
              ? {
                  path: result.path,
                  analysedDeeper: result.analysedDeeper,
                  candidatesConsidered: result.candidatesConsidered,
                  usage: result.usage,
                  proposals: result.proposals,
                }
              : { error: result.error },
          );
        }
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setAnalysedDeeperReason(result.analysedDeeperReason);
        setMatchCandidates(result.candidateAssumptions);
        setReviewItems(
          result.proposals.map((p, index) => ({
            ...p,
            key: `${index}-${p.suggestedTitle}`,
            evidenceType: "customer_interview",
            included: p.included && Boolean(p.assumptionId),
          })),
        );
        setMode("review");
      } catch (err) {
        rethrowNavigation(err);
        setError(
          "We couldn't analyse this evidence automatically. You can still add it manually.",
        );
      }
    });
  }

  function updateItem(key: string, patch: Partial<ReviewItem>) {
    setReviewItems((items) =>
      items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  function handleSelectAssumption(key: string, item: LinkableObject) {
    if (item.type !== "assumption") return;
    updateItem(key, {
      assumptionId: item.id,
      assumptionStatement: item.title,
      noMeaningfulMatch: false,
      included: true,
    });
  }

  function handlePickCandidate(
    key: string,
    candidate: MatchingCandidateOption,
  ) {
    updateItem(key, {
      assumptionId: candidate.id,
      assumptionStatement: candidate.statement,
      noMeaningfulMatch: false,
      included: true,
    });
  }

  async function handleCreateAssumption(key: string, item: ReviewItem) {
    if (!item.newAssumptionSuggestion) return;
    setError(null);
    startTransition(async () => {
      try {
        const created = await createSuggestedAssumptionAction({
          statement: item.newAssumptionSuggestion!.statement,
          category: item.newAssumptionSuggestion!.category,
          importance: item.newAssumptionSuggestion!
            .importance as "critical" | "high" | "medium" | "low",
          confidence: item.newAssumptionSuggestion!
            .confidence as "low" | "medium" | "high" | "proven",
          next_action: item.newAssumptionSuggestion!.nextAction,
        });
        updateItem(key, {
          assumptionId: created.id,
          assumptionStatement: created.statement,
          noMeaningfulMatch: false,
          newAssumptionSuggestion: null,
          included: true,
        });
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not create assumption.");
      }
    });
  }

  function handleSaveIncluded() {
    setError(null);
    const included = reviewItems.filter((i) => i.included && i.assumptionId);
    if (included.length === 0) {
      setError("Include at least one evidence item with an assumption.");
      return;
    }

    startTransition(async () => {
      try {
        await saveMatchedEvidenceAction({
          raw_text: rawText,
          evidence_date: evidenceDate,
          organisation_id: sourceSnapshot.organisation_id || null,
          contact_id: sourceSnapshot.contact_id || null,
          discovery_session_id: sourceSnapshot.discovery_session_id || null,
          evidence_source_id: sourceSnapshot.evidence_source_id || null,
          new_source_type: (sourceSnapshot.new_source_type || null) as
            | "link"
            | "free_text"
            | null,
          new_source_title: sourceSnapshot.new_source_title || null,
          new_source_url: sourceSnapshot.new_source_url || null,
          new_source_description: sourceSnapshot.new_source_description || null,
          return_to: returnTo ?? null,
          items: included.map((item) => ({
            title: item.suggestedTitle,
            description: item.claim,
            assumption_id: item.assumptionId!,
            direction: item.direction,
            strength: item.suggestedStrength,
            evidence_type: item.evidenceType,
          })),
        });
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  if (mode === "manual") {
    return (
      <EvidenceForm
        open={open}
        onClose={handleClose}
        prefill={prefill}
        returnTo={returnTo}
        initialDescription={rawText}
      />
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={mode === "review" ? "Review matched evidence" : "Add evidence"}
    >
      {mode === "capture" ? (
        <form
          id="evidence-capture-form"
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            runMatch(false);
          }}
        >
          <Field
            label="What did you learn?"
            htmlFor="raw_text"
            required
            hint="Paste notes or a short observation. Matching runs only when you ask."
          >
            <Textarea
              id="raw_text"
              name="raw_text"
              rows={5}
              required
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="They struggle to estimate how long experiments will take…"
            />
          </Field>

          <EvidenceSourceFields
            key={`capture:${prefill?.organisationId ?? ""}:${prefill?.contactId ?? ""}:${prefill?.discoverySessionId ?? ""}`}
            options={options}
            prefill={prefill}
            onOptionsChange={setOptions}
          />

          <Field label="Evidence date" htmlFor="evidence_date" required>
            <Input
              id="evidence_date"
              name="evidence_date"
              type="date"
              required
              value={evidenceDate}
              onChange={(event) => setEvidenceDate(event.target.value)}
            />
          </Field>

          {error ? (
            <p className="text-sm text-coral" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 border-t border-line pt-5">
            <Button type="submit" loading={pending} disabled={!rawText.trim()}>
              Find matching assumptions
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setMode("manual")}
            >
              Add manually
            </Button>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-navy/80">
            We found {reviewItems.length} piece
            {reviewItems.length === 1 ? "" : "s"} of evidence. Review before
            saving — nothing is written until you confirm.
          </p>
          {analysedDeeperReason ? (
            <p className="rounded border border-line bg-cream-tint/60 px-3 py-2 text-xs text-muted">
              {analysedDeeperReason}
            </p>
          ) : null}

          {reviewItems.map((item, index) => {
            const strength =
              EVIDENCE_STRENGTH.find((s) => s.value === item.suggestedStrength) ??
              EVIDENCE_STRENGTH[1];
            return (
              <div
                key={item.key}
                className="space-y-3 rounded border border-line bg-white/70 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-navy">
                    {index + 1}. {item.suggestedTitle}
                  </h3>
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={item.included}
                      onChange={(event) =>
                        updateItem(item.key, { included: event.target.checked })
                      }
                    />
                    Include
                  </label>
                </div>

                <Field label="Evidence" htmlFor={`claim-${item.key}`}>
                  <Textarea
                    id={`claim-${item.key}`}
                    rows={2}
                    value={item.claim}
                    onChange={(event) =>
                      updateItem(item.key, { claim: event.target.value })
                    }
                  />
                </Field>

                <Field label="Title" htmlFor={`title-${item.key}`}>
                  <Input
                    id={`title-${item.key}`}
                    value={item.suggestedTitle}
                    onChange={(event) =>
                      updateItem(item.key, {
                        suggestedTitle: event.target.value,
                      })
                    }
                  />
                </Field>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-navy">Assumption</p>
                  {item.assumptionStatement ? (
                    <p className="rounded border border-blue/30 bg-blue/5 px-3 py-2 text-sm text-navy">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted">
                        Selected
                      </span>
                      <span className="mt-1 block">{item.assumptionStatement}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted">
                      No strong existing assumption
                      {item.newAssumptionSuggestion
                        ? " — a new assumption was suggested below."
                        : ". Pick one from the matches below or search."}
                    </p>
                  )}

                  {matchCandidates.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted">
                        Matching assumptions — click to select
                      </p>
                      <ul className="max-h-48 space-y-1 overflow-y-auto rounded border border-line bg-cream-tint/30 p-1.5">
                        {matchCandidates.map((candidate) => {
                          const selected = item.assumptionId === candidate.id;
                          return (
                            <li key={candidate.id}>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() =>
                                  handlePickCandidate(item.key, candidate)
                                }
                                className={[
                                  "w-full rounded px-2.5 py-2 text-left text-sm transition-colors",
                                  selected
                                    ? "bg-blue/15 text-navy ring-1 ring-blue/40"
                                    : "text-navy/85 hover:bg-white hover:text-navy",
                                ].join(" ")}
                              >
                                <span className="block leading-snug">
                                  {candidate.statement}
                                </span>
                                <span className="mt-0.5 block text-xs text-muted">
                                  {candidate.category}
                                  {selected ? " · selected" : ""}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  <ObjectPicker
                    label="Or search all assumptions"
                    types={["assumption"]}
                    onSelect={(obj) => handleSelectAssumption(item.key, obj)}
                    disabled={pending}
                  />
                </div>

                {item.newAssumptionSuggestion ? (
                  <div className="rounded border border-dashed border-line px-3 py-2 text-sm">
                    <p className="font-medium text-navy">Possible new assumption</p>
                    <p className="mt-1 text-navy/80">
                      {item.newAssumptionSuggestion.statement}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {item.newAssumptionSuggestion.reasonDistinct}
                    </p>
                    <Button
                      type="button"
                      className="mt-2"
                      variant="secondary"
                      loading={pending}
                      onClick={() => handleCreateAssumption(item.key, item)}
                    >
                      Create assumption
                    </Button>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Direction" htmlFor={`dir-${item.key}`}>
                    <Select
                      id={`dir-${item.key}`}
                      value={item.direction}
                      onChange={(event) =>
                        updateItem(item.key, {
                          direction: event.target
                            .value as ReviewItem["direction"],
                        })
                      }
                    >
                      {EVIDENCE_DIRECTIONS.map((direction) => (
                        <option key={direction} value={direction}>
                          {DIRECTION_LABELS[direction]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Strength"
                    htmlFor={`str-${item.key}`}
                    hint={`${strength.label} — ${strength.explanation}`}
                  >
                    <Select
                      id={`str-${item.key}`}
                      value={String(item.suggestedStrength)}
                      onChange={(event) =>
                        updateItem(item.key, {
                          suggestedStrength: Number(event.target.value),
                        })
                      }
                    >
                      {EVIDENCE_STRENGTH.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.value}. {s.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <Field label="Type" htmlFor={`type-${item.key}`}>
                  <Select
                    id={`type-${item.key}`}
                    value={item.evidenceType}
                    onChange={(event) =>
                      updateItem(item.key, {
                        evidenceType: event.target
                          .value as ReviewItem["evidenceType"],
                      })
                    }
                  >
                    {EVIDENCE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {EVIDENCE_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                </Field>

                <p className="text-xs text-muted">
                  <span className="font-medium text-navy">Why this match? </span>
                  {item.reason}
                </p>
              </div>
            );
          })}

          {error ? (
            <p className="text-sm text-coral" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 border-t border-line pt-5">
            <Button
              type="button"
              loading={pending}
              onClick={handleSaveIncluded}
            >
              Add{" "}
              {reviewItems.filter((i) => i.included && i.assumptionId).length}{" "}
              evidence item
              {reviewItems.filter((i) => i.included && i.assumptionId).length ===
              1
                ? ""
                : "s"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => runMatch(true)}
            >
              Analyse more deeply
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setMode("capture");
                setReviewItems([]);
                setMatchCandidates([]);
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setMode("manual")}
            >
              Add manually instead
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
