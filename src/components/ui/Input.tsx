import { fieldControlClassName } from "@/components/ui/Field";
import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

export function Input({ error, className = "", id, ...props }: InputProps) {
  return (
    <input
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={error && id ? `${id}-error` : undefined}
      className={fieldControlClassName(error, `h-10 ${className}`)}
      {...props}
    />
  );
}
