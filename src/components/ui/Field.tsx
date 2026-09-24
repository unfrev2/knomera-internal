import type { ReactNode } from "react";

export type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className = "",
}: FieldProps) {
  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-[#0b1f3a]/90"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-[#f15b4a]" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-[#0b1f3a]/55">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-xs text-[#f15b4a]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

const controlBase =
  "w-full rounded border bg-white px-3 text-sm text-[#0b1f3a] transition-colors " +
  "placeholder:text-[#0b1f3a]/40 " +
  "border-[#0b1f3a]/15 hover:border-[#0b1f3a]/25 " +
  "focus:border-[#315f9e] focus:outline-none focus:ring-2 focus:ring-[#315f9e]/25 " +
  "disabled:cursor-not-allowed disabled:bg-[#efece6] disabled:opacity-70";

export function fieldControlClassName(error?: string, extra?: string) {
  return [
    controlBase,
    error ? "border-[#f15b4a]/50 focus:border-[#f15b4a] focus:ring-[#f15b4a]/20" : "",
    extra ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}
