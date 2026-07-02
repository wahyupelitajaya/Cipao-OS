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
import { appendActivityLog } from "@/app/actions/activity-log";
import { matchCatByToken, type CatMatchCandidate } from "@/lib/cat-name-match";
import { WEIGHT_MAX_KG } from "@/lib/constants";

export interface BulkImportWeightEntry {
  name: string;
  weightKg: number;
  line?: number;
}

export interface BulkImportWeightResult {
  applied: number;
  notFound: { line?: number; name: string }[];
  ambiguous: { line?: number; name: string; matches: string[] }[];
  invalid: { line?: number; name: string; reason: string }[];
  appliedCats: { name: string; weightKg: number }[];
}

function isBulkImportWeightPayload(v: unknown): v is BulkImportWeightEntry[] {
  if (!Array.isArray(v) || v.length === 0) return false;
  if (v.length > BULK_MAX_IDS) return false;
  return v.every(
    (item) =>
      item != null &&
      typeof item === "object" &&
      typeof (item as BulkImportWeightEntry).name === "string" &&
      typeof (item as BulkImportWeightEntry).weightKg === "number" &&
      Number.isFinite((item as BulkImportWeightEntry).weightKg),
  );
}

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
  appendActivityLog({
    action: "create",
    entity_type: "health_log",
    entity_id: catId,
    summary: `Menambah log kesehatan: ${title} (${type})`,
  }).catch(() => {});
}

export async function deleteHealthLog(formData: FormData) {
  await requireAdmin();

  const id = getString(formData, "id", { required: true });

  const supabase = await createSupabaseServerClient();
  const { data: log, error: fetchError } = await supabase
    .from("health_logs")
    .select("cat_id, title, type")
    .eq("id", id)
    .single();

  if (fetchError || !log) {
    throw new AppError(ErrorCode.NOT_FOUND, "Log kesehatan tidak ditemukan.");
  }

  const { error } = await supabase.from("health_logs").delete().eq("id", id);

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);

  revalidateCat(log.cat_id);
  revalidateHealth();
  appendActivityLog({
    action: "delete",
    entity_type: "health_log",
    entity_id: id,
    summary: `Menghapus log kesehatan: ${log.title ?? ""} (${log.type ?? ""})`,
  }).catch(() => {});
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
  appendActivityLog({
    action: "create",
    entity_type: "weight_log",
    entity_id: catId,
    summary: `Menambah log berat: ${weight} kg`,
  }).catch(() => {});
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

/** Impor berat badan dari daftar nama + berat (hasil parse file .txt). */
export async function bulkImportWeightFromTxt(formData: FormData): Promise<BulkImportWeightResult> {
  await requireAdmin();

  const date = requireDate(formData, "date", "Tanggal");
  const entries = getJson<unknown>(formData, "entries");

  if (!isBulkImportWeightPayload(entries)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      "Format entri tidak valid. Diperlukan array nama dan berat.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: cats, error: catsError } = await supabase
    .from("cats")
    .select("id, name, cat_id")
    .eq("is_active", true);

  if (catsError) throw new AppError(ErrorCode.DB_ERROR, catsError.message, catsError);

  const catList = (cats ?? []) as CatMatchCandidate[];
  const result: BulkImportWeightResult = {
    applied: 0,
    notFound: [],
    ambiguous: [],
    invalid: [],
    appliedCats: [],
  };

  /** catId → entri terakhir (jika nama sama muncul dua kali, yang terakhir menang) */
  const toInsert = new Map<string, { name: string; weightKg: number }>();

  for (const entry of entries) {
    const name = entry.name.trim();
    const weightKg = entry.weightKg;
    const line = entry.line;

    if (!name) {
      result.invalid.push({ line, name, reason: "Nama kucing kosong." });
      continue;
    }
    if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > WEIGHT_MAX_KG) {
      result.invalid.push({ line, name, reason: `Berat harus antara 0.01–${WEIGHT_MAX_KG} kg.` });
      continue;
    }

    const match = matchCatByToken(catList, name);
    if (match.status === "not_found") {
      result.notFound.push({ line, name });
      continue;
    }
    if (match.status === "ambiguous") {
      result.ambiguous.push({
        line,
        name,
        matches: match.matches.map((c) => c.name),
      });
      continue;
    }

    toInsert.set(match.cat.id, { name: match.cat.name, weightKg });
  }

  if (toInsert.size === 0) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      "Tidak ada berat yang bisa diterapkan. Periksa nama kucing di file.",
    );
  }

  for (const [catId, { name, weightKg }] of toInsert) {
    const { error } = await supabase.from("weight_logs").insert({
      cat_id: catId,
      date,
      weight_kg: weightKg,
    });
    if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
    result.applied += 1;
    result.appliedCats.push({ name, weightKg });
  }

  revalidateHealth();
  for (const catId of toInsert.keys()) {
    revalidateCat(catId);
  }

  appendActivityLog({
    action: "create",
    entity_type: "weight_log",
    summary: `Impor berat dari file .txt: ${result.applied} kucing (${date})`,
  }).catch(() => {});

  return result;
}

