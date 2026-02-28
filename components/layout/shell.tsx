import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { GlobalCommand } from "@/components/ui/command";
import { LogoutButton } from "@/components/layout/logout-button";
import { NavLinks } from "@/components/layout/nav-links";
import { SessionRefresher } from "@/components/auth/session-refresher";
import { getSessionProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getSearchData } from "@/lib/data/search";
import type { SearchData } from "@/lib/data/search";

export type { SearchData };

export async function AppShell({ children }: { children: ReactNode }) {
  const { session, profile } = await getSessionProfile();

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <main className="flex min-h-screen items-center justify-center px-6">
          {children}
        </main>
      </div>
    );
  }

  let searchData: SearchData = { cats: [], inventoryItems: [] };
  try {
    const supabase = await createSupabaseServerClient();
    searchData = await getSearchData(supabase);
  } catch {
    // non-blocking
  }

  return (
    <div className="min-h-screen bg-background">
      <SessionRefresher />
      {/* Sidebar: fixed, tidak ikut scroll */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-36 flex-col overflow-y-auto border-r border-border bg-background-elevated shadow-soft lg:flex">
        <div className="flex flex-1 flex-col px-3 py-5">
          <Link
            href="/dashboard"
            className="mb-5 flex items-center gap-2 font-semibold text-foreground hover:text-primary"
          >
            <Image
              src="/favicon.ico?v=2"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 shrink-0 rounded-lg object-contain"
              unoptimized
            />
            <span className="truncate text-sm tracking-tight">Cipao OS</span>
          </Link>

          <NavLinks />

          <div className="mt-auto pt-5 border-t border-border">
            <p className="mt-2 truncate text-xs text-muted-foreground">
              {profile?.email ?? "—"}
            </p>
            <p className="mt-0.5 text-xs capitalize text-muted-foreground">
              {profile?.role ?? "guest"}
            </p>
            <div className="mt-3">
              <LogoutButton sidebar />
            </div>
          </div>
        </div>
      </aside>

      {/* Main: area kanan dengan top bar (pencarian) + content */}
      <div className="flex min-h-screen flex-1 flex-col min-w-0 lg:pl-36">
        {/* Top bar: pencarian di atas — mobile: logo + search + logout; desktop: search + logout */}
        <header className="sticky top-0 z-20 flex min-w-0 items-center gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2 min-w-0 lg:hidden">
            <Image
              src="/favicon.ico?v=2"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 shrink-0 rounded-lg object-contain"
              unoptimized
            />
            <span className="truncate text-sm font-semibold text-foreground">Cipao OS</span>
          </Link>
          <div className="hidden min-w-0 flex-1 max-w-md lg:block">
            <GlobalCommand searchData={searchData} />
          </div>
          <div className="flex shrink-0 items-center gap-2 lg:flex-1 lg:justify-end">
            <div className="lg:hidden">
              <GlobalCommand searchData={searchData} />
            </div>
            <LogoutButton compact />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="container-app mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
