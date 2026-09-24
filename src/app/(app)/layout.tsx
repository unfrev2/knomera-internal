import { signOut } from "@/app/actions/auth";
import { AppShell } from "@/components/layout/AppShell";
import { PageFrame } from "@/components/layout/Page";
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
        <PageFrame width="narrow" className="py-10">
          <h1 className="text-2xl font-semibold leading-snug tracking-tight text-navy md:text-3xl">
            Database unavailable
          </h1>
          <p className="text-sm leading-relaxed text-muted">
            We could not reach the Supabase database. Check{" "}
            <code className="text-navy">DATABASE_URL</code> and your network
            connection, then refresh.
          </p>
        </PageFrame>
      </AppShell>
    );
  }

  return (
    <AppShell userDisplayName={user.displayName} signOutAction={signOut}>
      {children}
    </AppShell>
  );
}
