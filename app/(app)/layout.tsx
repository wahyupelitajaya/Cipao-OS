import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/shell";
import { getSessionProfile } from "@/lib/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = await getSessionProfile();
  if (!profile) {
    redirect("/login");
  }
  return <AppShell>{children}</AppShell>;
}
