import type { createSupabaseServerClient } from "@/lib/supabaseClient";
import type { Tables } from "@/lib/types";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
export type ActivityLogRow = Tables<"activity_log">;

export type ActivityLogSortColumn = "created_at" | "action" | "entity_type" | "summary";
export type ActivityLogSortOrder = "asc" | "desc";

export interface GetActivityLogsOptions {
  limit?: number;
  /** Cari di summary, action, entity_type (case-insensitive). */
  q?: string;
  sortBy?: ActivityLogSortColumn;
  sortOrder?: ActivityLogSortOrder;
}

const SORT_COLUMNS: ActivityLogSortColumn[] = ["created_at", "action", "entity_type", "summary"];

function isValidSortColumn(v: string): v is ActivityLogSortColumn {
  return SORT_COLUMNS.includes(v as ActivityLogSortColumn);
}

/** Escape % dan _ untuk ilike; ganti koma agar tidak konflik dengan pemisah .or(). */
function escapeIlike(term: string): string {
  return term
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, " ");
}

/** Fetch recent activity logs (admin only - RLS enforces). */
export async function getActivityLogs(
  supabase: SupabaseClient,
  options: GetActivityLogsOptions = {},
): Promise<ActivityLogRow[]> {
  const { limit = 200, q, sortBy = "created_at", sortOrder = "desc" } = options;
  const column = isValidSortColumn(sortBy) ? sortBy : "created_at";
  const ascending = sortOrder === "asc";
  let query = supabase
    .from("activity_log")
    .select("id, created_at, user_id, action, entity_type, entity_id, summary")
    .order(column, { ascending })
    .limit(limit);

  if (q && q.trim()) {
    const term = `%${escapeIlike(q.trim())}%`;
    query = query.or(
      `summary.ilike.${term},action.ilike.${term},entity_type.ilike.${term}`,
    ) as typeof query;
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ActivityLogRow[];
}
