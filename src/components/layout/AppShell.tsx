"use client";

import {
  CircleHelp,
  Compass,
  FileSearch,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  LogOut,
  Menu,
  MessagesSquare,
  Scale,
  Target,
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
    href: "/ideas",
    label: "Ideas",
    icon: Lightbulb,
    match: (path) => path.startsWith("/ideas"),
  },
  {
    href: "/bets",
    label: "Bets",
    icon: Target,
    match: (path) => path.startsWith("/bets"),
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
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Main">
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
                ? "bg-cream-tint text-navy"
                : "text-navy/65 hover:bg-cream-tint/70 hover:text-navy",
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
  compact = false,
}: Pick<AppShellProps, "signOutAction" | "onSignOut"> & {
  compact?: boolean;
}) {
  const className = compact
    ? "inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium text-navy/65 transition-colors hover:bg-cream-tint hover:text-navy"
    : "flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-navy/65 transition-colors hover:bg-cream-tint hover:text-navy";

  if (signOutAction) {
    return (
      <form action={signOutAction}>
        <button type="submit" className={className}>
          <LogOut className="size-3.5 shrink-0" aria-hidden />
          Sign out
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      className={`${className} disabled:opacity-50`}
      disabled={!onSignOut}
    >
      <LogOut className="size-3.5 shrink-0" aria-hidden />
      Sign out
    </button>
  );
}

function SidebarFooter({
  userDisplayName,
  signOutAction,
  onSignOut,
}: Pick<AppShellProps, "userDisplayName" | "signOutAction" | "onSignOut">) {
  return (
    <div className="shrink-0 border-t border-line px-4 py-4">
      <p className="truncate px-2 text-sm font-medium text-navy">
        {userDisplayName}
      </p>
      <SignOutControl signOutAction={signOutAction} onSignOut={onSignOut} />
    </div>
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

  // Close drawer on route change so sign-out / nav always feel available again.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-svh bg-cream font-sans text-navy">
      <div className="mx-auto flex min-h-svh max-w-[1400px]">
        {/* Desktop sidebar: sticky full viewport, footer always pinned */}
        <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-line bg-cream md:flex">
          <div className="shrink-0 px-5 py-6">
            <Link href="/" className="inline-block">
              <img src="/logo.png" alt="Knomera" className="h-14 w-auto" />
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            <NavLinks pathname={pathname} />
          </div>
          <SidebarFooter
            userDisplayName={userDisplayName}
            signOutAction={signOutAction}
            onSignOut={onSignOut}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar: identity + menu always visible */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-cream/95 px-4 py-3 backdrop-blur-sm md:hidden">
            <Link href="/" className="inline-block shrink-0">
              <img src="/logo.png" alt="Knomera" className="h-10 w-auto" />
            </Link>
            <div className="flex min-w-0 items-center gap-1">
              <span className="truncate text-sm font-medium text-navy">
                {userDisplayName}
              </span>
              <SignOutControl
                signOutAction={signOutAction}
                onSignOut={onSignOut}
                compact
              />
              <button
                type="button"
                className="rounded p-2 text-navy/70 hover:bg-cream-tint"
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
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-navy/35"
            onClick={closeMobile}
          />
          <aside className="relative flex h-full w-[min(100%,17rem)] flex-col bg-cream shadow-xl">
            <div className="flex shrink-0 items-center justify-between px-4 py-4">
              <img src="/logo.png" alt="Knomera" className="h-10 w-auto" />
              <button
                type="button"
                className="rounded p-2 text-navy/70 hover:bg-cream-tint"
                aria-label="Close menu"
                onClick={closeMobile}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavLinks pathname={pathname} onNavigate={closeMobile} />
            </div>
            <SidebarFooter
              userDisplayName={userDisplayName}
              signOutAction={signOutAction}
              onSignOut={onSignOut}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
