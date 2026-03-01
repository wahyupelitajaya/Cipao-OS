"use server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { requireAdmin, requireAdminOrGroomer } from "@/lib/auth";
import { AppError, ErrorCode } from "@/lib/errors";
import { revalidateCat, revalidateHealth, revalidateGrooming } from "@/lib/revalidate";
import {
  getString,
  getOptionalString,
  getDate,
  requireDate,
  getWeightKg,
  getJsonStringArray,
  getJson,
  validateHealthType,
  validatePreventiveType,
} from "@/lib/validation";
import { todayISO } from "@/lib/dates";
import { PREVENTIVE_TITLES, PREVENTIVE_INTERVALS } from "@/lib/constants";
import type { PreventiveType } from "@/lib/constants";
import { BULK_MAX_IDS } from "@/lib/constants";

export async function addHealthLog(formData: FormData) {
  await requireAdmin();

  const catId = getString(formData, "cat_id", { required: true });
  const type = getString(formData, "type", { required: true });
  const date = requireDate(formData, "date", "Tanggal");
  const title = getString(formData, "title", { required: true, maxLength: 500 });
  const details = getOptionalString(formData, "details");
  const nextDue = getDate(formData, "next_due_date");
  const isActiveTreatment = formData.get("is_active_treatment") === "on";

  if (!validateHealthType(type)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Tipe log kesehatan tidak valid.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("health_logs").insert({
    cat_id: catId,
    type,
    date,
    title,
    details: details || null,
    next_due_date: nextDue,
    is_active_treatment: isActiveTreatment,
  });

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);

  revalidateCat(catId);
  revalidateHealth();
}

export async function deleteHealthLog(formData: FormData) {
  await requireAdmin();

  const id = getString(formData, "id", { required: true });

  const supabase = await createSupabaseServerClient();
  const { data: log, error: fetchError } = await supabase
    .from("health_logs")
    .select("cat_id")
    .eq("id", id)
    .single();

  if (fetchError || !log) {
    throw new AppError(ErrorCode.NOT_FOUND, "Log kesehatan tidak ditemukan.");
  }

  const { error } = await supabase.from("health_logs").delete().eq("id", id);

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);

  revalidateCat(log.cat_id);
  revalidateHealth();
}

export async function bulkAddHealthLog(formData: FormData) {
  await requireAdmin();

  const catIds = getJsonStringArray(formData, "cat_ids");
  if (catIds.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Pilih minimal satu kucing.");
  }

  const type = getString(formData, "type", { required: true });
  const date = requireDate(formData, "date", "Tanggal");
  const title = getString(formData, "title", { required: true, maxLength: 500 });
  const details = getOptionalString(formData, "details");
  const nextDue = getDate(formData, "next_due_date");

  if (!validateHealthType(type)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Tipe log kesehatan tidak valid.");
  }

  const supabase = await createSupabaseServerClient();
  for (const catId of catIds) {
    const { error } = await supabase.from("health_logs").insert({
      cat_id: catId,
      type,
      date,
      title,
      details: details || null,
      next_due_date: nextDue,
      is_active_treatment: false,
    });
    if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
  }

  revalidateHealth();
  for (const catId of catIds) {
    revalidateCat(catId);
  }
}

export async function addWeightLog(formData: FormData) {
  await requireAdmin();

  const catId = getString(formData, "cat_id", { required: true });
  const date = requireDate(formData, "date", "Tanggal");
  const weight = getWeightKg(formData, "weight_kg");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("weight_logs").insert({
    cat_id: catId,
    date,
    weight_kg: weight,
  });

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);

  revalidateCat(catId);
  revalidateHealth();
}

export async function bulkAddWeightLog(formData: FormData) {
  await requireAdmin();

  const catIds = getJsonStringArray(formData, "cat_ids");
  if (catIds.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Pilih minimal satu kucing.");
  }
  if (catIds.length > BULK_MAX_IDS) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, `Maksimal ${BULK_MAX_IDS} kucing sekaligus.`);
  }

  const date = requireDate(formData, "date", "Tanggal");
  const weight = getWeightKg(formData, "weight_kg");

  const supabase = await createSupabaseServerClient();
  for (const catId of catIds) {
    const { error } = await supabase.from("weight_logs").insert({
      cat_id: catId,
      date,
      weight_kg: weight,
    });
    if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
  }

  revalidateHealth();
  for (const catId of catIds) {
    revalidateCat(catId);
  }
}

