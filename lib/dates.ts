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
 * Parses date as midnight in LOCAL timezone.
 * Handles: "2026-02-15" or "2026-02-15T00:00:00.000Z" (ISO) — always uses the date part as local day.
 * Avoids timezone bugs: new Date("2026-02-15") is UTC midnight, so in UTC-7 it becomes 14 Feb.
 */
export function parseLocalDateString(value: string | null | undefined): Date | null {
  if (value == null || String(value).trim() === "") return null;
  const s = String(value).trim();
  // Extract YYYY-MM-DD from start (pure date or ISO datetime like 2026-02-15T00:00:00.000Z)
  const datePart = s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    const date = new Date(y, m, d);
    if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null;
    return date;
  }
  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
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
