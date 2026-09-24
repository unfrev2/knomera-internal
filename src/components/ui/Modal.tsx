"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Modal({ open, onClose, title, children }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[#0b1f3a]/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[
          "relative z-10 flex h-full w-full max-w-lg flex-col",
          "border-l border-[#0b1f3a]/10 bg-[#f7f5f1] shadow-xl",
          "outline-none",
          "max-md:max-w-none",
        ].join(" ")}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#0b1f3a]/10 px-5 py-4 md:px-6">
          <h2
            id={titleId}
            className="text-lg font-semibold leading-snug text-[#0b1f3a]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-[#0b1f3a]/60 transition-colors hover:bg-[#efece6] hover:text-[#0b1f3a]"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">{children}</div>
      </aside>
    </div>
  );
}
