"use client";

import { searchLinkableObjectsAction } from "@/app/actions/search";
import { fieldControlClassName } from "@/components/ui/Field";
import {
  LINKABLE_TYPE_LABELS,
  type LinkableObject,
  type SearchableObjectType,
} from "@/lib/domain/linkable";
import { Search } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

export type ObjectPickerProps = {
  /** Label shown above the search field. */
  label?: string;
  placeholder?: string;
  types?: SearchableObjectType[];
  excludeIds?: string[];
  /** Called when the user picks a record. */
  onSelect: (item: LinkableObject) => void;
  /** Disable interaction while a parent action runs. */
  disabled?: boolean;
  className?: string;
};

export function ObjectPicker({
  label = "Find a record",
  placeholder = "Search in this workspace…",
  types,
  excludeIds,
  onSelect,
  disabled = false,
  className = "",
}: ObjectPickerProps) {
  const inputId = useId();
  const listId = `${inputId}-results`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [results, setResults] = useState<LinkableObject[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const typesKey = (types ?? []).join(",");
  const excludeKey = (excludeIds ?? []).join(",");

  useEffect(() => {
    if (!open) return;

    const handle = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const next = await searchLinkableObjectsAction({
            query,
            types,
            excludeIds,
            limit: 12,
          });
          setResults(next);
          setHighlight(0);
        } catch {
          setResults([]);
        }
      });
    }, 180);

    return () => window.clearTimeout(handle);
  }, [query, open, typesKey, excludeKey, types, excludeIds]);

  function selectItem(item: LinkableObject) {
    onSelect(item);
    setQuery("");
    setOpen(false);
    setResults([]);
  }

  return (
    <div
      ref={rootRef}
      className={["relative space-y-1.5", className].filter(Boolean).join(" ")}
    >
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
          value={query}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          className={fieldControlClassName(undefined, "h-10 pl-9")}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (!open || results.length === 0) return;

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((current) =>
                current + 1 >= results.length ? 0 : current + 1,
              );
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((current) =>
                current - 1 < 0 ? results.length - 1 : current - 1,
              );
            } else if (event.key === "Enter" && results[highlight]) {
              event.preventDefault();
              selectItem(results[highlight]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded border border-line bg-cream shadow-sm"
        >
          {pending && results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">Searching…</li>
          ) : null}
          {!pending && results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">
              {query.trim()
                ? "No matching records."
                : "Type to search assumptions and evidence."}
            </li>
          ) : null}
          {results.map((item, index) => (
            <li
              key={`${item.type}:${item.id}`}
              role="option"
              aria-selected={index === highlight}
            >
              <button
                type="button"
                className={[
                  "block w-full px-3 py-2 text-left",
                  index === highlight ? "bg-cream-tint" : "hover:bg-cream-tint",
                ].join(" ")}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectItem(item);
                }}
              >
                <span className="text-[11px] font-medium tracking-wide text-muted uppercase">
                  {LINKABLE_TYPE_LABELS[item.type]}
                </span>
                <span className="mt-0.5 block text-sm font-medium text-navy">
                  {item.title}
                </span>
                {item.subtitle ? (
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {item.subtitle}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
