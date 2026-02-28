import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/shell";
import { getSessionProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { session, profile } = await getSessionProfile();

  // Only redirect to login if there is genuinely NO session (user not logged in).
  // If session exists but profile is null (DB timeout/rate limit), stay on the page —
  // the user IS authenticated, just the profile query momentarily failed.
  if (!session) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
