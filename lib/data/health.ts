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
}

export interface HealthScanRow {
  cat: Cat;
  suggestion: StatusSuggestion;
  lastVaccineLog: PreventiveLogRow | null;
  lastFleaLog: PreventiveLogRow | null;
  lastDewormLog: PreventiveLogRow | null;
}

/** Row from view latest_preventive_per_cat_type */
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
  return { id: r.id, date: r.date, next_due_date: r.next_due_date ?? null };
}

/**
 * Health scan data with optimized queries:
 * - Latest preventive log per type (VACCINE, FLEA, DEWORM) per cat via view
 * - Last 2 weight logs per cat via view
 * - Active treatment flag via small cat_id-only query
 */
export async function getHealthScanData(
  supabase: SupabaseClient
): Promise<HealthScanRow[]> {
  const [
    { data: cats = [] },
    { data: preventiveRows = [] },
    { data: activeTreatmentCatIds = [] },
    { data: weightRows = [] },
  ] = await Promise.all([
    supabase
      .from("cats")
      .select("*")
      .eq("is_active", true)
      .order("cat_id", { ascending: true }),
    supabase
      .from("latest_preventive_per_cat_type")
      .select("id, cat_id, date, type, title, next_due_date, is_active_treatment, created_at"),
    supabase
      .from("health_logs")
      .select("cat_id")
      .eq("is_active_treatment", true),
    supabase
      .from("latest_2_weight_logs_per_cat")
      .select("id, cat_id, date, weight_kg, created_at"),
  ]);

  const preventiveByCat = new Map<string, LatestPreventiveRow[]>();
  (cats as Cat[]).forEach((c) => preventiveByCat.set(c.id, []));
  (preventiveRows as LatestPreventiveRow[]).forEach((r) => {
    const arr = preventiveByCat.get(r.cat_id);
    if (arr) arr.push(r);
  });

  const activeTreatmentSet = new Set(
    (activeTreatmentCatIds as { cat_id: string }[]).map((r) => r.cat_id)
  );

  const weightsByCat = new Map<string, WeightLog[]>();
  (cats as Cat[]).forEach((c) => weightsByCat.set(c.id, []));
  (weightRows as LatestWeightRow[]).forEach((r) => {
    const arr = weightsByCat.get(r.cat_id);
    if (arr) arr.push(r as unknown as WeightLog);
  });

  return (cats as Cat[]).map((cat) => {
    const preventive = preventiveByCat.get(cat.id) ?? [];
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
    const suggestion = buildStatusSuggestion({
      healthLogs: healthForSuggestion,
      weightLogs: weightBucket,
    });
    const byType = new Map<string, LatestPreventiveRow>();
    preventive.forEach((r) => byType.set(r.type, r));
    return {
      cat,
      suggestion,
      lastVaccineLog: byType.has("VACCINE")
        ? toPreventiveLogRow(byType.get("VACCINE")!)
        : null,
      lastFleaLog: byType.has("FLEA") ? toPreventiveLogRow(byType.get("FLEA")!) : null,
      lastDewormLog: byType.has("DEWORM") ? toPreventiveLogRow(byType.get("DEWORM")!) : null,
    };
  });
}
