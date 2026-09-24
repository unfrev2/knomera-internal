export type StatsStripProps = {
  total: number;
  critical: number;
  criticalLowConfidence: number;
  testing: number;
  supported: number;
  disproved: number;
  className?: string;
};

type StatItem = {
  label: string;
  value: number;
  emphasize?: boolean;
};

export function StatsStrip({
  total,
  critical,
  criticalLowConfidence,
  testing,
  supported,
  disproved,
  className = "",
}: StatsStripProps) {
  const items: StatItem[] = [
    { label: "Total", value: total },
    { label: "Critical", value: critical },
    {
      label: "Critical · low confidence",
      value: criticalLowConfidence,
      emphasize: criticalLowConfidence > 0,
    },
    { label: "Testing", value: testing },
    { label: "Supported", value: supported },
    { label: "Disproved", value: disproved },
  ];

  return (
    <div
      className={[
        "flex flex-wrap items-stretch divide-x divide-[#0b1f3a]/10",
        "rounded border border-[#0b1f3a]/10 bg-white/60",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Assumption summary"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={[
            "min-w-[7rem] flex-1 px-4 py-3",
            item.emphasize ? "bg-[#f15b4a]/6" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <p className="text-[11px] font-medium tracking-wide text-[#0b1f3a]/55 uppercase">
            {item.label}
          </p>
          <p
            className={[
              "mt-0.5 text-xl font-semibold tabular-nums text-[#0b1f3a]",
              item.emphasize ? "text-[#0b1f3a]" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