export interface BulkImportCatNameEntry {
  name: string;
  title?: string;
  line?: number;
}

export interface BulkImportCatNamesResult {
  applied: number;
  notFound: { line?: number; name: string }[];
  ambiguous: { line?: number; name: string; matches: string[] }[];
  invalid: { line?: number; name: string; reason: string }[];
  appliedCats: { name: string; title?: string }[];
}

function isBulkImportCatNamePayload(v: unknown): v is BulkImportCatNameEntry[] {
  if (!Array.isArray(v) || v.length === 0) return false;
  if (v.length > BULK_MAX_IDS) return false;
  return v.every(
    (item) =>
      item != null &&
      typeof item === "object" &&
      typeof (item as BulkImportCatNameEntry).name === "string" &&
      ((item as BulkImportCatNameEntry).title === undefined ||
        typeof (item as BulkImportCatNameEntry).title === "string"),
  );
}

async function upsertPreventiveLogForCat(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  catId: string,
  type: PreventiveType,
  date: string,
  title: string,
) {
  const dateNorm = date.trim().slice(0, 10);

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
    return;
  }

  const { error: insertError } = await supabase.from("health_logs").insert({
    cat_id: catId,
    type,
    date,
    title,
    next_due_date: null,
    is_active_treatment: false,
  });
  if (insertError) throw new AppError(ErrorCode.DB_ERROR, insertError.message, insertError);
}

/** Impor log preventive (obat cacing / obat kutu / vaksin) dari daftar nama kucing. */
export async function bulkImportPreventiveFromTxt(
  formData: FormData,
): Promise<BulkImportCatNamesResult> {
  await requireAdmin();

  const type = getString(formData, "type", { required: true });
  const date = requireDate(formData, "date", "Tanggal");
  const defaultTitle = getOptionalString(formData, "title")?.trim() || null;
  const entries = getJson<unknown>(formData, "entries");

  if (!validatePreventiveType(type)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Tipe harus VACCINE, FLEA, atau DEWORM.");
  }
  if (!isBulkImportCatNamePayload(entries)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      "Format entri tidak valid. Diperlukan array nama kucing.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: cats, error: catsError } = await supabase
    .from("cats")
    .select("id, name, cat_id")
    .eq("is_active", true);

  if (catsError) throw new AppError(ErrorCode.DB_ERROR, catsError.message, catsError);

  const catList = (cats ?? []) as CatMatchCandidate[];
  const preventiveType = type as PreventiveType;
  const fallbackTitle = PREVENTIVE_TITLES[preventiveType];

  const result: BulkImportCatNamesResult = {
    applied: 0,
    notFound: [],
    ambiguous: [],
    invalid: [],
    appliedCats: [],
  };

  const toApply = new Map<string, { name: string; title: string }>();

  for (const entry of entries) {
    const name = entry.name.trim();
    const line = entry.line;

    if (!name) {
      result.invalid.push({ line, name, reason: "Nama kucing kosong." });
      continue;
    }

    const match = matchCatByToken(catList, name);
    if (match.status === "not_found") {
      result.notFound.push({ line, name });
      continue;
    }
    if (match.status === "ambiguous") {
      result.ambiguous.push({
        line,
        name,
        matches: match.matches.map((c) => c.name),
      });
      continue;
    }

    const title = entry.title?.trim() || defaultTitle || fallbackTitle;
    toApply.set(match.cat.id, { name: match.cat.name, title });
  }

  if (toApply.size === 0) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      "Tidak ada kucing yang bisa diterapkan. Periksa nama kucing di file.",
    );
  }

  for (const [catId, { name, title }] of toApply) {
    await upsertPreventiveLogForCat(supabase, catId, preventiveType, date, title);
    result.applied += 1;
    result.appliedCats.push({ name, title });
  }

  revalidateHealth();
  for (const catId of toApply.keys()) {
    revalidateCat(catId);
  }

  const typeLabel =
    preventiveType === "DEWORM" ? "obat cacing" : preventiveType === "FLEA" ? "obat kutu" : "vaksin";
  appendActivityLog({
    action: "create",
    entity_type: "health_log",
    summary: `Impor ${typeLabel} dari file .txt: ${result.applied} kucing (${date})`,
  }).catch(() => {});

  return result;
}

