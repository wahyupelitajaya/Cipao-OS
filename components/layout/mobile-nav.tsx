"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LogoutButton } from "@/components/layout/logout-button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/cats", label: "Cats" },
  { href: "/health", label: "Health" },
  { href: "/grooming", label: "Grooming" },
  { href: "/inventory", label: "Inventory" },
  { href: "/activity", label: "Aktivitas" },
];

interface MobileNavProps {
  email?: string | null;
  role?: string | null;
}

export function MobileNav({ email, role }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Buka menu navigasi"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="!left-0 !right-auto !top-0 !bottom-0 !h-full !w-72 !max-w-[85vw] !rounded-none !mx-0 border-r border-border bg-background-elevated p-0 shadow-lg"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Menu navigasi</DialogTitle>
          <div className="flex h-full flex-col px-3 py-5 pt-14">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 font-semibold text-foreground hover:text-primary"
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
            <nav className="mt-6 flex flex-1 flex-col gap-0.5">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto border-t border-border pt-5">
              <p className="truncate text-xs text-muted-foreground">{email ?? "—"}</p>
              <p className="mt-0.5 truncate text-xs capitalize text-muted-foreground">
                {role ? role.charAt(0).toUpperCase() + role.slice(1) : "Guest"}
              </p>
              <div className="mt-3">
                <LogoutButton sidebar />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
