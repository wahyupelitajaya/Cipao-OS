"use server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { requireUser, requireAdmin } from "@/lib/auth";
import { AppError, ErrorCode } from "@/lib/errors";
import { revalidateActivity } from "@/lib/revalidate";
import { requireDate, getOptionalString, getJsonStringArray } from "@/lib/validation";
import { isValidDateString } from "@/lib/dates";
import { ACTIVITY_CATEGORIES, BULK_MAX_IDS } from "@/lib/constants";

export type DayStatus = "visited" | "partial" | "none";

export interface MonthDaySummary {
  date: string; // YYYY-MM-DD
  status: DayStatus;
}

export interface DayActivityItem {
  id: string;
  date: string;
  time_slots: string;
  locations: string;
  categories: string;
  cat_names: string;
  activity_type: string;
  note: string | null;
  created_at: string;
}

export interface VisitDayState {
  date: string;
  visited: boolean | null; // null = no row
}

const TIME_SLOTS = ["Pagi", "Siang", "Sore", "Malam"] as const;
const LOCATIONS = ["Rumah", "Toko"] as const;

const TIME_SLOTS_SET = new Set<string>(TIME_SLOTS);
const LOCATIONS_SET = new Set<string>(LOCATIONS);
const CATEGORIES_SET = new Set<string>(ACTIVITY_CATEGORIES);

/** Map Indonesia -> English for DB constraint fallback */
const ACTIVITY_TYPE_TO_ENGLISH: Record<string, string> = {
  "Bersih Kandang": "Clean Cage",
  "Potong Kuku": "Nail Trim",
  "Sisir": "Brush",
  "Bersih Telinga": "Ear Cleaning",
  "Obat Cacing": "Deworming",
  "Obat Kutu": "Flea Treatment",
  "Mandi": "Bath",
  "Pemberian Obat": "Medication Given",
  "Pemeriksaan Umum": "General Check",
  "Lainnya": "Other",
};

/** Tampilkan tipe aktivitas dalam bahasa Indonesia (DB bisa menyimpan Inggris di lingkungan lama). */
const ACTIVITY_TYPE_DISPLAY: Record<string, string> = {
  "Other": "Lainnya",
  "Clean Cage": "Bersih Kandang",
  "Nail Trim": "Potong Kuku",
  "Brush": "Sisir",
  "Ear Cleaning": "Bersih Telinga",
  "Deworming": "Obat Cacing",
  "Flea Treatment": "Obat Kutu",
  "Bath": "Mandi",
  "Medication Given": "Pemberian Obat",
  "General Check": "Pemeriksaan Umum",
};

/** Get calendar summary for a month: which days are visited / partial / none. */
export async function getMonthActivitySummary(
  year: number,
  month: number,
): Promise<MonthDaySummary[]> {
  await requireUser();

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    year < 2000 ||
    year > 2100
  ) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Bulan atau tahun tidak valid.");
  }

  const supabase = await createSupabaseServerClient();
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [visitRes, activityRes] = await Promise.all([
    supabase
      .from("visit_days")
      .select("date, visited")
      .gte("date", start)
      .lte("date", end),
    supabase
      .from("daily_activities")
      .select("date")
      .gte("date", start)
      .lte("date", end),
  ]);

  if (visitRes.error) throw new AppError(ErrorCode.DB_ERROR, visitRes.error.message, visitRes.error);
  if (activityRes.error) throw new AppError(ErrorCode.DB_ERROR, activityRes.error.message, activityRes.error);

  const visitRows = (visitRes.data ?? []) as { date: string; visited: boolean }[];
  const activityRows = (activityRes.data ?? []) as { date: string }[];

  const visitByDate = new Map(visitRows.map((r) => [r.date, r.visited]));
  const datesWithActivities = new Set(activityRows.map((r) => r.date));

  const result: MonthDaySummary[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const visited = visitByDate.get(date);
    const hasActivities = datesWithActivities.has(date);
    let status: DayStatus = "none";
    if (visited === true) status = "visited";
    else if (hasActivities) status = "partial";
    result.push({ date, status });
  }
  return result;
}

/** Get activities for a single day and current visit status. */
export async function getDayActivities(
  date: string,
): Promise<{ activities: DayActivityItem[]; visit: VisitDayState | null }> {
  await requireUser();

  if (typeof date !== "string" || !isValidDateString(date)) {
    throw new Error("Format tanggal tidak valid.");
  }

  const supabase = await createSupabaseServerClient();
  const [visitRes, activityRes] = await Promise.all([
    supabase.from("visit_days").select("date, visited").eq("date", date).maybeSingle(),
    supabase
      .from("daily_activities")
      .select("id, date, time_slots, locations, categories, cat_ids, activity_type, note, created_at")
      .eq("date", date)
      .order("created_at", { ascending: true }),
  ]);

  if (activityRes.error) throw new AppError(ErrorCode.DB_ERROR, activityRes.error.message, activityRes.error);

  const visitRow = visitRes.data;
  const activityRows = activityRes.data ?? null;

  const visit: VisitDayState | null = visitRow
    ? { date: (visitRow as { date: string; visited: boolean }).date, visited: (visitRow as { date: string; visited: boolean }).visited }
    : { date, visited: null };

  type Row = {
    id: string;
    date: string;
    time_slots: string[];
    locations: string[];
    categories: string[];
    cat_ids: string[];
    activity_type: string;
    note: string | null;
    created_at: string;
  };
  const rows = (activityRows ?? []) as Row[];
  const allCatIds = [...new Set(rows.flatMap((r) => r.cat_ids ?? []))];
  const catNameMap = new Map<string, string>();
  if (allCatIds.length > 0) {
    const { data: catRows } = await supabase
      .from("cats")
      .select("id, name")
      .in("id", allCatIds);
    (catRows ?? []).forEach((c: { id: string; name: string }) => catNameMap.set(c.id, c.name));
  }
  const skipDisplay = (s: string) => !s || s === "Other" || s === "—" || s.trim() === "";
  const cleanJoin = (arr: string[] | null | undefined) =>
    (arr ?? []).filter((x: string) => !skipDisplay(x)).map((x: string) => x.trim()).join(", ");
  const activities: DayActivityItem[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    time_slots: cleanJoin(r.time_slots),
    locations: cleanJoin(r.locations),
    categories: cleanJoin(r.categories),
    cat_names: "",
    activity_type: "Lainnya",
    note: r.note,
    created_at: r.created_at,
  }));

  return { activities, visit };
}

