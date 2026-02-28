import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/shell";
import { getSessionProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppLayout({ children }: { children: ReactNode }) {
  try {
    const { profile } = await getSessionProfile();
    if (!profile) {
      redirect("/login");
    }
    return <AppShell>{children}</AppShell>;
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    redirect("/login");
  }
}
