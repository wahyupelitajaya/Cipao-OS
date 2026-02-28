/**
 * Supabase server client for Route Handlers only.
 * Cookie set/remove work here (unlike in Server Components), so signOut() will clear auth cookies.
 */
import { createServerClient } from "@supabase/ssr";
import { env } from "./env";

type CookieStore = {
  getAll: () => { name: string; value: string }[];
  set: (name: string, value: string, options?: object) => void;
  delete: (name: string) => void;
};

export function createSupabaseRouteHandlerClient(cookieStore: CookieStore) {
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (value === "" || (options as { maxAge?: number })?.maxAge === 0) {
              cookieStore.delete(name);
            } else {
              cookieStore.set(name, value, options ?? {});
            }
          });
        } catch {
          // Ignored in contexts where cookies are read-only
        }
      },
    },
  });
}
