import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "./env";

/**
 * Creates a Supabase server client for use in Server Components.
 *
 * Uses the modern getAll/setAll cookie API (matching proxy.ts and route handler)
 * to ensure chunked auth cookies are properly read during RSC requests.
 * setAll is a no-op because Server Components cannot modify cookies —
 * session refresh is handled by the proxy.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // No-op: cookies are read-only in Server Components.
        // Session refresh is handled in the proxy.
      },
    },
  });
}
