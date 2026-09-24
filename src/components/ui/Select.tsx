import { fieldControlClassName } from "@/components/ui/Field";
import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string;
};

export function Select({ error, className = "", id, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error && id ? `${id}-error` : undefined}
        className={fieldControlClassName(
          error,
          `h-10 appearance-none pr-9 ${className}`,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#0b1f3a]/45"
        aria-hidden
      />
    </div>
  );
}
