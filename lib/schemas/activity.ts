import { z } from "zod";
import { ACTIVITY_CATEGORIES, BULK_MAX_IDS } from "@/lib/constants";

const TIME_SLOTS = ["Pagi", "Siang", "Sore", "Malam"] as const;
const LOCATIONS = ["Rumah", "Toko"] as const;

const timeSlotSchema = z.enum(TIME_SLOTS);
const locationSchema = z.enum(LOCATIONS);
const categorySchema = z.enum(ACTIVITY_CATEGORIES as unknown as [string, ...string[]]);

const isoDateSchema = z
  .string()
  .trim()
  .refine((s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime()), {
    message: "Format tanggal tidak valid.",
  });

/** Payload for adding a daily activity. */
export const addActivitySchema = z.object({
  date: isoDateSchema,
  time_slots: z
    .array(timeSlotSchema)
    .min(1, "Pilih minimal satu waktu."),
  locations: z
    .array(locationSchema)
    .min(1, "Pilih minimal satu lokasi."),
  categories: z.array(categorySchema),
  note: z.string().trim().optional().nullable(),
});

/** Payload for setVisitStatus(date, visited). */
export const visitStatusSchema = z.object({
  date: isoDateSchema,
  visited: z.boolean(),
});

/** Payload for deleteActivity(id). */
export const deleteActivitySchema = z.object({
  id: z.string().min(1, "ID aktivitas wajib diisi."),
});

/** Payload for deleteActivities(ids). */
export const deleteActivitiesSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, "Pilih minimal satu aktivitas untuk dihapus.")
    .max(BULK_MAX_IDS, `Maksimal ${BULK_MAX_IDS} item per aksi.`),
});

export type AddActivityInput = z.infer<typeof addActivitySchema>;
export type VisitStatusInput = z.infer<typeof visitStatusSchema>;
export type DeleteActivityInput = z.infer<typeof deleteActivitySchema>;
export type DeleteActivitiesInput = z.infer<typeof deleteActivitiesSchema>;
