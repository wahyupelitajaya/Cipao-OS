import type { createSupabaseServerClient } from "@/lib/supabaseClient";
import type { Tables } from "@/lib/types";
import { buildStatusSuggestion } from "@/lib/cat-status";
import type { StatusSuggestion } from "@/lib/cat-status";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type Cat = Tables<"cats">;
type HealthLog = Tables<"health_logs">;
type WeightLog = Tables<"weight_logs">;

export interface PreventiveLogRow {
  id: string;
  date: string;
  next_due_date: string | null;
  title: string;
}

export interface HealthScanRow {
  cat: Cat;
  suggestion: StatusSuggestion;
  /** ID log berat terbaru (untuk edit) */
  lastWeightLogId: string | null;
  /** Berat sebelum berat terbaru (untuk tampilan naik/turun dan edit) */
  previousWeight: { id: string; date: string; weightKg: number } | null;
  lastVaccineLog: PreventiveLogRow | null;
  lastFleaLog: PreventiveLogRow | null;
  lastDewormLog: PreventiveLogRow | null;
}

/** Row from health_logs (preventive types) — same source as profile page */
type LatestPreventiveRow = {
  id: string;
  cat_id: string;
  date: string;
  type: string;
  title: string;
  next_due_date: string | null;
  is_active_treatment: boolean;
  created_at: string;
};

/** Row from view latest_2_weight_logs_per_cat */
type LatestWeightRow = {
  id: string;
  cat_id: string;
  date: string;
  weight_kg: number;
  created_at: string;
};

function toPreventiveLogRow(r: LatestPreventiveRow): PreventiveLogRow {
  return { id: r.id, date: r.date, next_due_date: r.next_due_date ?? null, title: r.title ?? "" };
}

export type HealthSortBy = "name" | "cat_id" | "dob";
export type HealthSortOrder = "asc" | "desc";

export interface GetHealthScanDataOptions {
  q?: string;
  sortBy?: HealthSortBy;
  order?: HealthSortOrder;
}

/**
 * Health scan data with optimized queries:
 * - Latest preventive log per type (VACCINE, FLEA, DEWORM) per cat from health_logs (same source as profile)
 * - Last 2 weight logs per cat via view
 * - Active treatment flag via small cat_id-only query
 * @param options.q Optional search string: filter cats by name or cat_id (case-insensitive)
 * @param options.sortBy Sort by name, cat_id, or dob
 * @param options.order asc or desc
 */
