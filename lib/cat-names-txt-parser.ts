export interface ParsedCatNameLine {
  line: number;
  name: string;
  title?: string;
  raw: string;
}

export interface ParseCatNamesTxtError {
  line: number;
  raw: string;
  reason: string;
}

export interface ParseCatNamesTxtResult {
  entries: ParsedCatNameLine[];
  errors: ParseCatNamesTxtError[];
}

function isCommentOrEmpty(line: string): boolean {
  const t = line.trim();
  return t === "" || t.startsWith("#") || t.startsWith("//");
}

/** Parse satu baris: nama kucing, opsional diikuti " - " atau " | " + jenis/catatan. */
export function parseCatNamesTxtLine(
  line: string,
  lineNumber: number,
): ParsedCatNameLine | ParseCatNamesTxtError {
  const raw = line.trim();
  if (isCommentOrEmpty(line)) {
    return { line: lineNumber, raw, reason: "Baris kosong atau komentar." };
  }

  const separators = [" - ", " | ", "\t"];
  for (const sep of separators) {
    const idx = raw.indexOf(sep);
    if (idx > 0) {
      const name = raw.slice(0, idx).trim();
      const title = raw.slice(idx + sep.length).trim();
      if (!name) {
        return { line: lineNumber, raw, reason: "Nama kucing tidak ditemukan." };
      }
      return {
        line: lineNumber,
        name,
        title: title || undefined,
        raw,
      };
    }
  }

  return { line: lineNumber, name: raw, raw };
}

/** Parse file .txt berisi daftar nama kucing (satu baris per kucing). */
export function parseCatNamesTxtContent(content: string): ParseCatNamesTxtResult {
  const entries: ParsedCatNameLine[] = [];
  const errors: ParseCatNamesTxtError[] = [];

  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (isCommentOrEmpty(line)) continue;

    const parsed = parseCatNamesTxtLine(line, i + 1);
    if ("reason" in parsed) {
      errors.push(parsed);
    } else {
      entries.push(parsed);
    }
  }

  return { entries, errors };
}
