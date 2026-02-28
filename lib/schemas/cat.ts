import { z } from "zod";
import { CAT_STATUSES, CAT_LOCATIONS, SUGGESTED_STATUSES } from "@/lib/constants";

const catStatusSchema = z.enum(CAT_STATUSES as unknown as [string, ...string[]]);
const catLocationSchema = z.enum(CAT_LOCATIONS as unknown as [string, ...string[]]);
const suggestedStatusSchema = z.enum(SUGGESTED_STATUSES as unknown as [string, ...string[]]);

/** Payload for creating a cat (from FormData). */
export const createCatSchema = z.object({
  cat_id: z.string().min(1, "Cat ID wajib diisi."),
  name: z.string().min(1, "Nama wajib diisi."),
  dob: z.string().trim().optional().nullable(),
  status: catStatusSchema.optional(),
  location: catLocationSchema.optional(),
  owner_email: z.string().trim().optional(),
  owner_id: z.string().uuid().optional().nullable(),
});

/** Payload for updating a cat (from FormData). Photo is handled separately as File. */
export const updateCatSchema = z.object({
  id: z.string().uuid("ID kucing tidak valid."),
  name: z.string().min(1, "Nama wajib diisi."),
  dob: z.string().trim().optional(),
  status: catStatusSchema.optional(),
  location: catLocationSchema.optional(),
  breed_id: z.union([z.string().uuid(), z.literal("")]).optional().nullable(),
  photo_url: z.string().trim().optional(),
});

/** Payload for bulk update cats. */
export const bulkUpdateCatsSchema = z
  .object({
    cat_ids: z.array(z.string().uuid()).min(1, "Pilih minimal satu kucing."),
    status: catStatusSchema.optional(),
    location: catLocationSchema.optional(),
    breed_id: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => !!(data.status ?? data.location ?? (data.breed_id && data.breed_id.length > 0)),
    { message: "Pilih status, lokasi, atau jenis yang akan diubah.", path: ["status"] }
  );

/** Payload for accept suggested status (banner). */
export const acceptSuggestedStatusSchema = z.object({
  cat_id: z.string().uuid("ID kucing tidak valid."),
  status: suggestedStatusSchema,
});

export type CreateCatInput = z.infer<typeof createCatSchema>;
export type UpdateCatInput = z.infer<typeof updateCatSchema>;
export type BulkUpdateCatsInput = z.infer<typeof bulkUpdateCatsSchema>;
export type AcceptSuggestedStatusInput = z.infer<typeof acceptSuggestedStatusSchema>;
