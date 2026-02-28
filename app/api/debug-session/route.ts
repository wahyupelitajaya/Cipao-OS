import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * DEBUG ONLY — remove after debugging.
 * Returns the current cookie state and session info on the server.
 * Visit /api/debug-session in the browser after login to see what cookies are available.
 */
export async function GET() {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Filter to only show supabase-related cookies (redact values for safety)
    const supabaseCookies = allCookies
        .filter((c) => c.name.includes("sb-") || c.name.includes("supabase"))
        .map((c) => ({
            name: c.name,
            valueLength: c.value.length,
            valuePreview: c.value.substring(0, 20) + "...",
        }));

    const otherCookieNames = allCookies
        .filter((c) => !c.name.includes("sb-") && !c.name.includes("supabase"))
        .map((c) => c.name);

    // Try to read session
    let sessionInfo: Record<string, unknown> = {};
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (url && key) {
            const supabase = createServerClient(url, key, {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll() {
                        // no-op
                    },
                },
            });
            const { data, error } = await supabase.auth.getSession();
            sessionInfo = {
                hasSession: !!data?.session,
                userId: data?.session?.user?.id ?? null,
                expiresAt: data?.session?.expires_at ?? null,
                error: error?.message ?? null,
            };
        }
    } catch (e) {
        sessionInfo = { error: String(e) };
    }

    return NextResponse.json({
        totalCookies: allCookies.length,
        supabaseCookies,
        otherCookieNames,
        session: sessionInfo,
        timestamp: new Date().toISOString(),
    });
}
