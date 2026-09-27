"use client";

import {
  acceptResearchFindingAction,
  rejectResearchFindingAction,
  runCompetitorSweepAction,
  runMarketSweepAction,
} from "@/app/actions/research";
import { EntityLink, EntityTypeMark } from "@/components/links/EntityType";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { ResearchFindingDetail } from "@/lib/db/research-findings";
import { formatDateShort } from "@/lib/format";
import {
  DIRECTION_LABELS,
  EVIDENCE_CLASS_LABELS,
  EVIDENCE_TYPE_LABELS,
  RESEARCH_FINDING_STATUS_LABELS,
  RESEARCH_TYPE_LABELS,
  displayName,
  searchProviderLabel,
} from "@/lib/labels";
import { rethrowNavigation } from "@/lib/navigation";
import type { ResearchRun } from "@/lib/types";
import { EVIDENCE_TYPES } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const REJECT_REASONS = [
  "not relevant",
  "weak source",
  "incorrect interpretation",
  "duplicate",
  "not useful",
  "other",
] as const;

export function ResearchQueueActions({
  webConfigured,
}: {
  webConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(
    action: () => Promise<{ message: string }>,
    label: string,
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await action();
        setMessage(`${label}: ${result.message}`);
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Research failed.");
      }
    });
  }

  return (
    <div className="space-y-3 rounded border border-line bg-white/60 p-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending || !webConfigured}
          loading={pending}
          onClick={() => run(runCompetitorSweepAction, "Competitor sweep")}
        >
          Run competitor sweep
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending || !webConfigured}
          loading={pending}
          onClick={() => run(runMarketSweepAction, "Market sweep")}
        >
          Run market sweep
        </Button>
      </div>
      {!webConfigured ? (
        <p className="text-sm text-muted">Web research is not configured.</p>
      ) : (
        <p className="text-sm text-muted">
          Findings land here for review. Nothing is written to Evidence until you
          accept it.
        </p>
      )}
      {message ? <p className="text-sm text-navy">{message}</p> : null}
      {error ? (
        <p className="text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function FindingCard({ finding }: { finding: ResearchFindingDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const primaryAssumption = finding.assumptions[0];
  const primarySource = finding.sources[0];
  const defaultType =
    finding.research_type === "competitor"
      ? "competitor_research"
      : "market_research";

  const [title, setTitle] = useState(() => {
    const claim = finding.claim.trim();
    if (claim.length <= 200) return claim;
    const truncated = claim.slice(0, 200);
    const lastSpace = truncated.lastIndexOf(" ");
    return (lastSpace > 120 ? truncated.slice(0, lastSpace) : truncated).trim();
  });
  const [description, setDescription] = useState(finding.summary ?? "");
  const [assumptionId, setAssumptionId] = useState(
    primaryAssumption?.assumption_id ?? "",
  );
  const [direction, setDirection] = useState<
    "supports" | "challenges" | "neutral"
  >(primaryAssumption?.direction ?? "neutral");
  const [strength, setStrength] = useState(
    String(finding.suggested_strength ?? 2),
  );
  const [evidenceType, setEvidenceType] = useState(defaultType);
  const [evidenceDate, setEvidenceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [rejectReason, setRejectReason] = useState<string>("not relevant");

  function accept() {
    setError(null);
    startTransition(async () => {
      try {
        await acceptResearchFindingAction({
          finding_id: finding.id,
          assumption_id: assumptionId,
          title,
          description: description || null,
          direction: direction as "supports" | "challenges" | "neutral",
          strength: Number(strength),
          evidence_type: evidenceType as (typeof EVIDENCE_TYPES)[number],
          evidence_date: evidenceDate,
        });
        setEditing(false);
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not accept.");
      }
    });
  }

  function reject(asDuplicate = false) {
    setError(null);
    startTransition(async () => {
      try {
        await rejectResearchFindingAction({
          finding_id: finding.id,
          reason: rejectReason,
          as_duplicate: asDuplicate || rejectReason === "duplicate",
        });
        router.refresh();
      } catch (err) {
        rethrowNavigation(err);
        setError(err instanceof Error ? err.message : "Could not reject.");
      }
    });
  }

  return (
    <li className="space-y-3 rounded border border-line bg-white/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <EntityTypeMark type="evidence" size="sm" />
            <span className="text-[11px] font-medium tracking-wide text-blue uppercase">
              {RESEARCH_TYPE_LABELS[finding.research_type]}
            </span>
            <Badge
              variant="neutral"
              label={RESEARCH_FINDING_STATUS_LABELS[finding.status]}
            />
            {finding.organisation_name ? (
              <EntityLink
                type="organisation"
                href={`/organisations/${finding.organisation_id}`}
                className="text-xs"
              >
                {finding.organisation_name}
              </EntityLink>
            ) : null}
          </div>
          <p className="text-sm font-medium text-navy">{finding.claim}</p>
          {finding.summary ? (
            <p className="text-sm text-navy/75">{finding.summary}</p>
          ) : null}
        </div>
        {finding.ai_confidence != null ? (
          <p className="text-xs text-muted">
            AI confidence {(finding.ai_confidence * 100).toFixed(0)}%
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted">
        {finding.assumptions.map((link) => (
          <span
            key={link.assumption_id}
            className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-sm bg-cream-tint px-2 py-1 ring-1 ring-line"
          >
            <EntityLink
              type="assumption"
              href={`/assumptions/${link.assumption_id}`}
              className="text-xs"
            >
              {link.assumption_statement}
            </EntityLink>
            <span>· {DIRECTION_LABELS[link.direction]}</span>
          </span>
        ))}
      </div>

      {primarySource ? (
        <p className="text-xs text-muted">
          Source:{" "}
          {primarySource.url ? (
            <a
              href={primarySource.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-navy hover:underline"
            >
              {primarySource.title} ↗
            </a>
          ) : (
            primarySource.title
          )}
          {primarySource.published_at
            ? ` · ${formatDateShort(primarySource.published_at)}`
            : ""}
        </p>
      ) : null}

      {primaryAssumption?.reason ? (
        <p className="text-xs text-muted">Why: {primaryAssumption.reason}</p>
      ) : null}

      {finding.status === "pending" ? (
        <div className="space-y-3 border-t border-line pt-3">
          {!editing ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => setEditing(true)}
              >
                Edit & accept
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => accept()}
              >
                Accept as evidence
              </Button>
              <Select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="h-8 w-auto text-xs"
              >
                {REJECT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => reject(false)}
              >
                Reject
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => reject(true)}
              >
                Duplicate
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" htmlFor={`title-${finding.id}`}>
                <Input
                  id={`title-${finding.id}`}
                  value={title}
                  maxLength={200}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>
              <Field label="Assumption" htmlFor={`assumption-${finding.id}`}>
                <Select
                  id={`assumption-${finding.id}`}
                  value={assumptionId}
                  onChange={(e) => setAssumptionId(e.target.value)}
                >
                  {finding.assumptions.map((link) => (
                    <option key={link.assumption_id} value={link.assumption_id}>
                      {link.assumption_statement}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Direction" htmlFor={`direction-${finding.id}`}>
                <Select
                  id={`direction-${finding.id}`}
                  value={direction}
                  onChange={(e) =>
                    setDirection(
                      e.target.value as "supports" | "challenges" | "neutral",
                    )
                  }
                >
                  <option value="supports">Supports</option>
                  <option value="challenges">Challenges</option>
                  <option value="neutral">Neutral</option>
                </Select>
              </Field>
              <Field label="Strength" htmlFor={`strength-${finding.id}`}>
                <Select
                  id={`strength-${finding.id}`}
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Evidence type" htmlFor={`type-${finding.id}`}>
                <Select
                  id={`type-${finding.id}`}
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                >
                  {EVIDENCE_TYPES.filter(
                    (t) =>
                      t === "competitor_research" || t === "market_research",
                  ).map((type) => (
                    <option key={type} value={type}>
                      {EVIDENCE_TYPE_LABELS[type]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Evidence date" htmlFor={`date-${finding.id}`}>
                <Input
                  id={`date-${finding.id}`}
                  type="date"
                  value={evidenceDate}
                  onChange={(e) => setEvidenceDate(e.target.value)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description" htmlFor={`desc-${finding.id}`}>
                  <Textarea
                    id={`desc-${finding.id}`}
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Field>
                <p className="mt-1 text-xs text-muted">
                  Will save as {EVIDENCE_CLASS_LABELS.secondary} · Knomera AI ·
                  Reviewed by you
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="button" disabled={pending} onClick={accept}>
                  Confirm accept
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted">
          {RESEARCH_FINDING_STATUS_LABELS[finding.status]}
          {finding.reviewed_by
            ? ` · Reviewed by ${displayName(finding.reviewed_by)}`
            : ""}
          {finding.rejection_reason ? ` · ${finding.rejection_reason}` : ""}
        </p>
      )}

      {error ? (
        <p className="text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function ResearchQueueList({
  findings,
}: {
  findings: ResearchFindingDetail[];
}) {
  if (findings.length === 0) {
    return (
      <p className="text-sm text-muted">
        No research findings waiting for review.
      </p>
    );
  }
  return (
    <ul className="space-y-4">
      {findings.map((finding) => (
        <FindingCard key={finding.id} finding={finding} />
      ))}
    </ul>
  );
}

export function ResearchRunsList({ runs }: { runs: ResearchRun[] }) {
  if (runs.length === 0) {
    return <p className="text-sm text-muted">No research runs yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded border border-line bg-white/50">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-line bg-cream-tint/60 text-xs tracking-wide text-muted uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Findings</th>
            <th className="px-4 py-3 font-medium">Search provider</th>
            <th className="px-4 py-3 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {runs.map((run) => (
            <tr key={run.id}>
              <td className="px-4 py-3 whitespace-nowrap text-navy/80">
                {formatDateShort(run.created_at.slice(0, 10))}
              </td>
              <td className="px-4 py-3">
                {RESEARCH_TYPE_LABELS[run.research_type]}
              </td>
              <td className="px-4 py-3">{run.status}</td>
              <td className="px-4 py-3 tabular-nums">{run.findings_created}</td>
              <td className="px-4 py-3 text-muted">
                {searchProviderLabel(run.search_provider)}
              </td>
              <td className="px-4 py-3 text-muted">
                {run.error ?? run.notes ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