/** Set visit status for a date. Admin only. */
export async function setVisitStatus(date: string, visited: boolean): Promise<void> {
  const profile = await requireAdmin();

  if (typeof date !== "string" || !isValidDateString(date)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Format tanggal tidak valid.");
  }
  if (typeof visited !== "boolean") {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Status kunjungan harus boolean.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("visit_days").upsert(
    {
      date,
      visited,
      created_by: profile.id,
    },
    { onConflict: "date" },
  );
  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
  revalidateActivity();
}

/** FormData version for addActivity. Waktu & lokasi multi; tipe satu; kucing opsional. */
export async function addActivityForm(formData: FormData): Promise<void> {
  const profile = await requireAdmin();
  const date = requireDate(formData, "date", "Tanggal");

  const timeSlotsRaw = getJsonStringArray(formData, "time_slots");
  for (const t of timeSlotsRaw) {
    if (!TIME_SLOTS_SET.has(t)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `Waktu tidak valid: "${t}". Pilih dari: ${TIME_SLOTS.join(", ")}.`);
    }
  }
  if (timeSlotsRaw.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Pilih minimal satu waktu.");
  }

  const locationsRaw = getJsonStringArray(formData, "locations");
  for (const l of locationsRaw) {
    if (!LOCATIONS_SET.has(l)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `Lokasi tidak valid: "${l}". Pilih dari: ${LOCATIONS.join(", ")}.`);
    }
  }
  if (locationsRaw.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Pilih minimal satu lokasi.");
  }

  const categoriesRaw = getJsonStringArray(formData, "categories");
  for (const c of categoriesRaw) {
    if (!CATEGORIES_SET.has(c)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `Kategori tidak valid: "${c}".`);
    }
  }

  const activity_type = "Lainnya";
  const catIds: string[] = [];
  const note = getOptionalString(formData, "note") || null;

  const supabase = await createSupabaseServerClient();
  const row = {
    date,
    time_slots: timeSlotsRaw,
    locations: locationsRaw,
    categories: categoriesRaw,
    cat_ids: catIds,
    activity_type,
    note: note || null,
    created_by: profile.id,
  };
  const { error } = await supabase.from("daily_activities").insert(row);
  if (error) {
    const isActivityTypeConstraint =
      error.code === "23514" &&
      String(error.message).includes("daily_activities_activity_type_check");
    if (isActivityTypeConstraint && ACTIVITY_TYPE_TO_ENGLISH[activity_type]) {
      const { error: err2 } = await supabase.from("daily_activities").insert({
        ...row,
        activity_type: ACTIVITY_TYPE_TO_ENGLISH[activity_type],
      });
      if (err2) throw new AppError(ErrorCode.DB_ERROR, err2.message ?? "Gagal menyimpan aktivitas.", err2);
    } else {
      throw new AppError(ErrorCode.DB_ERROR, error.message ?? "Gagal menyimpan aktivitas.", error);
    }
  }
  revalidateActivity();
}

/** Delete a single activity. Admin only. */
export async function deleteActivity(id: string): Promise<void> {
  await requireAdmin();

  if (typeof id !== "string" || !id.trim()) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "ID aktivitas wajib diisi.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("daily_activities").delete().eq("id", id);
  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message ?? "Gagal menghapus aktivitas.", error);
  revalidateActivity();
}

export interface DeleteActivitiesResult {
  successCount: number;
  failed: { id: string; reason: string }[];
}

/** Delete multiple activities. Admin only. Returns structured report for partial failures. */
export async function deleteActivities(ids: string[]): Promise<DeleteActivitiesResult> {
  await requireAdmin();

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Pilih minimal satu aktivitas untuk dihapus.");
  }
  if (ids.length > BULK_MAX_IDS) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, `Maksimal ${BULK_MAX_IDS} item per aksi.`);
  }
  if (!ids.every((x) => typeof x === "string" && x.trim())) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Semua ID harus berupa string yang valid.");
  }

  const supabase = await createSupabaseServerClient();
  const failed: { id: string; reason: string }[] = [];
  let successCount = 0;

  for (const id of ids) {
    try {
      const { error } = await supabase.from("daily_activities").delete().eq("id", id);
      if (error) {
        failed.push({ id, reason: error.message });
      } else {
        successCount++;
      }
    } catch (err) {
      failed.push({
        id,
        reason: err instanceof Error ? err.message : "Gagal menghapus.",
      });
    }
  }

  if (successCount > 0) {
    revalidateActivity();
  }

  return { successCount, failed };
}
