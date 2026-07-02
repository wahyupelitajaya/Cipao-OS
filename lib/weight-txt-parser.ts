import { WEIGHT_MAX_KG } from "@/lib/constants";

export interface ParsedWeightLine {
  line: number;
  name: string;
  weightKg: number;
  raw: string;
}

export interface ParseWeightTxtError {
  line: number;
  raw: string;
  reason: string;
}

export interface ParseWeightTxtResult {
  entries: ParsedWeightLine[];
  errors: ParseWeightTxtError[];
}

function isCommentOrEmpty(line: string): boolean {
  const t = line.trim();
  return t === "" || t.startsWith("#") || t.startsWith("//");
}

/** Parse satu baris: nama kucing + berat (kg). Mendukung pemisah spasi, tab, koma, titik dua, strip. */
export function parseWeightTxtLine(line: string, lineNumber: number): ParsedWeightLine | ParseWeightTxtError {
  const raw = line.trim();
  if (isCommentOrEmpty(line)) {
    return { line: lineNumber, raw, reason: "Baris kosong atau komentar." };
  }

  const weightMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*$/);
  if (!weightMatch) {
    return { line: lineNumber, raw, reason: "Berat tidak ditemukan di akhir baris." };
  }

  const weightKg = parseFloat(weightMatch[1]!.replace(",", "."));
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return { line: lineNumber, raw, reason: "Berat harus angka positif." };
  }
  if (weightKg > WEIGHT_MAX_KG) {
    return { line: lineNumber, raw, reason: `Berat maksimal ${WEIGHT_MAX_KG} kg.` };
  }

  const namePart = raw.slice(0, weightMatch.index).replace(/[\s,;:|\t-]+$/, "").trim();
  if (!namePart) {
    return { line: lineNumber, raw, reason: "Nama kucing tidak ditemukan." };
  }

  return { line: lineNumber, name: namePart, weightKg, raw };
}

/** Parse isi file .txt berisi daftar nama kucing dan beratnya (satu baris per kucing). */
export function parseWeightTxtContent(content: string): ParseWeightTxtResult {
  const entries: ParsedWeightLine[] = [];
  const errors: ParseWeightTxtError[] = [];

  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (isCommentOrEmpty(line)) continue;

    const parsed = parseWeightTxtLine(line, i + 1);
    if ("reason" in parsed) {
      errors.push(parsed);
    } else {
      entries.push(parsed);
    }
  }

  return { entries, errors };
}
