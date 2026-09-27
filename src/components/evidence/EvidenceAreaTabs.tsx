import Link from "next/link";

const TABS = [
  { href: "/evidence", label: "Evidence", match: (path: string) => path === "/evidence" },
  {
    href: "/evidence/research",
    label: "Research queue",
    match: (path: string) => path.startsWith("/evidence/research"),
  },
  {
    href: "/evidence/runs",
    label: "Research runs",
    match: (path: string) => path.startsWith("/evidence/runs"),
  },
] as const;

export function EvidenceAreaTabs({ currentPath }: { currentPath: string }) {
  return (
    <nav
      className="flex flex-wrap gap-1 border-b border-line"
      aria-label="Evidence area"
    >
      {TABS.map((tab) => {
        const active = tab.match(currentPath);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-navy text-navy"
                : "border-transparent text-muted hover:text-navy",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
