"use client";

import {
  CircleHelp,
  Compass,
  FileSearch,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessagesSquare,
  Scale,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match: (path: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Overview",
    icon: LayoutDashboard,
    match: (path) => path === "/" || path.startsWith("/overview"),
  },
  {
    href: "/strategy",
    label: "Strategy",
    icon: Compass,
    match: (path) => path.startsWith("/strategy"),
  },
  {
    href: "/problems",
    label: "Problems",
    icon: CircleHelp,
    match: (path) => path.startsWith("/problems"),
  },
  {
    href: "/assumptions",
    label: "Assumptions",
    icon: ListChecks,
    match: (path) => path.startsWith("/assumptions"),
  },
  {
    href: "/discovery",
    label: "Discovery",
    icon: MessagesSquare,
    match: (path) => path.startsWith("/discovery"),
  },
  {
    href: "/decisions",
    label: "Decisions",
    icon: Scale,
    match: (path) => path.startsWith("/decisions"),
  },
  {
    href: "/evidence",
    label: "Evidence",
    icon: FileSearch,
    match: (path) => path.startsWith("/evidence"),
  },
];

export type AppShellProps = {
  userDisplayName: string;
  children: ReactNode;
  currentPath?: string;
  /** Server action for `<form action={…}>`. Prefer passing from a server layout. */
  signOutAction?: () => void | Promise<void>;
  /** Fallback when no server action is wired yet. */
  onSignOut?: () => void;
};

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={[
              "flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-[#efece6] text-[#0b1f3a]"
                : "text-[#0b1f3a]/65 hover:bg-[#efece6]/70 hover:text-[#0b1f3a]",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-[18px] shrink-0 opacity-80" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SignOutControl({
  signOutAction,
  onSignOut,
}: Pick<AppShellProps, "signOutAction" | "onSignOut">) {
  if (signOutAction) {
    return (
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-[#0b1f3a]/65 transition-colors hover:bg-[#efece6] hover:text-[#0b1f3a]"
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          Sign out
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-[#0b1f3a]/65 transition-colors hover:bg-[#efece6] hover:text-[#0b1f3a] disabled:opacity-50"
      disabled={!onSignOut}
    >
      <LogOut className="size-4 shrink-0" aria-hidden />
      Sign out
    </button>
  );
}

export function AppShell({
  userDisplayName,
  children,
  currentPath,
  signOutAction,
  onSignOut,
}: AppShellProps) {
  const pathnameFromHook = usePathname();
  const pathname = currentPath ?? pathnameFromHook ?? "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobile();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen, closeMobile]);

  const sidebarFooter = (
    <div className="border-t border-[#0b1f3a]/10 px-4 py-4">
      <p className="truncate px-2 text-sm font-medium text-[#0b1f3a]">
        {userDisplayName}
      </p>
      <SignOutControl signOutAction={signOutAction} onSignOut={onSignOut} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f5f1] font-[family-name:var(--font-outfit,'Outfit',system-ui,sans-serif)] text-[#0b1f3a]">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-[#0b1f3a]/10 bg-[#f7f5f1] md:flex">
          <div className="px-5 py-6">
            <Link href="/" className="inline-block">
              <img
                src="/logo.png"
                alt="Knomera"
                className="h-14 w-auto"
              />
            </Link>
          </div>
          <NavLinks pathname={pathname} />
          {sidebarFooter}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[#0b1f3a]/10 bg-[#f7f5f1] px-4 py-3 md:hidden">
            <Link href="/" className="inline-block">
              <img
                src="/logo.png"
                alt="Knomera"
                className="h-12 w-auto"
              />
            </Link>
            <button
              type="button"
              className="rounded p-2 text-[#0b1f3a]/70 hover:bg-[#efece6]"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? (
                <X className="size-5" aria-hidden />
              ) : (
                <Menu className="size-5" aria-hidden />
              )}
            </button>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-[#0b1f3a]/35"
            onClick={closeMobile}
          />
          <aside className="relative flex h-full w-[min(100%,17rem)] flex-col bg-[#f7f5f1] shadow-xl">
            <div className="flex items-center justify-between px-4 py-4">
              <img
                src="/logo.png"
                alt="Knomera"
                className="h-12 w-auto"
              />
              <button
                type="button"
                className="rounded p-2 text-[#0b1f3a]/70 hover:bg-[#efece6]"
                aria-label="Close menu"
                onClick={closeMobile}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={closeMobile} />
            {sidebarFooter}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
