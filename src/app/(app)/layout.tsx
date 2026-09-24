import { signOut } from "@/app/actions/auth";
import { AppShell } from "@/components/layout/AppShell";
import { getSessionUser } from "@/lib/auth/session";
import { getWorkspaceForUser } from "@/lib/db/workspaces";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  try {
    await getWorkspaceForUser(user.workspaceSlug);
  } catch (error) {
    console.error("Workspace load failed:", error);
    return (
      <AppShell userDisplayName={user.displayName} signOutAction={signOut}>
        <div className="mx-auto max-w-lg space-y-3 py-16">
          <h1 className="text-xl font-semibold text-navy">Database unavailable</h1>
          <p className="text-sm leading-relaxed text-muted">
            We could not reach the Supabase database. Check{" "}
            <code className="text-navy">DATABASE_URL</code> and your network
            connection, then refresh.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell userDisplayName={user.displayName} signOutAction={signOut}>
      {children}
    </AppShell>
  );
}
