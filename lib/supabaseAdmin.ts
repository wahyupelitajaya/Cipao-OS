import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Supabase client dengan service role key.
 * Hanya dipakai di server (mis. API route webhook WhatsApp) untuk insert Activity tanpa user login.
 * Jangan pernah expose SUPABASE_SERVICE_ROLE_KEY ke client.
 */
export function createSupabaseAdminClient() {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Required for WhatsApp webhook to save Activity.",
    );
  }
  return createClient(env.SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
}
