import { fieldControlClassName } from "@/components/ui/Field";
import type { TextareaHTMLAttributes } from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
};

export function Textarea({ error, className = "", id, ...props }: TextareaProps) {
  return (
    <textarea
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={error && id ? `${id}-error` : undefined}
      className={fieldControlClassName(
        error,
        `min-h-[7rem] resize-y py-2.5 ${className}`,
      )}
      {...props}
    />
  );
}
