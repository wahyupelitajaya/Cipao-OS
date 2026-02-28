import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { env } from "./env";

/**
 * Creates a Supabase server client for use in Server Components.
 * Cookie get is read from next/headers; set/remove are no-ops here because
 * Next.js only allows cookie changes in Server Actions or Route Handlers.
 * Session refresh should be done in middleware so cookies are updated there.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(_name: string, _value: string, _options: CookieOptions) {
        // No-op: cookies are read-only in Server Components.
        // Session refresh is handled in middleware.
      },
      remove(_name: string, _options: CookieOptions) {
        // No-op: cookies are read-only in Server Components.
      },
    },
  });
}

