"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client reads NEXT_PUBLIC_* directly so Next.js can inline them in the client bundle.
 * Server code continues to use lib/env.ts for validation.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Add them to .env.local in project root and restart the dev server (npm run dev).",
    );
  }
  return createBrowserClient(url.trim(), key.trim());
}