export async function updateWeightLog(formData: FormData) {
  await requireAdmin();

  const id = getString(formData, "id", { required: true });
  const date = requireDate(formData, "date", "Tanggal");
  const weight = getWeightKg(formData, "weight_kg");

  const supabase = await createSupabaseServerClient();
  const { data: log, error: fetchError } = await supabase
    .from("weight_logs")
    .select("cat_id")
    .eq("id", id)
    .single();

  if (fetchError || !log) {
    throw new AppError(ErrorCode.NOT_FOUND, "Log berat tidak ditemukan.");
  }

  const { error } = await supabase
    .from("weight_logs")
    .update({ date, weight_kg: weight })
    .eq("id", id);

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);

  revalidateCat(log.cat_id);
  revalidateHealth();
}

export async function deleteWeightLog(formData: FormData) {
  await requireAdmin();

  const id = getString(formData, "id", { required: true });

  const supabase = await createSupabaseServerClient();
  const { data: log, error: fetchError } = await supabase
    .from("weight_logs")
    .select("cat_id")
    .eq("id", id)
    .single();

  if (fetchError || !log) {
    throw new AppError(ErrorCode.NOT_FOUND, "Log berat tidak ditemukan.");
  }

  const { error } = await supabase.from("weight_logs").delete().eq("id", id);

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);

  revalidateCat(log.cat_id);
  revalidateHealth();
}

export async function addGroomingLog(formData: FormData) {
  await requireAdminOrGroomer();

  const catId = getString(formData, "cat_id", { required: true });
  const date = requireDate(formData, "date", "Tanggal");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("grooming_logs").insert({
    cat_id: catId,
    date,
  });

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);

  revalidateCat(catId);
  revalidateGrooming();
}

export async function updateGroomingLog(formData: FormData) {
  await requireAdminOrGroomer();

  const id = getString(formData, "id", { required: true });
  const date = requireDate(formData, "date", "Tanggal");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("grooming_logs")
    .update({ date })
    .eq("id", id)
    .select("cat_id")
    .single();

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
  if (!data?.cat_id) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Log grooming tidak ditemukan.");
  }

  revalidateCat(data.cat_id);
  revalidateGrooming();
}

interface BulkGroomingItem {
  catId: string;
  logId: string | null;
}

function isBulkGroomingPayload(
  v: unknown
): v is { date?: string; items: BulkGroomingItem[] } {
  if (v == null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.items) || o.items.length === 0) return false;
  if (o.items.length > BULK_MAX_IDS) return false;
  return o.items.every(
    (i) =>
      i != null &&
      typeof i === "object" &&
      typeof (i as BulkGroomingItem).catId === "string" &&
      ((i as BulkGroomingItem).logId === null ||
        typeof (i as BulkGroomingItem).logId === "string")
  );
}

export async function bulkSetGroomingDate(formData: FormData) {
  await requireAdminOrGroomer();

  const date = requireDate(formData, "date", "Tanggal");
  const payload = getJson<unknown>(formData, "payload");

  if (!isBulkGroomingPayload(payload)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Format payload tidak valid. Diperlukan items dengan catId dan logId.");
  }

  const supabase = await createSupabaseServerClient();

  for (const { catId, logId } of payload.items) {
    if (logId) {
      const { data: updated, error } = await supabase
        .from("grooming_logs")
        .update({ date })
        .eq("id", logId)
        .eq("cat_id", catId)
        .select("id")
        .maybeSingle();
      if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
      if (!updated) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, "Log grooming tidak ditemukan.");
      }
    } else {
      const { error } = await supabase
        .from("grooming_logs")
        .insert({ cat_id: catId, date });
      if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
    }
  }

  revalidateGrooming();
  for (const { catId } of payload.items) {
    revalidateCat(catId);
  }
}

export async function updateHealthLogDate(formData: FormData) {
  await requireAdmin();

  const id = getString(formData, "id", { required: true });
  const date = requireDate(formData, "date", "Tanggal");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("health_logs")
    .update({ date })
    .eq("id", id)
    .select("cat_id")
    .single();

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
  if (!data?.cat_id) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Log kesehatan tidak ditemukan.");
  }

  revalidateHealth();
  revalidateCat(data.cat_id);
}

