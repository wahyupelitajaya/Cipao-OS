"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  /** Use true in header (compact), false in sidebar (full width) */
  compact?: boolean;
  /** Use true when inside sidebar (light bg) */
  sidebar?: boolean;
}

/**
 * Logout button that navigates to /auth/logout via full page navigation.
 *
 * IMPORTANT: We use window.location.href instead of <Link> because Next.js
 * automatically prefetches <Link> destinations. If we used <Link href="/auth/logout">,
 * Next.js would prefetch the logout route in the background, which calls signOut()
 * and clears all auth cookies — logging the user out unexpectedly.
 */
export function LogoutButton({ compact, sidebar }: LogoutButtonProps) {
  function handleLogout() {
    window.location.href = "/auth/logout";
  }

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
      onClick={handleLogout}
    >
      Log out
    </Button>
  );
}
