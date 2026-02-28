import { createSupabaseServerClient } from "./supabaseClient";
import { AppError, ErrorCode } from "./errors";

export type ProfileRole = "admin" | "owner";

export interface Profile {
  id: string;
  email: string;
  role: ProfileRole;
}

/**
 * Safely get the current session and profile.
 *
 * IMPORTANT: This function NEVER throws. It always returns a result.
 * - If the user is not logged in (no cookie / expired token): session=null, profile=null
 * - If the user IS logged in but the profile query fails (DB error, rate limit, timeout):
 *   session is returned but profile=null. The CALLER must check session to distinguish
 *   "not logged in" from "logged in but profile fetch failed".
 */
export async function getSessionProfile() {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Read session from cookie — this does NOT make a network call to Supabase.
    //    It simply reads the JWT from the cookie set by the proxy.
    const { data, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !data.session?.user) {
      // No valid session cookie → user is genuinely not logged in
      return { session: null, profile: null };
    }

    const session = data.session;

    // 2. We have a valid session. Now fetch the profile from DB.
    //    If this fails (rate limit, timeout, etc.), we still return the session
    //    so the caller knows the user IS authenticated — just the profile is missing.
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id,email,role")
        .eq("id", session.user.id)
        .maybeSingle();

      return { session, profile: profile as Profile | null };
    } catch {
      // DB error — user is authenticated but we can't fetch their profile right now.
      // Return session so the caller knows NOT to redirect to login.
      return { session, profile: null };
    }
  } catch {
    // Outermost safety net: if even createSupabaseServerClient() or cookies() throws,
    // return null gracefully instead of crashing the request.
    return { session: null, profile: null };
  }
}

export function isAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === "admin";
}

/**
 * Require any authenticated user. Throws if not logged in.
 */
export async function requireUser(): Promise<Profile> {
  const { profile } = await getSessionProfile();
  if (!profile) {
    throw new AppError(ErrorCode.NOT_AUTHENTICATED, "Not authenticated.");
  }
  return profile;
}

/**
 * Require admin role. Throws if not authenticated or not admin.
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireUser();
  if (!isAdmin(profile)) {
    throw new AppError(ErrorCode.NOT_AUTHORIZED, "Not authorized.");
  }
  return profile;
}

/**
 * Require that the caller is either admin or the owner of a specific cat.
 * catId must be the UUID primary key from the cats table.
 */
export async function requireOwnerOrAdmin(catId: string): Promise<Profile> {
  const profile = await requireUser();
  if (isAdmin(profile)) return profile;

  const supabase = await createSupabaseServerClient();
  const { data: cat } = await supabase
    .from("cats")
    .select("owner_id")
    .eq("id", catId)
    .maybeSingle();

  if (!cat || cat.owner_id !== profile.id) {
    throw new AppError(ErrorCode.NOT_AUTHORIZED, "Not authorized.");
  }
  return profile;
}
