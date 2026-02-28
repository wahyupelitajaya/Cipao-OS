import { z } from "zod";
import { AppError, ErrorCode } from "@/lib/errors";

/**
 * Parse data with a Zod schema. On failure throws AppError(VALIDATION_ERROR) with first error message.
 */
export function parseWithAppError<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const first = result.error.issues[0];
  const message = first ? `${first.path.join(".")}: ${first.message}` : "Data tidak valid.";
  throw new AppError(ErrorCode.VALIDATION_ERROR, message, result.error.issues);
}

/** Build a plain object from FormData for the given keys (optional keys can be omitted). */
export function formDataToObject(
  formData: FormData,
  keys: { key: string; required?: boolean }[]
): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const { key, required } of keys) {
    const v = formData.get(key);
    const s = v instanceof File ? "" : String(v ?? "").trim();
    if (required && !s) throw new AppError(ErrorCode.VALIDATION_ERROR, `Field ${key} is required.`);
    obj[key] = s;
  }
  return obj;
}
