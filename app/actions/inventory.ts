"use server";

import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { requireAdmin } from "@/lib/auth";
import { AppError, ErrorCode, getFriendlyMessage } from "@/lib/errors";
import { revalidateInventory } from "@/lib/revalidate";
import {
  getString,
  getOptionalString,
  getDate,
  getInventoryDelta,
  validateMovementReason,
} from "@/lib/validation";
import { todayISO } from "@/lib/dates";

const SLUG_MAX_LENGTH = 32;
const DEFAULT_SLUG_FALLBACK = "OTHER";

export async function adjustInventoryStock(formData: FormData) {
  await requireAdmin();

  const itemId = getString(formData, "item_id", { required: true });
  const delta = getInventoryDelta(formData);
  const reason = getString(formData, "reason", { required: true });
  const note = getOptionalString(formData, "note");
  const dateRaw = getOptionalString(formData, "date");
  const date = dateRaw ? (getDate(formData, "date") ?? null) : null;
  const dateFinal = date ?? todayISO();
  if (dateRaw && !date) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Format tanggal tidak valid.");
  }

  if (!validateMovementReason(reason)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Alasan harus salah satu: PURCHASE, USAGE, ADJUSTMENT.");
  }

  const supabase = await createSupabaseServerClient();

  if (delta < 0) {
    const { data: item, error: fetchError } = await supabase
      .from("inventory_items")
      .select("stock_qty")
      .eq("id", itemId)
      .maybeSingle();
    if (fetchError) throw new AppError(ErrorCode.DB_ERROR, fetchError.message, fetchError);
    if (!item) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "Item tidak ditemukan.");
    }
    const currentStock = Number(item.stock_qty);
    if (currentStock + delta < 0) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Stok tidak cukup. Stok saat ini: ${currentStock}. Tidak boleh negatif.`,
      );
    }
  }

  const { error } = await supabase.from("inventory_movements").insert({
    item_id: itemId,
    date: dateFinal,
    change_qty: delta,
    reason,
    note: note || null,
  });

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);

  revalidateInventory();
}

export async function createInventoryCategory(formData: FormData) {
  await requireAdmin();

  const name = getString(formData, "name", { required: true });
  const slug =
    name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "") ||
    DEFAULT_SLUG_FALLBACK;

  const supabase = await createSupabaseServerClient();

  const { data: maxOrder } = await supabase
    .from("inventory_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  const sortOrder = (maxOrder?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("inventory_categories").insert({
    slug: slug.slice(0, SLUG_MAX_LENGTH),
    name,
    sort_order: sortOrder,
  });

  if (error) {
    throw new AppError(
      ErrorCode.DB_ERROR,
      error.code === "23505" ? "Slug kategori sudah ada." : error.message,
      error,
    );
  }
  revalidateInventory();
}

export async function deleteInventoryCategory(formData: FormData) {
  await requireAdmin();

  const id = getString(formData, "id", { required: true });

  const supabase = await createSupabaseServerClient();
  const { data: items } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("category_id", id)
    .limit(1);

  if (items && items.length > 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Kategori masih punya item. Pindahkan atau hapus item dulu.");
  }

  const { error } = await supabase
    .from("inventory_categories")
    .delete()
    .eq("id", id);

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
  revalidateInventory();
}

export async function createInventoryItem(formData: FormData) {
  await requireAdmin();

  const categoryId = getString(formData, "category_id", { required: true });
  const name = getString(formData, "name", { required: true });
  const unit = getString(formData, "unit", { required: true });
  const minRaw = getOptionalString(formData, "min_stock_qty");
  const initialRaw = getOptionalString(formData, "initial_stock");

  let minFinal: number | null = null;
  if (minRaw !== "") {
    const n = Number(minRaw);
    if (!Number.isFinite(n) || n < 0) throw new AppError(ErrorCode.VALIDATION_ERROR, "Min stok harus angka ≥ 0.");
    minFinal = n;
  }

  const initialFinal = initialRaw === "" ? 0 : Number(initialRaw);
  if (!Number.isFinite(initialFinal) || initialFinal < 0) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Stok awal harus angka ≥ 0.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: item, error: insertError } = await supabase
    .from("inventory_items")
    .insert({
      category_id: categoryId,
      name,
      unit,
      min_stock_qty: minFinal,
      stock_qty: 0,
    })
    .select("id")
    .single();

  if (insertError) throw new AppError(ErrorCode.DB_ERROR, insertError.message, insertError);

  if (item?.id && initialFinal !== 0) {
    await supabase.from("inventory_movements").insert({
      item_id: item.id,
      date: todayISO(),
      change_qty: initialFinal,
      reason: "ADJUSTMENT",
      note: "Stok awal",
    });
  }
  revalidateInventory();
}

export async function deleteInventoryItem(formData: FormData) {
  await requireAdmin();

  const id = getString(formData, "id", { required: true });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("inventory_items").delete().eq("id", id);

  if (error) throw new AppError(ErrorCode.DB_ERROR, error.message, error);
  revalidateInventory();
}

export type InventoryFormState = { error: string | null };

export async function createInventoryCategoryWithState(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  try {
    await createInventoryCategory(formData);
    return { error: null };
  } catch (err) {
    return { error: getFriendlyMessage(err) };
  }
}

export async function deleteInventoryCategoryWithState(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  try {
    await deleteInventoryCategory(formData);
    return { error: null };
  } catch (err) {
    return { error: getFriendlyMessage(err) };
  }
}

export async function createInventoryItemWithState(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  try {
    await createInventoryItem(formData);
    return { error: null };
  } catch (err) {
    return { error: getFriendlyMessage(err) };
  }
}

export async function deleteInventoryItemWithState(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  try {
    await deleteInventoryItem(formData);
    return { error: null };
  } catch (err) {
    return { error: getFriendlyMessage(err) };
  }
}

export async function adjustInventoryStockWithState(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  try {
    await adjustInventoryStock(formData);
    return { error: null };
  } catch (err) {
    return { error: getFriendlyMessage(err) };
  }
}
