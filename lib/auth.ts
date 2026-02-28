import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabaseClient";
import { AppError, ErrorCode } from "./errors";

export type ProfileRole = "admin" | "owner";

export interface Profile {
  id: string;
  email: string;
  role: ProfileRole;
}

/** Error codes that indicate the session/token is invalid and user must re-login */
const SESSION_INVALID_CODES = new Set([
  "refresh_token_not_found",
  "invalid_refresh_token",
  "refresh_token_revoked",
]);

function isSessionInvalidError(err: unknown): boolean {
  const code =
    err && typeof err === "object" && "code" in err
      ? (err as { code?: string }).code
      : undefined;
  return typeof code === "string" && SESSION_INVALID_CODES.has(code);
}

/** Next.js redirect() throws; jangan swallow agar redirect tetap jalan. */
function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function getSessionProfile() {
  try {
    const supabase = await createSupabaseServerClient();

    let session: { user: { id: string } } | null = null;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error && isSessionInvalidError(error)) {
        return { session: null, profile: null };
      }
      if (error) throw error;
      session = data.session;
    } catch (err) {
      if (isSessionInvalidError(err)) {
        return { session: null, profile: null };
      }
      // Re-throw generic network or rate limit errors
      throw err;
    }

    if (!session?.user) return { session: null, profile: null };

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Failed to fetch profile due to DB error:", profileError);
      throw new Error(`Database error fetching profile: ${profileError.message}`);
    }

    return { session, profile: profile as Profile | null };
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    if (err instanceof Error) throw err; // propagate DB/Network errors to Next.js Error Boundary
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
