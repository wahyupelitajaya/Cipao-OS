/**
 * Date helpers. Single source for date logic and parsing.
 */

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Returns YYYY-MM-DD for today (local date, not UTC). */
export function todayISO(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Parses a date string (YYYY-MM-DD or ISO). Returns null if invalid.
 */
export function parseDateISO(value: string | null | undefined): Date | null {
  if (value == null || String(value).trim() === "") return null;
  const d = new Date(String(value).trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Returns true if the string is a valid date (YYYY-MM-DD or parseable ISO).
 */
export function isValidDateString(value: string | null | undefined): boolean {
  return parseDateISO(value) !== null;
}

/**
 * Returns YYYY-MM-DD if value is a valid date; otherwise null.
 */
export function toISODateString(value: string | null | undefined): string | null {
  const d = parseDateISO(value);
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export function isOverdue(date: Date | null | undefined, today: Date): boolean {
  if (!date) return false;
  return startOfDay(date).getTime() < today.getTime();
}

export function isDueWithin(
  date: Date | null | undefined,
  today: Date,
  days: number,
): boolean {
  if (!date) return false;
  const target = startOfDay(date).getTime();
  const from = today.getTime();
  const to = from + days * 24 * 60 * 60 * 1000;
  return target >= from && target <= to;
}