/** Impor log grooming dari daftar nama kucing. */
export async function bulkImportGroomingFromTxt(
  formData: FormData,
): Promise<BulkImportCatNamesResult> {
  await requireAdminOrGroomer();

  const date = requireDate(formData, "date", "Tanggal");
  const entries = getJson<unknown>(formData, "entries");

  if (!isBulkImportCatNamePayload(entries)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      "Format entri tidak valid. Diperlukan array nama kucing.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: cats, error: catsError } = await supabase
    .from("cats")
    .select("id, name, cat_id")
    .eq("is_active", true);

  if (catsError) throw new AppError(ErrorCode.DB_ERROR, catsError.message, catsError);

  const catList = (cats ?? []) as CatMatchCandidate[];
  const dateNorm = date.trim().slice(0, 10);

  const result: BulkImportCatNamesResult = {
    applied: 0,
    notFound: [],
    ambiguous: [],
    invalid: [],
    appliedCats: [],
  };

  const toApply = new Map<string, { name: string }>();

  for (const entry of entries) {
    const name = entry.name.trim();
    const line = entry.line;

    if (!name) {
      result.invalid.push({ line, name, reason: "Nama kucing kosong." });
      continue;
    }

    const match = matchCatByToken(catList, name);
    if (match.status === "not_found") {
      result.notFound.push({ line, name });
      continue;
    }
    if (match.status === "ambiguous") {
      result.ambiguous.push({
        line,
        name,
        matches: match.matches.map((c) => c.name),
      });
      continue;
    }

    toApply.set(match.cat.id, { name: match.cat.name });
  }

  if (toApply.size === 0) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      "Tidak ada kucing yang bisa diterapkan. Periksa nama kucing di file.",
    );
  }

  for (const [catId, { name }] of toApply) {
    const { data: existing } = await supabase
      .from("grooming_logs")
      .select("id, date")
      .eq("cat_id", catId)
      .order("date", { ascending: false });

    const existingId =
      (existing ?? []).find((r) => r?.date && String(r.date).trim().slice(0, 10) === dateNorm)?.id ??
      null;

    if (existingId) {
      const { error } = await supabase
        .from("grooming_logs")
        .update({ date })
        .eq("id", existingId)
        .eq("cat_id", catId);
      if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
    } else {
      const { error } = await supabase.from("grooming_logs").insert({ cat_id: catId, date });
      if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
    }

    result.applied += 1;
    result.appliedCats.push({ name });
  }

  revalidateGrooming();
  for (const catId of toApply.keys()) {
    revalidateCat(catId);
  }

  appendActivityLog({
    action: "create",
    entity_type: "grooming_log",
    summary: `Impor grooming dari file .txt: ${result.applied} kucing (${date})`,
  }).catch(() => {});

  return result;
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
  appendActivityLog({
    action: "update",
    entity_type: "weight_log",
    entity_id: id,
    summary: `Memperbarui log berat: ${weight} kg (${date})`,
  }).catch(() => {});
}

export async function deleteWeightLog(formData: FormData) {
  await requireAdmin();

  const id = getString(formData, "id", { required: true });

  const supabase = await createSupabaseServerClient();
  const { data: log, error: fetchError } = await supabase
    .from("weight_logs")
    .select("cat_id, date, weight_kg")
    .eq("id", id)
    .single();

  if (fetchError || !log) {
    throw new AppError(ErrorCode.NOT_FOUND, "Log berat tidak ditemukan.");
  }

  const { error } = await supabase.from("weight_logs").delete().eq("id", id);

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);

  revalidateCat(log.cat_id);
  revalidateHealth();
  appendActivityLog({
    action: "delete",
    entity_type: "weight_log",
    entity_id: id,
    summary: `Menghapus log berat: ${log.weight_kg} kg (${log.date})`,
  }).catch(() => {});
}

