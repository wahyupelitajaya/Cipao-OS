/**
 * Validated environment variables.
 * Eagerly validated at module load — the app will not start with missing config.
 */

function getEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required environment variable: ${key}.\n` +
        `1. In project root, create or edit .env.local\n` +
        `2. Add: ${key}=<your-value>\n` +
        `3. Use the exact name (e.g. NEXT_PUBLIC_SUPABASE_URL, not SUPABASE_URL)\n` +
        `4. Restart the dev server (stop and run "npm run dev" again)`,
    );
  }
  return value;
}

const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_ANON_KEY = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

if (typeof process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY === "string") {
  throw new Error(
    "CRITICAL: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is set. " +
      "The service role key must NEVER be prefixed with NEXT_PUBLIC_. " +
      "Remove the NEXT_PUBLIC_ prefix to keep it server-only.",
  );
}

export const env = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} as const;
