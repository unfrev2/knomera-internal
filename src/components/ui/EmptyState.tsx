import type { ReactNode } from "react";

export type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-start gap-2 rounded border border-dashed border-[#0b1f3a]/15",
        "bg-[#efece6]/40 px-6 py-10 text-left",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h3 className="text-base font-semibold text-[#0b1f3a]">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-[#0b1f3a]/65">
        {description}
      </p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
