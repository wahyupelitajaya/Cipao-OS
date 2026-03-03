import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Untuk tampilan: hilangkan prefix "[WhatsApp] 62xxx: " dan "[WhatsApp] tes: " dari note. */
export function formatActivityNoteForDisplay(note: string): string {
  return note
    .replace(/^\[WhatsApp\]\s*\d+:\s*/i, "")
    .replace(/^\[WhatsApp\]\s*tes:\s*/i, "")
    .trim();
}

