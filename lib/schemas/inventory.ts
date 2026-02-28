import { z } from "zod";
import { INVENTORY_MOVEMENT_REASONS } from "@/lib/constants";

const movementReasonSchema = z.enum(INVENTORY_MOVEMENT_REASONS as unknown as [string, ...string[]]);

const isoDateOptionalSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (s) => !s || (/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime())),
    { message: "Format tanggal tidak valid." }
  );

/** Payload for adjustInventoryStock. */
export const inventoryMovementSchema = z
  .object({
    item_id: z.string().uuid("ID item tidak valid."),
    delta: z.number().refine((n) => n !== 0, "Jumlah perubahan tidak boleh nol."),
    reason: movementReasonSchema,
    note: z.string().trim().optional().nullable(),
    date: isoDateOptionalSchema,
  });

export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;
