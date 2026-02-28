"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

/** Refresh interval in ms. Sering refresh agar session tidak putus (mis. di Vercel). */
const REFRESH_INTERVAL_MS = 60 * 1000; // 1 menit

/**
 * Keeps Supabase session alive by refreshing the token periodically.
 * Without this, staying on one page for longer than JWT expiry causes re-login on next navigation.
 * Renders nothing.
 */
export function SessionRefresher() {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const interval = setInterval(() => {
      supabase.auth.refreshSession().catch(() => {
        // Ignore: user may have logged out or token invalid
      });
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
  return null;
}
