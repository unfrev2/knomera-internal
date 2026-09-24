"use client";

import { searchLinkableObjectsAction } from "@/app/actions/search";
import {
  LINKABLE_TYPE_LABELS,
  type LinkableObject,
} from "@/lib/domain/linkable";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<LinkableObject[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const next = await searchLinkableObjectsAction({
            query,
            limit: 16,
          });
          setResults(next);
          setHighlight(0);
        } catch {
          setResults([]);
        }
      });
    }, 160);
    return () => window.clearTimeout(handle);
  }, [query, open]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const grouped = results.reduce<Record<string, LinkableObject[]>>(
    (acc, item) => {
      const key = item.type;
      (acc[key] ??= []).push(item);
      return acc;
    },
    {},
  );

  const flat = results;

  function go(item: LinkableObject) {
    setOpen(false);
    setQuery("");
    router.push(item.href);
  }

  return (
    <div ref={rootRef} className={["relative", compact ? "w-full" : "w-72"].join(" ")}>
      <label className="sr-only" htmlFor="global-search">
        Search workspace
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          id="global-search"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (!open || flat.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((h) => Math.min(h + 1, flat.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              const item = flat[highlight];
              if (item) go(item);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Search…"
          className="h-9 w-full rounded border border-line bg-white/80 pr-3 pl-9 text-sm text-navy placeholder:text-muted focus:border-navy/30 focus:outline-none"
          autoComplete="off"
        />
      </div>

      {open && (query.trim() !== "" || results.length > 0) ? (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-80 overflow-y-auto rounded border border-line bg-cream shadow-lg">
          {pending && results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">No matches.</p>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type} className="border-b border-line last:border-b-0">
                <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted uppercase">
                  {LINKABLE_TYPE_LABELS[type as LinkableObject["type"]]}
                </p>
                <ul>
                  {items.map((item) => {
                    const index = flat.indexOf(item);
                    return (
                      <li key={`${item.type}:${item.id}`}>
                        <button
                          type="button"
                          className={[
                            "flex w-full flex-col px-3 py-2 text-left text-sm",
                            index === highlight
                              ? "bg-cream-tint"
                              : "hover:bg-cream-tint/60",
                          ].join(" ")}
                          onMouseEnter={() => setHighlight(index)}
                          onClick={() => go(item)}
                        >
                          <span className="font-medium text-navy">
                            {item.title}
                          </span>
                          {item.subtitle ? (
                            <span className="truncate text-xs text-muted">
                              {item.subtitle}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