export async function setNextDueDate(formData: FormData) {
  await requireAdmin();

  const logId = getOptionalString(formData, "log_id");
  const catId = getString(formData, "cat_id", { required: true });
  const type = getString(formData, "type", { required: true });
  const nextDue = requireDate(formData, "next_due_date", "Next due date");

  if (!validatePreventiveType(type)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Tipe harus VACCINE, FLEA, atau DEWORM.");
  }

  const supabase = await createSupabaseServerClient();
  const title = PREVENTIVE_TITLES[type as PreventiveType];

  if (logId) {
    const { data: existing, error: fetchErr } = await supabase
      .from("health_logs")
      .select("id, cat_id")
      .eq("id", logId)
      .maybeSingle();
    if (fetchErr) throw new AppError(ErrorCode.DB_ERROR, fetchErr.message, fetchErr);
    if (!existing) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "Log kesehatan tidak ditemukan.");
    }
    const { error: updateErr } = await supabase
      .from("health_logs")
      .update({ next_due_date: nextDue })
      .eq("id", logId);
    if (updateErr) throw new AppError(ErrorCode.DB_ERROR, updateErr.message, updateErr);
    revalidateCat(existing.cat_id);
  } else {
    const { error } = await supabase.from("health_logs").insert({
      cat_id: catId,
      type,
      date: todayISO(),
      title,
      next_due_date: nextDue,
      is_active_treatment: false,
    });
    if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
    revalidateCat(catId);
  }

  revalidateHealth();
}

export async function bulkSetNextDueDate(formData: FormData) {
  await requireAdmin();

  const catIds = getJsonStringArray(formData, "cat_ids");
  if (catIds.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Pilih minimal satu kucing.");
  }

  const type = getString(formData, "type", { required: true });
  const nextDue = requireDate(formData, "next_due_date", "Next due date");
  const titleInput = getOptionalString(formData, "title");

  if (!validatePreventiveType(type)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Tipe harus VACCINE, FLEA, atau DEWORM.");
  }

  const supabase = await createSupabaseServerClient();
  const today = todayISO();
  const defaultTitle = PREVENTIVE_TITLES[type as PreventiveType];
  const title = titleInput?.trim() ? titleInput.trim() : defaultTitle;

  for (const catId of catIds) {
    const { data: latest, error: fetchError } = await supabase
      .from("health_logs")
      .select("id")
      .eq("cat_id", catId)
      .eq("type", type)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw new AppError(ErrorCode.DB_ERROR, fetchError.message, fetchError);

    if (latest?.id) {
      const updateData: { next_due_date: string; title?: string } = { next_due_date: nextDue };
      if (titleInput?.trim()) updateData.title = titleInput.trim();
      const { error: updateError } = await supabase
        .from("health_logs")
        .update(updateData)
        .eq("id", latest.id)
        .eq("cat_id", catId);
      if (updateError) throw new AppError(ErrorCode.DB_ERROR, updateError.message, updateError);
    } else {
      const { error: insertError } = await supabase.from("health_logs").insert({
        cat_id: catId,
        type,
        date: today,
        title,
        next_due_date: nextDue,
        is_active_treatment: false,
      });
      if (insertError) throw new AppError(ErrorCode.DB_ERROR, insertError.message, insertError);
    }
  }

  revalidateHealth();
  for (const id of catIds) {
    revalidateCat(id);
  }
}

/**
 * Calculates next due date based on preventive type and last date.
 * Uses local date arithmetic to avoid timezone issues.
 * Returns YYYY-MM-DD string or null if type has no interval.
 */
function calculateNextDueDate(type: PreventiveType, lastDate: string): string | null {
  const monthsToAdd = PREVENTIVE_INTERVALS[type];
  if (!monthsToAdd) return null;

  // Parse the date (YYYY-MM-DD format)
  const [year, month, day] = lastDate.split("-").map(Number);
  
  // Add months using Date arithmetic (handles year rollover automatically)
  const dateObj = new Date(year, month - 1, day);
  dateObj.setMonth(dateObj.getMonth() + monthsToAdd);
  
  // Format back to YYYY-MM-DD (local time, no timezone shift)
  const nextYear = dateObj.getFullYear();
  const nextMonth = String(dateObj.getMonth() + 1).padStart(2, "0");
  const nextDay = String(dateObj.getDate()).padStart(2, "0");
  
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

/** Mengembalikan true jika ada minimal satu kucing yang sudah punya log preventive di tanggal tersebut. */
export async function checkExistingPreventiveLogs(formData: FormData): Promise<{ hasExisting: boolean }> {
  await requireAdmin();

  const catIds = getJsonStringArray(formData, "cat_ids");
  const typeRaw = formData.get("type");
  const dateRaw = formData.get("date");
  if (!catIds.length || !typeRaw || !dateRaw) return { hasExisting: false };

  const type = String(typeRaw).trim().toUpperCase();
  if (type !== "DEWORM" && type !== "FLEA" && type !== "VACCINE") return { hasExisting: false };

  const dateNorm = String(dateRaw).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateNorm)) return { hasExisting: false };

  const supabase = await createSupabaseServerClient();
  for (const catId of catIds) {
    const { data } = await supabase
      .from("health_logs")
      .select("id")
      .eq("cat_id", catId)
      .eq("type", type)
      .eq("date", dateNorm)
      .limit(1)
      .maybeSingle();
    if (data?.id) return { hasExisting: true };
  }
  return { hasExisting: false };
}

