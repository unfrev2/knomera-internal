"use client";

import { CONFIDENCE_LABELS, IMPORTANCE_LABELS } from "@/lib/labels";
import {
  CONFIDENCE_LEVELS,
  IMPORTANCE_LEVELS,
  type Confidence,
  type Importance,
} from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo } from "react";

export type MatrixAssumption = {
  id: string;
  statement: string;
  importance: Importance;
  confidence: Confidence;
};

export type ConfidenceMatrixProps = {
  assumptions: MatrixAssumption[];
  className?: string;
};

function cellKey(importance: Importance, confidence: Confidence) {
  return `${importance}:${confidence}`;
}

export function ConfidenceMatrix({
  assumptions,
  className = "",
}: ConfidenceMatrixProps) {
  const router = useRouter();

  const grouped = useMemo(() => {
    const map = new Map<string, MatrixAssumption[]>();
    for (const item of assumptions) {
      const key = cellKey(item.importance, item.confidence);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [assumptions]);

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <div
          className="inline-grid min-w-full gap-px rounded border border-[#0b1f3a]/10 bg-[#0b1f3a]/10"
          style={{
            gridTemplateColumns: `6.5rem repeat(${CONFIDENCE_LEVELS.length}, minmax(5.5rem, 1fr))`,
          }}
          role="grid"
          aria-label="Importance and confidence matrix"
        >
          <div className="bg-[#f7f5f1] p-2" role="presentation" />
          {CONFIDENCE_LEVELS.map((confidence) => (
            <div
              key={confidence}
              className="bg-[#f7f5f1] px-2 py-2 text-center text-[11px] font-medium text-[#0b1f3a]/65"
              role="columnheader"
            >
              {CONFIDENCE_LABELS[confidence]}
            </div>
          ))}

          {IMPORTANCE_LEVELS.map((importance) => (
            <Fragment key={importance}>
              <div
                className="flex items-center bg-[#f7f5f1] px-2 py-2 text-[11px] font-medium text-[#0b1f3a]/65"
                role="rowheader"
              >
                {IMPORTANCE_LABELS[importance]}
              </div>
              {CONFIDENCE_LEVELS.map((confidence) => {
                const items =
                  grouped.get(cellKey(importance, confidence)) ?? [];
                const isHotSpot =
                  importance === "critical" && confidence === "low";
                const href = `/assumptions?importance=${importance}&confidence=${confidence}`;

                return (
                  <div
                    key={`${importance}-${confidence}`}
                    role="gridcell"
                    tabIndex={0}
                    onClick={() => router.push(href)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(href);
                      }
                    }}
                    className={[
                      "group flex min-h-[4.25rem] cursor-pointer flex-col items-start justify-between bg-white p-2.5 text-left transition-colors",
                      "hover:bg-[#efece6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#315f9e]",
                      isHotSpot
                        ? "bg-[#f15b4a]/8 ring-1 ring-inset ring-[#f15b4a]/15"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="text-lg font-semibold tabular-nums text-[#0b1f3a]">
                      {items.length}
                    </span>
                    {items.length > 0 ? (
                      <span className="flex max-w-full flex-wrap items-center gap-1">
                        {items.slice(0, 6).map((item) => (
                          <Link
                            key={item.id}
                            href={`/assumptions/${item.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="size-1.5 shrink-0 rounded-full bg-[#315f9e]/70 transition-colors hover:bg-[#315f9e]"
                            title={item.statement}
                            aria-label={item.statement}
                          />
                        ))}
                        {items.length > 6 ? (
                          <span className="text-[10px] text-[#0b1f3a]/45">
                            +{items.length - 6}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#0b1f3a]/35">—</span>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-[#0b1f3a]/55">
        Select a cell to filter assumptions. Dots link to individual items.
      </p>
    </div>
  );
}
