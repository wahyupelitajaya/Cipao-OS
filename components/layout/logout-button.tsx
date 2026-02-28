"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  /** Use true in header (compact), false in sidebar (full width) */
  compact?: boolean;
  /** Use true when inside sidebar (light bg) */
  sidebar?: boolean;
}

/**
 * Logout uses GET /auth/logout so the server clears auth cookies and redirects to /login.
 * Client-only signOut() was not clearing cookies correctly for the middleware.
 */
export function LogoutButton({ compact, sidebar }: LogoutButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "text-xs",
        sidebar
          ? "w-full justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
          : "text-muted-foreground hover:text-foreground",
        compact && "shrink-0",
        !compact && !sidebar && "mt-2 w-full justify-center",
      )}
      asChild
    >
      <Link href="/auth/logout">Log out</Link>
    </Button>
  );
}