/** Returns { error?: string } so the client can show it in-dialog without triggering error boundary. */
export async function addGroomingLog(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdminOrGroomer();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Anda tidak punya akses.";
    return { error: msg };
  }

  let catId: string;
  let date: string;
  try {
    catId = getString(formData, "cat_id", { required: true });
    date = requireDate(formData, "date", "Tanggal");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Data tidak valid.";
    return { error: msg };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("grooming_logs").insert({
    cat_id: catId,
    date,
  });

  if (error) return { error: error.message };

  revalidateCat(catId);
  revalidateGrooming();
  return {};
}

export async function updateGroomingLog(formData: FormData) {
  await requireAdminOrGroomer();

  let id: string;
  let date: string;
  try {
    id = getString(formData, "id", { required: true });
    date = requireDate(formData, "date", "Tanggal");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Data tidak valid.";
    throw new AppError(ErrorCode.VALIDATION_ERROR, msg);
  }

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

export async function deleteGroomingLog(formData: FormData) {
  await requireAdminOrGroomer();

  const id = getString(formData, "id", { required: true });

  const supabase = await createSupabaseServerClient();
  const { data: log, error: fetchError } = await supabase
    .from("grooming_logs")
    .select("cat_id")
    .eq("id", id)
    .single();

  if (fetchError || !log) {
    throw new AppError(ErrorCode.NOT_FOUND, "Log grooming tidak ditemukan.");
  }

  const { error } = await supabase.from("grooming_logs").delete().eq("id", id);

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);

  revalidateCat(log.cat_id);
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

/** Payload: { catIds: string[], which: "latest" | "oldest" } */
function isBulkDeleteGroomingPayload(
  v: unknown
): v is { catIds: string[]; which: "latest" | "oldest" } {
  if (v == null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.catIds) || o.catIds.length === 0 || o.catIds.length > BULK_MAX_IDS)
    return false;
  if (o.catIds.some((id) => typeof id !== "string")) return false;
  return o.which === "latest" || o.which === "oldest";
}

export async function bulkDeleteGroomingLogs(formData: FormData) {
  await requireAdminOrGroomer();

  const payload = getJson<unknown>(formData, "payload");
  if (!isBulkDeleteGroomingPayload(payload)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      "Format payload tidak valid. Diperlukan payload dengan catIds dan which (latest|oldest)."
    );
  }

  const supabase = await createSupabaseServerClient();
  const orderDesc = payload.which === "latest";

  for (const catId of payload.catIds) {
    const { data: log, error: fetchError } = await supabase
      .from("grooming_logs")
      .select("id")
      .eq("cat_id", catId)
      .order("date", { ascending: !orderDesc })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw new AppError(ErrorCode.DB_ERROR, fetchError.message, fetchError);
    if (!log) continue;

    const { error } = await supabase.from("grooming_logs").delete().eq("id", log.id);
    if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
    revalidateCat(catId);
  }

  revalidateGrooming();
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

/** Tandai kucing sebagai sembuh: ubah status jadi sehat, nonaktifkan log perawatan, dan catat riwayat "Sembuh" di health_logs agar muncul di profil. */
export async function markCatsSembuh(formData: FormData) {
  await requireAdmin();
  const catIds = getJsonStringArray(formData, "cat_ids");
  if (catIds.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Pilih minimal satu kucing.");
  }
  const supabase = await createSupabaseServerClient();
  const today = todayISO();

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

  for (const catId of catIds) {
    const { error: insertError } = await supabase.from("health_logs").insert({
      cat_id: catId,
      date: today,
      type: "NOTE",
      title: "Sembuh",
      is_active_treatment: false,
    });
    if (insertError) throw new AppError(ErrorCode.DB_ERROR, insertError.message, insertError);
  }

  revalidateHealth();
  for (const id of catIds) revalidateCat(id);
}

/** Tambah kucing ke tab Dirawat: buat log NOTE "Dalam perawatan" + keterangan (opsional), is_active_treatment = true. Muncul di riwayat kesehatan profil. */
export async function addCatsToDirawat(formData: FormData) {
  await requireAdmin();
  const catIds = getJsonStringArray(formData, "cat_ids");
  if (catIds.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Pilih minimal satu kucing.");
  }
  const keterangan = getOptionalString(formData, "keterangan");
  const today = todayISO();
  const supabase = await createSupabaseServerClient();
  for (const catId of catIds) {
    const { error } = await supabase.from("health_logs").insert({
      cat_id: catId,
      date: today,
      type: "NOTE",
      title: "Dalam perawatan",
      details: keterangan?.trim() || null,
      is_active_treatment: true,
    });
    if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
  }
  revalidateHealth();
  for (const id of catIds) revalidateCat(id);
}
