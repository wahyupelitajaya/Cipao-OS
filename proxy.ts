import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 proxy: refreshes Supabase session and updates cookies on every request.
 * This is required so that Server Components get a valid session on client-side navigation
 * (otherwise session can be stale and data disappears when changing pages).
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
