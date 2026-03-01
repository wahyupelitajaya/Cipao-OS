/**
 * Centralized domain constants. Use these for validation and UI labels.
 */

// --- Cat ---
export const CAT_STATUSES = ["sehat", "membaik", "memburuk", "hampir_sembuh", "observasi", "sakit"] as const;
export type CatStatus = (typeof CAT_STATUSES)[number];

export const CAT_LOCATIONS = ["rumah", "toko", "klinik"] as const;
export type CatLocation = (typeof CAT_LOCATIONS)[number];

export const CAT_STATUS_LABELS: Record<CatStatus, string> = {
  sehat: "Sehat",
  membaik: "Membaik",
  memburuk: "Memburuk",
  hampir_sembuh: "Hampir Sembuh",
  observasi: "Observasi",
  sakit: "Sakit",
};

export const CAT_LOCATION_LABELS: Record<CatLocation, string> = {
  rumah: "Rumah",
  toko: "Toko",
  klinik: "Klinik",
};

// --- Health / Preventive ---
export const HEALTH_TYPES = [
  "VACCINE",
  "FLEA",
  "DEWORM",
  "ILLNESS",
  "MEDICATION",
  "CLINIC",
  "NOTE",
] as const;
export type HealthType = (typeof HEALTH_TYPES)[number];

export const PREVENTIVE_TYPES = ["VACCINE", "FLEA", "DEWORM"] as const;
export type PreventiveType = (typeof PREVENTIVE_TYPES)[number];

export const PREVENTIVE_TITLES: Record<PreventiveType, string> = {
  VACCINE: "Vaccine",
  FLEA: "Flea prevention",
  DEWORM: "Deworming",
};

export const HEALTH_TYPE_LABELS: Record<HealthType, string> = {
  VACCINE: "Vaksin",
  FLEA: "Flea",
  DEWORM: "Deworm",
  ILLNESS: "Sakit",
  MEDICATION: "Obat",
  CLINIC: "Klinik",
  NOTE: "Catatan",
};

// --- Vaccine / Obat kutu / Obat cacing (jenis untuk health log) ---
export const VACCINE_TYPES = ["F3", "F4", "RABIES"] as const;
export type VaccineType = (typeof VACCINE_TYPES)[number];

export const FLEA_TYPES = ["Frontline", "Revolution", "Seresto", "Lainnya"] as const;
export type FleaType = (typeof FLEA_TYPES)[number];

export const DEWORM_TYPES = ["Drontal", "Profender", "Drontal Plus", "Lainnya"] as const;
export type DewormType = (typeof DEWORM_TYPES)[number];

// --- Preventive care intervals (in months) ---
/** Months to add for automatic next_due_date calculation */
export const PREVENTIVE_INTERVALS: Record<PreventiveType, number> = {
  VACCINE: 12, // F3, F4, RABIES all +12 months
  FLEA: 1,     // +1 month
  DEWORM: 3,   // +3 months
};

// Suggested status (for status_manual / banner)
export const SUGGESTED_STATUSES = ["Needs Attention", "Monitor", "Healthy"] as const;
export type SuggestedStatus = (typeof SUGGESTED_STATUSES)[number];

export const SUGGESTED_STATUS_LABELS: Record<SuggestedStatus, string> = {
  "Needs Attention": "Perlu perhatian",
  Monitor: "Pantau",
  Healthy: "Sehat",
};

// --- Inventory ---
export const INVENTORY_MOVEMENT_REASONS = ["PURCHASE", "USAGE", "ADJUSTMENT"] as const;
export type InventoryMovementReason = (typeof INVENTORY_MOVEMENT_REASONS)[number];

// --- Activity ---
/** Kategori aktivitas (multi-pilih): sesuai migration activity_categories */
export const ACTIVITY_CATEGORIES = [
  "Bersih-Bersih",
  "Potong Kuku",
  "Grooming",
  "Ngepel",
  "Ganti Filter Tempat Minum",
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

// --- Photo upload ---
export const PHOTO_BUCKET = "cat-photos";
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5MB
export const PHOTO_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

// --- Business rules ---
/** Number of days ahead to consider preventive "due soon" */
export const DUE_SOON_DAYS = 7;

/** Number of days ahead for "recent notifications" on dashboard */
export const NOTIFICATION_WINDOW_DAYS = 14;

/** Max weight in kg for weight log (sanity upper bound) */
export const WEIGHT_MAX_KG = 50;

/** Max bulk array length for bulk actions */
export const BULK_MAX_IDS = 100;

/** Default page size for paginated lists (cats, reports). 50 so all seed cats (31) fit on first page. */
export const DEFAULT_PAGE_SIZE = 50;
