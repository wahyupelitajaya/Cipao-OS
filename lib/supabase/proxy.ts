/**
 * Supabase session refresh for Next.js 16 proxy.
 * Must run on every request so that:
 * 1. Expired auth tokens are refreshed and cookies updated (request + response).
 * 2. Server Components receive the same refreshed session via the request.
 * Without this, session can be lost on client-side navigation and data disappears.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  // Save the original request cookies BEFORE getUser() can modify them.
  // This is critical: if getUser() internally fails (e.g. Refresh Token Rotation
  // race condition), the Supabase client calls setAll() with EMPTY cookies to
  // "clean up" the session BEFORE throwing. This clears auth cookies, even though
  // we catch the error. By saving and restoring, we prevent this.
  const originalCookies = request.cookies
    .getAll()
    .map((c) => ({ name: c.name, value: c.value }));

  let supabaseResponse = NextResponse.next({
    request,
  });

  // Track whether setAll was called successfully (i.e., getUser resolved without error)
  let getUserSucceeded = false;

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Triggers token refresh and updates cookies via setAll.
  try {
    await supabase.auth.getUser();
    getUserSucceeded = true;
  } catch {
    // getUser() failed — the Supabase client may have ALREADY called setAll()
    // with empty cookies to clear the "invalid" session. We must revert this
    // by restoring the original cookies on the request and creating a clean response.
    getUserSucceeded = false;
  }

  if (!getUserSucceeded) {
    // Restore original cookies on request so server components can read them
    for (const c of originalCookies) {
      request.cookies.set(c.name, c.value);
    }
    // Create a fresh response without any Set-Cookie headers that would clear cookies
    supabaseResponse = NextResponse.next({ request });
  }

  return supabaseResponse;
}
