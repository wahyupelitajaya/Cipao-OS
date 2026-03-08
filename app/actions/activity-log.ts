"use server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getSessionProfile, requireAdmin } from "@/lib/auth";
import { getActivityLogs } from "@/lib/data/activity-log";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

/** Fetch activity logs for the Log page. Admin only. Opsional q, sortBy, sortOrder. */
export async function getActivityLogsForPage(
  limit = 200,
  q?: string,
  sortBy?: "created_at" | "action" | "entity_type" | "summary",
  sortOrder?: "asc" | "desc",
) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  return getActivityLogs(supabase, { limit, q, sortBy, sortOrder });
}

export interface AppendActivityLogPayload {
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  summary: string;
}

/**
 * Append one entry to activity_log. Call from other server actions after requireAdmin.
 * Uses current auth user as user_id.
 */
export async function appendActivityLog(payload: AppendActivityLogPayload): Promise<void> {
  const profile = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("activity_log").insert({
    user_id: profile.id,
    action: payload.action,
    entity_type: payload.entity_type ?? null,
    entity_id: payload.entity_id ?? null,
    summary: payload.summary,
  });
  if (error) {
    console.error("activity_log insert failed:", error);
    // Jangan throw agar aksi utama (e.g. update cat) tetap sukses
  }
}

export interface PageViewPayload {
  path: string;
  userAgent: string;
  timezone?: string;
}

/** Log satu page view (digunakan dari client). Mencatat user, perangkat, lokasi (timezone), dan waktu. */
export async function logPageView(payload: PageViewPayload): Promise<void> {
  const { session, profile } = await getSessionProfile();
  if (!session) return;

  const ua = payload.userAgent ?? "";
  const uaLower = ua.toLowerCase();
  let device: "Desktop" | "Mobile" | "Tablet" = "Desktop";
  if (uaLower.includes("ipad") || uaLower.includes("tablet")) device = "Tablet";
  else if (
    uaLower.includes("mobi") ||
    uaLower.includes("android") ||
    uaLower.includes("iphone")
  ) {
    device = "Mobile";
  }

  const location =
    payload.timezone && payload.timezone.trim()
      ? `Zona: ${payload.timezone.trim()}`
      : "Zona: tidak diketahui";

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.from("activity_log").insert({
    user_id: session.user.id,
    action: "view",
    entity_type: "page_view",
    entity_id: payload.path,
    summary: `View ${payload.path} oleh ${profile?.email ?? session.user.id} (${device}, ${location})`,
  });
  if (error) {
    console.error("activity_log page_view insert failed:", error);
  }
}

