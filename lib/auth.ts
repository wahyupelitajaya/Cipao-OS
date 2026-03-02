import { createSupabaseServerClient } from "./supabaseClient";
import { AppError, ErrorCode } from "./errors";

export type ProfileRole = "admin" | "owner" | "groomer";

export interface Profile {
  id: string;
  email: string;
  role: ProfileRole;
}

/**
 * Safely get the current user and profile.
 * Uses getUser() (not getSession()) so the user is validated by the Supabase Auth server.
 *
 * IMPORTANT: This function NEVER throws. It always returns a result.
 * - If the user is not logged in: session=null, profile=null
 * - If the user IS logged in but the profile query fails: session with user, profile=null.
 */
export async function getSessionProfile() {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Validate user with Auth server (recommended over getSession() which only reads from cookies).
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { session: null, profile: null };
    }

    const session = { user };

    // 2. Fetch profile from DB.
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id,email,role")
        .eq("id", user.id)
        .maybeSingle();

      return { session, profile: profile as Profile | null };
    } catch {
      return { session, profile: null };
    }
  } catch {
    return { session: null, profile: null };
  }
}

export function isAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === "admin";
}

export function isGroomer(profile: Profile | null | undefined): boolean {
  return profile?.role === "groomer";
}

/** Admin or groomer can edit grooming tab; owner is read-only there. */
export function canEditGrooming(profile: Profile | null | undefined): boolean {
  return profile?.role === "admin" || profile?.role === "groomer";
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

/**
 * Require admin or groomer. Used for grooming-only actions (add/update grooming logs).
 */
export async function requireAdminOrGroomer(): Promise<Profile> {
  const profile = await requireUser();
  if (isAdmin(profile) || isGroomer(profile)) return profile;
  throw new AppError(ErrorCode.NOT_AUTHORIZED, "Not authorized.");
}
