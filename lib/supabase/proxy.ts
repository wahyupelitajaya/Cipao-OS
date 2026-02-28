/**
 * Supabase session handler for Next.js 16 proxy.
 *
 * IMPORTANT: We intentionally do NOT call supabase.auth.getUser() here.
 * In @supabase/ssr v0.5.x, getUser() can internally call setAll() with empty
 * cookie values to "clean up" sessions it considers invalid — even when the JWT
 * is still valid. This silently clears auth cookies and logs the user out.
 *
 * Instead, this proxy simply passes cookies through to Server Components unchanged.
 * Token refresh is handled by the browser client (createBrowserClient), which has
 * built-in auto-refresh that keeps the JWT updated in cookies before it expires.
 *
 * If the JWT has expired (user idle for 1+ hours), the browser client will refresh
 * it on the next client-side interaction, and the subsequent server request will
 * have the fresh JWT.
 */
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  // Simply pass the request through with all cookies intact.
  // Server Components will read auth cookies via cookies() from next/headers.
  return NextResponse.next({ request });
}
