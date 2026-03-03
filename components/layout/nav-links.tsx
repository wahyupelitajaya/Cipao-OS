"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/cats", label: "Cats" },
  { href: "/health", label: "Health" },
  { href: "/grooming", label: "Grooming" },
  { href: "/inventory", label: "Inventory" },
  { href: "/activity", label: "Activity" },
  { href: "/log", label: "Log", adminOnly: true },
];

interface NavLinksProps {
  admin?: boolean;
}

export function NavLinks({ admin = false }: NavLinksProps) {
  const pathname = usePathname();
  const items = navItems.filter((item) => !item.adminOnly || admin);

  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      {items.map((item) => {
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
