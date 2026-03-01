/**
 * FormData parsing and validation helpers for Server Actions.
 */

import {
  CAT_STATUSES,
  CAT_LOCATIONS,
  HEALTH_TYPES,
  PREVENTIVE_TYPES,
  INVENTORY_MOVEMENT_REASONS,
  SUGGESTED_STATUSES,
  WEIGHT_MAX_KG,
  BULK_MAX_IDS,
} from "./constants";
import type {
  CatStatus,
  CatLocation,
  HealthType,
  PreventiveType,
  InventoryMovementReason,
  SuggestedStatus,
} from "./constants";
import { isValidDateString, toISODateString, todayISO } from "./dates";

export function getString(
  formData: FormData,
  key: string,
  options?: { required?: boolean; maxLength?: number }
): string {
  const v = String(formData.get(key) ?? "").trim();
  if (options?.required && !v) {
    throw new Error(`Field ${key} is required.`);
  }
  if (options?.maxLength != null && v.length > options.maxLength) {
    throw new Error(`Field ${key} must be at most ${options.maxLength} characters.`);
  }
  return v;
}

export function getOptionalString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Returns date string YYYY-MM-DD or null. Throws if required but missing/invalid. Tidak konversi lewat UTC. */
export function getDate(
  formData: FormData,
  key: string,
  options?: { required?: boolean }
): string | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) {
    if (options?.required) throw new Error(`Field ${key} (date) is required.`);
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const dateStr = toISODateString(raw);
  if (!dateStr && options?.required) {
    throw new Error("Format tanggal tidak valid.");
  }
  return dateStr;
}

export function getNumber(
  formData: FormData,
  key: string,
  options?: { required?: boolean; min?: number; max?: number }
): number {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw && options?.required) throw new Error(`Field ${key} is required.`);
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Field ${key} must be a number.`);
  if (options?.min != null && n < options.min) {
    throw new Error(`Field ${key} must be at least ${options.min}.`);
  }
  if (options?.max != null && n > options.max) {
    throw new Error(`Field ${key} must be at most ${options.max}.`);
  }
  return n;
}

/** For inventory delta: required, non-zero, any sign. */
export function getInventoryDelta(formData: FormData): number {
  const n = getNumber(formData, "delta", { required: true });
  if (n === 0) throw new Error("Jumlah perubahan tidak boleh nol.");
  return n;
}

/** Parse JSON from form field. Throws friendly error on invalid JSON. */
export function getJson<T = unknown>(formData: FormData, key: string): T {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) throw new Error(`Field ${key} is required.`);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("Format data tidak valid.");
  }
}

/** Parse JSON array of strings. Validates length. */
export function getJsonStringArray(formData: FormData, key: string): string[] {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    throw new Error("Format daftar tidak valid.");
  }
  if (!Array.isArray(arr)) {
    throw new Error("Daftar harus berupa array.");
  }
  if (!arr.every((x): x is string => typeof x === "string")) {
    throw new Error("Array harus berisi string saja.");
  }
  const ids = arr as string[];
  if (ids.length > BULK_MAX_IDS) {
    throw new Error(`Maksimal ${BULK_MAX_IDS} item per aksi.`);
  }
  return ids;
}

export function validateCatStatus(value: string): value is CatStatus {
  return (CAT_STATUSES as readonly string[]).includes(value);
}

export function validateCatLocation(value: string): value is CatLocation {
  return (CAT_LOCATIONS as readonly string[]).includes(value);
}

export function validateHealthType(value: string): value is HealthType {
  return (HEALTH_TYPES as readonly string[]).includes(value);
}

export function validatePreventiveType(value: string): value is PreventiveType {
  return (PREVENTIVE_TYPES as readonly string[]).includes(value);
}

export function validateMovementReason(value: string): value is InventoryMovementReason {
  return (INVENTORY_MOVEMENT_REASONS as readonly string[]).includes(value);
}

export function validateSuggestedStatus(value: string): value is SuggestedStatus {
  return (SUGGESTED_STATUSES as readonly string[]).includes(value);
}

/** Throws if date string is invalid or required but empty. Returns YYYY-MM-DD (tanpa lewat UTC). */
export function requireDate(formData: FormData, key: string, label = "Tanggal"): string {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) throw new Error(`${label} wajib diisi.`);
  // Input dari <input type="date"> selalu YYYY-MM-DD (hari kalender lokal). Jangan konversi lewat Date/UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (!isValidDateString(raw)) throw new Error("Format tanggal tidak valid.");
  return toISODateString(raw) ?? raw;
}

/** Validates weight_kg: positive, max WEIGHT_MAX_KG. */
export function getWeightKg(formData: FormData, key: string): number {
  const n = getNumber(formData, key, { required: true, min: 0.01, max: WEIGHT_MAX_KG });
  return n;
}

/**
 * Safe redirect: only allow relative paths.
 * Rejects protocol schemes anywhere in the string, protocol-relative URLs,
 * backslashes (browser normalisation attack), and null bytes.
 */
export function isSafeRedirectPath(path: string | null | undefined): boolean {
  if (path == null || typeof path !== "string") return false;
  const trimmed = path.trim();
  if (trimmed === "") return false;
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  if (/https?:/i.test(trimmed)) return false;
  if (trimmed.includes("\\") || trimmed.includes("\0")) return false;
  return true;
}

/** Valid photo URL: only https. Rejects http, data:, file:, etc. */
export function isValidPhotoUrl(url: string | null | undefined): boolean {
  if (url == null || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed === "") return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}
