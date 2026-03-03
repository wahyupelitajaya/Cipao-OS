"use server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { requireAdmin } from "@/lib/auth";
import { getActivityLogs } from "@/lib/data/activity-log";

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
