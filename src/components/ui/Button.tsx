import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#0b1f3a] text-[#f7f5f1] hover:bg-[#0b1f3a]/90 border border-transparent",
  secondary:
    "bg-transparent text-[#0b1f3a] border border-[#0b1f3a]/25 hover:border-[#0b1f3a]/40 hover:bg-[#efece6]",
  ghost:
    "bg-transparent text-[#0b1f3a]/80 border border-transparent hover:bg-[#efece6] hover:text-[#0b1f3a]",
  danger:
    "bg-[#f15b4a] text-white hover:bg-[#f15b4a]/90 border border-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center rounded font-medium transition-colors whitespace-nowrap",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315f9e]",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      ) : null}
      <span
        className={[
          "inline-flex items-center justify-center gap-1.5",
          loading ? "opacity-90" : undefined,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </span>
    </button>
  );
}
