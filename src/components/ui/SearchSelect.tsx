"use client";

import { fieldControlClassName } from "@/components/ui/Field";
import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchSelectOption = {
  id: string;
  label: string;
  subtitle?: string | null;
};

export function SearchSelect({
  id,
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled = false,
  emptyLabel = "None",
  allowClear = true,
}: {
  id?: string;
  label?: string;
  placeholder: string;
  value: string;
  options: SearchSelectOption[];
  onChange: (id: string) => void;
  disabled?: boolean;
  emptyLabel?: string;
  allowClear?: boolean;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-results`;
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.id === value) ?? null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) =>
      `${option.label} ${option.subtitle ?? ""}`.toLowerCase().includes(needle),
    );
  }, [options, query]);

  function select(nextId: string) {
    onChange(nextId);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative space-y-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-navy/90">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          id={inputId}
          type="search"
          value={open ? query : selected?.label ?? ""}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          className={fieldControlClassName(undefined, "h-10 pl-9")}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (!open) return;
            const extras = allowClear ? 1 : 0;
            const count = filtered.length + extras;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((current) => (current + 1 >= count ? 0 : current + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((current) => (current - 1 < 0 ? count - 1 : current - 1));
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (allowClear && highlight === 0) select("");
              else {
                const option = filtered[highlight - extras];
                if (option) select(option.id);
              }
            }
          }}
        />
      </div>
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded border border-line bg-cream shadow-sm"
        >
          {allowClear ? (
            <li role="option" aria-selected={highlight === 0}>
              <button
                type="button"
                className={[
                  "block w-full px-3 py-2 text-left text-sm text-muted",
                  highlight === 0 ? "bg-cream-tint" : "hover:bg-cream-tint",
                ].join(" ")}
                onMouseEnter={() => setHighlight(0)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  select("");
                }}
              >
                {emptyLabel}
              </button>
            </li>
          ) : null}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">No matching records.</li>
          ) : (
            filtered.map((option, index) => {
              const optionIndex = index + (allowClear ? 1 : 0);
              return (
                <li
                  key={option.id}
                  role="option"
                  aria-selected={highlight === optionIndex}
                >
                  <button
                    type="button"
                    className={[
                      "block w-full px-3 py-2 text-left",
                      highlight === optionIndex
                        ? "bg-cream-tint"
                        : "hover:bg-cream-tint",
                    ].join(" ")}
                    onMouseEnter={() => setHighlight(optionIndex)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      select(option.id);
                    }}
                  >
                    <span className="block text-sm font-medium text-navy">
                      {option.label}
                    </span>
                    {option.subtitle ? (
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {option.subtitle}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
