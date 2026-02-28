import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Next.js 16 proxy: runs at the edge. On client-side navigation (RSC requests),
 * cookies are not always available here, so we do NOT redirect to login in proxy.
 * Auth is enforced in app/(app)/layout.tsx via getSessionProfile() which has
 * proper cookie access in Server Components.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
