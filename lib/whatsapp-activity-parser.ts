/**
 * Parser pesan WA untuk activity: tanggal, waktu, lokasi, catatan.
 * Dipakai oleh webhook POST dan route test (localhost).
 */

const TIME_SLOTS = ["Pagi", "Siang", "Sore", "Malam"] as const;
const LOCATIONS = ["Rumah", "Toko"] as const;

const MONTH_NAMES: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
  january: 1,
  february: 2,
  march: 3,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  october: 10,
  december: 12,
};

export function todayWITA(): string {
  const now = new Date();
  const wita = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const y = wita.getUTCFullYear();
  const m = String(wita.getUTCMonth() + 1).padStart(2, "0");
  const d = String(wita.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTimeSlot(): string {
  const h = (new Date().getUTCHours() + 8 + 24) % 24;
  if (h >= 5 && h < 11) return "Pagi";
  if (h >= 11 && h < 15) return "Siang";
  if (h >= 15 && h < 18) return "Sore";
  return "Malam";
}

/** Normalize text dari WhatsApp (line endings, Unicode punctuation/spaces) agar parsing konsisten. */
function normalizeText(s: string): string {
  return s
    .replace(/\uFEFF/g, "") // BOM
    .replace(/\\n/g, "\n") // escaped newline (beberapa gateway mengirim literal \n)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00A0/g, " ") // non-breaking space
    .replace(/\u2028/g, "\n") // line separator
    .replace(/\u2029/g, "\n") // paragraph separator
    .replace(/\uFF1A/g, ":") // fullwidth colon
    .replace(/\uFF0C/g, ",") // fullwidth comma
    .replace(/[\u2000-\u200B\u202F\u205F\u3000]/g, " ") // various Unicode spaces
    .trim();
}

/** Returns parsed date (YYYY-MM-DD) or null. Optional restOfLine: sisa teks setelah tanggal (jika baris diawali tanggal). */
function parseDateFromFirstLine(line: string): { date: string; restOfLine: string } | null {
  const trimmed = normalizeText(line);
  // Baris hanya berisi tanggal (dengan/tanpa hari)
  const exactWithWeekday = trimmed.match(
    /^(?:Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[\s,\uFF0C]+(\d{1,2})[\s]+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|April|May|June|July|August|September|October|November|December)[\s]+(\d{4})$/i,
  );
  const exactWithoutWeekday = trimmed.match(
    /^(\d{1,2})[\s]+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|April|May|June|July|August|September|October|November|December)[\s]+(\d{4})$/i,
  );
  let m = exactWithWeekday ?? exactWithoutWeekday;
  if (m) {
    const day = parseInt(m[1], 10);
    const monthKey = m[2].toLowerCase();
    const month = MONTH_NAMES[monthKey];
    const year = parseInt(m[3], 10);
    if (month && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
      const monthStr = String(month).padStart(2, "0");
      const dayStr = String(day).padStart(2, "0");
      return { date: `${year}-${monthStr}-${dayStr}`, restOfLine: "" };
    }
  }
  // Baris diawali tanggal lalu ada teks lain (format satu baris dari WA)
  const prefixWithWeekday = trimmed.match(
    /^(?:Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[\s,\uFF0C]+(\d{1,2})[\s]+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|April|May|June|July|August|September|October|November|December)[\s]+(\d{4})\s+(.*)$/is,
  );
  const prefixWithoutWeekday = trimmed.match(
    /^(\d{1,2})[\s]+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|April|May|June|July|August|September|October|November|December)[\s]+(\d{4})\s+(.*)$/is,
  );
  m = prefixWithWeekday ?? prefixWithoutWeekday;
  if (m) {
    const day = parseInt(m[1], 10);
    const monthKey = m[2].toLowerCase();
    const month = MONTH_NAMES[monthKey];
    const year = parseInt(m[3], 10);
    const rest = (m[4] ?? "").trim();
    if (month && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
      const monthStr = String(month).padStart(2, "0");
      const dayStr = String(day).padStart(2, "0");
      return { date: `${year}-${monthStr}-${dayStr}`, restOfLine: rest };
    }
  }
  return null;
}

export interface ParsedWhatsAppActivity {
  date: string | null;
  timeSlot: string;
  location: string;
  note: string;
}

/**
 * Parse pesan WA: baris pertama tanggal (opsional), lalu "Pagi Toko :" + catatan.
 * Untuk tes lokal: panggil ini dengan teks pesan, lalu insert ke DB dengan hasilnya.
 */
export function parseWhatsAppActivityMessage(text: string): ParsedWhatsAppActivity {
  const normalized = normalizeText(text);
  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const first = lines[0] ?? "";
  let restLines: string[];
  let parsedDate: string | null = null;

  const dateResult = parseDateFromFirstLine(first);
  if (dateResult) {
    parsedDate = dateResult.date;
    const restOfFirst = dateResult.restOfLine.trim();
    restLines = restOfFirst ? [restOfFirst, ...lines.slice(1)] : lines.slice(1);
  } else {
    restLines = lines;
  }

  const restText = restLines.join("\n").trim();
  let rest = restText;
  let timeSlot: string | null = null;
  let location: string | null = null;

  const timeMatch = rest.match(/^(pagi|siang|sore|malam)(?:\s|$)/i);
  if (timeMatch) {
    const word = timeMatch[1].charAt(0).toUpperCase() + timeMatch[1].slice(1).toLowerCase();
    if (TIME_SLOTS.includes(word as (typeof TIME_SLOTS)[number])) {
      timeSlot = word;
      rest = rest.slice(timeMatch[0].length).trim();
    }
  }

  const locMatch = rest.match(/^(rumah|toko)(?:\s|$|:)/i);
  if (locMatch) {
    const word = locMatch[1].charAt(0).toUpperCase() + locMatch[1].slice(1).toLowerCase();
    if (LOCATIONS.includes(word as (typeof LOCATIONS)[number])) {
      location = word;
      rest = rest.slice(locMatch[0].length).trim();
    }
  }

  // Fallback: jika waktu/lokasi tidak di awal baris (mis. format WA beda), cari di seluruh isi pesan.
  // Prioritas: isi pesan, bukan jam pengiriman.
  if (!timeSlot) {
    const anywhereTime = normalized.match(/\b(pagi|siang|sore|malam)\b/i);
    if (anywhereTime) {
      const word = anywhereTime[1].charAt(0).toUpperCase() + anywhereTime[1].slice(1).toLowerCase();
      if (TIME_SLOTS.includes(word as (typeof TIME_SLOTS)[number])) timeSlot = word;
    }
  }
  if (!location) {
    const anywhereLoc = normalized.match(/\b(rumah|toko)\b/i);
    if (anywhereLoc) {
      const word = anywhereLoc[1].charAt(0).toUpperCase() + anywhereLoc[1].slice(1).toLowerCase();
      if (LOCATIONS.includes(word as (typeof LOCATIONS)[number])) location = word;
    }
  }

  rest = rest.replace(/^\s*[:\uFF1A]?\s*/, "").trim();

  return {
    date: parsedDate,
    timeSlot: timeSlot ?? getTimeSlot(),
    location: location ?? "Rumah",
    note: rest || restText,
  };
}
