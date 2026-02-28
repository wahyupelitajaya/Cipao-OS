import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseRouteHandlerClient } from "@/lib/supabaseRouteHandlerClient";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createSupabaseRouteHandlerClient({
    getAll: () => cookieStore.getAll(),
    set: (name, value, options) => cookieStore.set(name, value, options ?? {}),
    delete: (name) => cookieStore.delete(name),
  });

  await supabase.auth.signOut();
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl, { status: 302 });
}