export async function getHealthScanData(
  supabase: SupabaseClient,
  options?: GetHealthScanDataOptions
): Promise<HealthScanRow[]> {
  const q = options?.q;
  const sortBy = options?.sortBy ?? "name";
  const order = options?.order ?? "asc";

  let catsQuery = supabase
    .from("cats")
    .select("*")
    .eq("is_active", true)
    .order("cat_id", { ascending: true });
  if (q && q.trim()) {
    const terms = q
      .split("&")
      .map((t) => t.trim())
      .filter(Boolean);
    if (terms.length > 0) {
      const orParts = terms.flatMap((term) => [`name.ilike.%${term}%`, `cat_id.ilike.%${term}%`]);
      catsQuery = catsQuery.or(orParts.join(",")) as typeof catsQuery;
    }
  }
  const [
    { data: cats = [] },
    { data: allPreventiveLogs = [] },
    { data: activeTreatmentCatIds = [] },
    { data: weightRows = [] },
  ] = await Promise.all([
    catsQuery,
    supabase
      .from("health_logs")
      .select("id, cat_id, date, type, title, next_due_date, is_active_treatment, created_at")
      .in("type", ["VACCINE", "FLEA", "DEWORM"]),
    supabase
      .from("health_logs")
      .select("cat_id")
      .eq("is_active_treatment", true),
    supabase
      .from("latest_2_weight_logs_per_cat")
      .select("id, cat_id, date, weight_kg, created_at"),
  ]);

  const preventiveRows = (() => {
    const list = (allPreventiveLogs as LatestPreventiveRow[]).sort((a, b) => {
      const catCmp = String(a.cat_id).localeCompare(String(b.cat_id));
      if (catCmp !== 0) return catCmp;
      const typeCmp = (a.type || "").localeCompare(b.type || "");
      if (typeCmp !== 0) return typeCmp;
      const dateCmp = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCmp !== 0) return dateCmp;
      return String(b.id).localeCompare(String(a.id));
    });
    const seen = new Map<string, boolean>();
    return list.filter((r) => {
      const key = `${String(r.cat_id).toLowerCase()}:${(r.type || "").toUpperCase()}`;
      if (seen.get(key)) return false;
      seen.set(key, true);
      return true;
    });
  })();

  const catsSorted = [...(cats as Cat[])].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") {
      const na = (a.name ?? "").toLowerCase();
      const nb = (b.name ?? "").toLowerCase();
      cmp = na.localeCompare(nb);
    } else if (sortBy === "cat_id") {
      const ca = (a.cat_id ?? "").toLowerCase();
      const cb = (b.cat_id ?? "").toLowerCase();
      cmp = ca.localeCompare(cb);
    } else {
      // dob: null last, then compare dates
      const da = a.dob ? new Date(a.dob).getTime() : Infinity;
      const db = b.dob ? new Date(b.dob).getTime() : Infinity;
      if (da !== db) cmp = da < db ? -1 : 1;
    }
    return order === "asc" ? cmp : -cmp;
  });

  const normalizeId = (id: string | null | undefined) => String(id ?? "").toLowerCase();
  const preventiveByCat = new Map<string, LatestPreventiveRow[]>();
  catsSorted.forEach((c) => preventiveByCat.set(normalizeId(c.id), []));
  (preventiveRows as LatestPreventiveRow[]).forEach((r) => {
    const key = normalizeId(r.cat_id);
    const arr = preventiveByCat.get(key);
    if (arr) arr.push(r);
  });

  const activeTreatmentSet = new Set(
    (activeTreatmentCatIds as { cat_id: string }[]).map((r) => r.cat_id)
  );

  const weightsByCat = new Map<string, WeightLog[]>();
  catsSorted.forEach((c) => weightsByCat.set(c.id, []));
  (weightRows as LatestWeightRow[]).forEach((r) => {
    const arr = weightsByCat.get(r.cat_id);
    if (arr) arr.push(r as unknown as WeightLog);
  });

  return catsSorted.map((cat) => {
    const preventive = preventiveByCat.get(normalizeId(cat.id)) ?? [];
    const healthForSuggestion: HealthLog[] = preventive.map((r) => ({
      ...r,
      cat_id: r.cat_id,
      title: r.title,
      details: null,
    })) as HealthLog[];
    const hasActiveInPreventive = healthForSuggestion.some((h) => h.is_active_treatment);
    if (activeTreatmentSet.has(cat.id) && !hasActiveInPreventive) {
      healthForSuggestion.push({
        id: "",
        cat_id: cat.id,
        date: "",
        type: "NOTE",
        title: "",
        details: null,
        next_due_date: null,
        is_active_treatment: true,
        created_at: "",
      } as HealthLog);
    }
    const weightBucket = weightsByCat.get(cat.id) ?? [];
    const sortedWeights = [...weightBucket].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const suggestion = buildStatusSuggestion({
      healthLogs: healthForSuggestion,
      weightLogs: weightBucket,
    });
    const lastWeightLogId = sortedWeights.length > 0 ? sortedWeights[0].id : null;
    const previousWeight =
      sortedWeights.length >= 2
        ? {
            id: sortedWeights[1].id,
            date: sortedWeights[1].date,
            weightKg: Number(sortedWeights[1].weight_kg),
          }
        : null;
    const byType = new Map<string, LatestPreventiveRow>();
    preventive.forEach((r) => byType.set(r.type, r));
    return {
      cat,
      suggestion,
      lastWeightLogId,
      previousWeight,
      lastVaccineLog: byType.has("VACCINE")
        ? toPreventiveLogRow(byType.get("VACCINE")!)
        : null,
      lastFleaLog: byType.has("FLEA") ? toPreventiveLogRow(byType.get("FLEA")!) : null,
      lastDewormLog: byType.has("DEWORM") ? toPreventiveLogRow(byType.get("DEWORM")!) : null,
    };
  });
}
