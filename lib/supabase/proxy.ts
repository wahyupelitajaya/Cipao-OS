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

  // Triggers token refresh and updates cookies via setAll.
  // Do not add logic between createServerClient and this call.
  await supabase.auth.getUser();

  // Jangan redirect di proxy: di banyak request (mis. RSC saat client navigation)
  // cookie kadang tidak terkirim ke proxy, sehingga getUser() null dan user
  // terus diarahkan ke login. Redirect ke login hanya di (app) layout.
  return supabaseResponse;
}
