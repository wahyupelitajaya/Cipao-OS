import type { createSupabaseServerClient } from "@/lib/supabaseClient";
import type { Tables } from "@/lib/types";
import { buildStatusSuggestion } from "@/lib/cat-status";
import type {
  DashboardCatRecord,
  DashboardData,
  DashboardGroomingEntry,
  DashboardLowStockItem,
} from "@/app/(app)/dashboard/types";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type Cat = Tables<"cats">;
type HealthLog = Tables<"health_logs">;
type WeightLog = Tables<"weight_logs">;
type GroomingLog = Tables<"grooming_logs">;
type InventoryItem = Tables<"inventory_items">;

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

/** Row from view latest_grooming_per_cat */
type LatestGroomingRow = {
  id: string;
  cat_id: string;
  date: string;
  created_at: string;
};

function toYmd(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Dashboard data with optimized queries:
 * - Cats: only columns needed for cards
 * - Health: view latest_preventive_per_cat_type + small query for is_active_treatment
 * - Weight: view latest_2_weight_logs_per_cat (2 rows per cat max)
 * - Grooming: view latest_grooming_per_cat (1 row per cat)
 * - Inventory: only columns for low-stock panel
 */
export async function getDashboardData(
  supabase: SupabaseClient
): Promise<DashboardData> {
  const [
    { data: cats = [] },
    { data: preventiveRows = [] },
    { data: activeTreatmentCatIds = [] },
    { data: weightRows = [] },
    { data: groomingRows = [] },
    { data: inventoryItems = [] },
  ] = await Promise.all([
    supabase
      .from("cats")
      .select("id, name, cat_id, status, location, photo_url")
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
    supabase
      .from("latest_grooming_per_cat")
      .select("id, cat_id, date, created_at"),
    supabase
      .from("inventory_items")
      .select("id, name, stock_qty, min_stock_qty, unit"),
  ]);

  const preventiveByCat = new Map<string, HealthLog[]>();
  (cats as Cat[]).forEach((c) => preventiveByCat.set(c.id, []));
  (preventiveRows as LatestPreventiveRow[]).forEach((r) => {
    const arr = preventiveByCat.get(r.cat_id);
    if (arr) arr.push(r as unknown as HealthLog);
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

  const lastGroomingByCat = new Map<string, { date: string }>();
  (groomingRows as LatestGroomingRow[]).forEach((r) => {
    lastGroomingByCat.set(r.cat_id, { date: r.date });
  });

  const dashboardCats: DashboardCatRecord[] = (cats as Cat[]).map((cat) => {
    const bucket = preventiveByCat.get(cat.id) ?? [];
    const weightBucket = weightsByCat.get(cat.id) ?? [];
    const suggestion = buildStatusSuggestion({
      healthLogs: bucket,
      weightLogs: weightBucket,
    });
    const sortedWeights = [...weightBucket].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const latestWeight = sortedWeights[0];
    const previousWeight = sortedWeights[1];
    const lastGrooming = lastGroomingByCat.get(cat.id);
    const hasActiveTreatment = activeTreatmentSet.has(cat.id);

    return {
      id: cat.id,
      name: cat.name,
      badge: cat.cat_id,
      status: cat.status ?? null,
      location: cat.location ?? null,
      photoUrl: cat.photo_url ?? null,
      preventive: [
        { type: "VACCINE", nextDueDate: toYmd(suggestion.nextVaccine) },
        { type: "FLEA", nextDueDate: toYmd(suggestion.nextFlea) },
        { type: "DEWORM", nextDueDate: toYmd(suggestion.nextDeworm) },
      ],
      weight: {
        currentKg: suggestion.lastWeight?.weightKg ?? 0,
        previousKg: previousWeight ? Number(previousWeight.weight_kg) : undefined,
      },
      hasActiveTreatment,
      lastGroomingDate: lastGrooming?.date ?? null,
    };
  });

  const groomingPanel: DashboardGroomingEntry[] = (cats as Cat[])
    .map((cat) => ({
      catId: cat.id,
      catName: cat.name,
      lastGroomingDate: lastGroomingByCat.get(cat.id)?.date ?? null,
    }))
    .filter((e) => e.lastGroomingDate)
    .sort((a, b) => {
      const da = new Date(a.lastGroomingDate!).getTime();
      const db = new Date(b.lastGroomingDate!).getTime();
      return da - db;
    })
    .slice(0, 5);

  const lowStockPanel: DashboardLowStockItem[] = (inventoryItems as InventoryItem[])
    .filter((item) => {
      const min = item.min_stock_qty;
      if (min == null) return false;
      return Number(item.stock_qty) <= Number(min);
    })
    .sort(
      (a, b) =>
        Number(a.stock_qty) / ((a.min_stock_qty ?? 1) || 1) -
        Number(b.stock_qty) / ((b.min_stock_qty ?? 1) || 1)
    )
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      name: item.name,
      stockQty: Number(item.stock_qty),
      minStockQty: Number(item.min_stock_qty ?? 0),
      unit: item.unit,
    }));

  return {
    cats: dashboardCats,
    groomingPanel,
    lowStockPanel,
  };
}
