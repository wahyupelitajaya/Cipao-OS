"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/cats", label: "Cats" },
  { href: "/health", label: "Health" },
  { href: "/grooming", label: "Grooming" },
  { href: "/activity", label: "Aktivitas" },
  { href: "/inventory", label: "Inventory" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      {navItems.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-2.5 py-2 text-sm font-medium transition-colors truncate",
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
  );
}