export async function bulkSetLastPreventiveDate(formData: FormData) {
  await requireAdmin();

  const catIds = getJsonStringArray(formData, "cat_ids");
  if (catIds.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Pilih minimal satu kucing.");
  }

  const type = getString(formData, "type", { required: true });
  const date = requireDate(formData, "date", "Tanggal");
  const titleInput = getOptionalString(formData, "title");

  if (!validatePreventiveType(type)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Tipe harus VACCINE, FLEA, atau DEWORM.");
  }

  const supabase = await createSupabaseServerClient();
  const defaultTitle = PREVENTIVE_TITLES[type as PreventiveType];
  const title = titleInput?.trim() ? titleInput.trim() : defaultTitle;

  // Set Last hanya mencatat tanggal pemberian. Next due diatur terpisah lewat "Set Next due"
  const nextDueToSet = null as string | null;

  // Obat cacing, Obat kutu, Vaksin: jika sudah ada log di tanggal yang sama, update (replace) jangan insert baru
  const doReplace = type === "FLEA" || type === "DEWORM" || type === "VACCINE";
  const dateNorm = date.trim().slice(0, 10);

  for (const catId of catIds) {
    if (doReplace) {
      // Cari log preventive di tanggal ini: dulu pakai .eq("date", date), kalau tidak ketemu cocokkan manual
      const { data: byDate, error: errByDate } = await supabase
        .from("health_logs")
        .select("id")
        .eq("cat_id", catId)
        .eq("type", type)
        .eq("date", date)
        .limit(1)
        .maybeSingle();
      let existingId: string | null = null;
      if (!errByDate && byDate?.id) {
        existingId = byDate.id;
      } else {
        const { data: rows, error: fetchErr } = await supabase
          .from("health_logs")
          .select("id, date")
          .eq("cat_id", catId)
          .eq("type", type)
          .order("created_at", { ascending: false });
        if (!fetchErr && Array.isArray(rows)) {
          const found = rows.find((r) => r?.date && String(r.date).trim().slice(0, 10) === dateNorm);
          if (found?.id) existingId = found.id;
        }
      }
      if (existingId) {
        const { error: updateErr } = await supabase
          .from("health_logs")
          .update({ date, title })
          .eq("id", existingId)
          .eq("cat_id", catId);
        if (updateErr) throw new AppError(ErrorCode.DB_ERROR, updateErr.message, updateErr);
        continue;
      }
    }
    const { error: insertError } = await supabase.from("health_logs").insert({
      cat_id: catId,
      type,
      date,
      title,
      next_due_date: nextDueToSet,
      is_active_treatment: false,
    });
    if (insertError) throw new AppError(ErrorCode.DB_ERROR, insertError.message, insertError);
  }

  revalidateHealth();
  for (const id of catIds) {
    revalidateCat(id);
  }
}

/** Tandai kucing sebagai sembuh: ubah status jadi membaik & nonaktifkan log perawatan. Kucing hilang dari tab Dirawat. */
export async function markCatsSembuh(formData: FormData) {
  await requireAdmin();
  const catIds = getJsonStringArray(formData, "cat_ids");
  if (catIds.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Pilih minimal satu kucing.");
  }
  const supabase = await createSupabaseServerClient();
  const { error: updateCatsError } = await supabase
    .from("cats")
    .update({ status: "sehat" })
    .in("id", catIds);
  if (updateCatsError) throw new AppError(ErrorCode.DB_ERROR, updateCatsError.message, updateCatsError);
  const { error: updateLogsError } = await supabase
    .from("health_logs")
    .update({ is_active_treatment: false })
    .in("cat_id", catIds);
  if (updateLogsError) throw new AppError(ErrorCode.DB_ERROR, updateLogsError.message, updateLogsError);
  revalidateHealth();
  for (const id of catIds) revalidateCat(id);
}

/** Tambah kucing ke tab Dirawat: buat log NOTE "Dalam perawatan" dengan is_active_treatment = true. */
export async function addCatsToDirawat(formData: FormData) {
  await requireAdmin();
  const catIds = getJsonStringArray(formData, "cat_ids");
  if (catIds.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Pilih minimal satu kucing.");
  }
  const today = todayISO();
  const supabase = await createSupabaseServerClient();
  for (const catId of catIds) {
    const { error } = await supabase.from("health_logs").insert({
      cat_id: catId,
      date: today,
      type: "NOTE",
      title: "Dalam perawatan",
      is_active_treatment: true,
    });
    if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
  }
  revalidateHealth();
  for (const id of catIds) revalidateCat(id);
}
