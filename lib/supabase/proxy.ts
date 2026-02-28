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
  // Save original cookies BEFORE any Supabase operation.
  // The Supabase client's getUser() may internally call setAll() with EMPTY
  // cookie values to "clean up" when it considers a session invalid — even
  // without throwing an error. This clears auth cookies and logs the user out.
  // We save originals so we can revert if needed.
  const originalCookies = request.cookies
    .getAll()
    .map((c) => ({ name: c.name, value: c.value }));

  let supabaseResponse = NextResponse.next({
    request,
  });

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

  // Call getUser() to trigger token refresh and cookie updates.
  // IMPORTANT: getUser() may return user: null WITHOUT throwing, and STILL
  // call setAll() with empty cookies to clear the session. We need to detect
  // this and revert the cookie changes so the browser keeps its auth cookies.
  let shouldRevert = false;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // getUser returned null — Supabase considers session invalid.
      // But the browser client might have a valid session (just logged in).
      // Don't let the proxy clear the browser's cookies.
      shouldRevert = true;
    }
  } catch {
    // getUser threw — same situation, revert cookies.
    shouldRevert = true;
  }

  if (shouldRevert) {
    // Restore original cookies on the request so server components can read them
    for (const c of originalCookies) {
      request.cookies.set(c.name, c.value);
    }
    // Create a fresh response WITHOUT any Set-Cookie headers that would clear cookies
    supabaseResponse = NextResponse.next({ request });
  }

  return supabaseResponse;
}
