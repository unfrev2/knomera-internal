"use client";

import { fieldControlClassName } from "@/components/ui/Field";
import { useEffect, useMemo, useRef, useState } from "react";

export type SourceAutocompleteProps = {
  id: string;
  name: string;
  options: string[];
  defaultValue?: string;
  placeholder?: string;
};

export function SourceAutocomplete({
  id,
  name,
  options,
  defaultValue = "",
  placeholder = "Person, document, or link",
}: SourceAutocompleteProps) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    const unique = Array.from(
      new Set(options.map((item) => item.trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));

    if (!query) return unique.slice(0, 8);

    return unique
      .filter((item) => item.toLowerCase().includes(query))
      .slice(0, 8);
  }, [options, value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [suggestions]);

  function selectSuggestion(next: string) {
    setValue(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        name={name}
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={`${id}-suggestions`}
        aria-autocomplete="list"
        className={fieldControlClassName(undefined, "h-10")}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (!open || suggestions.length === 0) return;

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlight((current) =>
              current + 1 >= suggestions.length ? 0 : current + 1,
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((current) =>
              current - 1 < 0 ? suggestions.length - 1 : current - 1,
            );
          } else if (event.key === "Enter" && suggestions[highlight]) {
            event.preventDefault();
            selectSuggestion(suggestions[highlight]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {open && suggestions.length > 0 ? (
        <ul
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded border border-line bg-cream shadow-sm"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                className={[
                  "block w-full px-3 py-2 text-left text-sm text-navy",
                  index === highlight ? "bg-cream-tint" : "hover:bg-cream-tint",
                ].join(" ")}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => {
                  // Prevent input blur before click applies the value.
                  event.preventDefault();
                  selectSuggestion(suggestion);
                }}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
