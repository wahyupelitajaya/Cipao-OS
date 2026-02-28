import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
    );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!hasAuthCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
