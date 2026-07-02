"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { bulkImportWeightFromTxt, type BulkImportWeightResult } from "@/app/actions/logs";
import { matchCatByToken, type CatMatchCandidate } from "@/lib/cat-name-match";
import { getFriendlyMessage } from "@/lib/errors";
import { parseWeightTxtContent } from "@/lib/weight-txt-parser";

interface ImportWeightTxtDialogProps {
  cats: CatMatchCandidate[];
}

type PreviewRow =
  | { status: "ok"; line: number; name: string; weightKg: number; matchedName: string }
  | { status: "not_found"; line: number; name: string; weightKg: number }
  | { status: "ambiguous"; line: number; name: string; weightKg: number; matches: string[] }
  | { status: "parse_error"; line: number; raw: string; reason: string };

export function ImportWeightTxtDialog({ cats }: ImportWeightTxtDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<BulkImportWeightResult | null>(null);

  const okCount = preview.filter((r) => r.status === "ok").length;
  const problemCount = preview.length - okCount;

  const entriesToApply = useMemo(
    () =>
      preview
        .filter((r): r is Extract<PreviewRow, { status: "ok" }> => r.status === "ok")
        .map((r) => ({ name: r.name, weightKg: r.weightKg, line: r.line })),
    [preview],
  );

  function resetState() {
    setFileName(null);
    setPreview([]);
    setError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      resetState();
      setDate(new Date().toISOString().slice(0, 10));
    }
  }

  function buildPreview(content: string): PreviewRow[] {
    const { entries, errors } = parseWeightTxtContent(content);
    const rows: PreviewRow[] = [];

    for (const err of errors) {
      rows.push({
        status: "parse_error",
        line: err.line,
        raw: err.raw,
        reason: err.reason,
      });
    }

    for (const entry of entries) {
      const match = matchCatByToken(cats, entry.name);
      if (match.status === "matched") {
        rows.push({
          status: "ok",
          line: entry.line,
          name: entry.name,
          weightKg: entry.weightKg,
          matchedName: match.cat.name,
        });
      } else if (match.status === "ambiguous") {
        rows.push({
          status: "ambiguous",
          line: entry.line,
          name: entry.name,
          weightKg: entry.weightKg,
          matches: match.matches.map((c) => c.name),
        });
      } else {
        rows.push({
          status: "not_found",
          line: entry.line,
          name: entry.name,
          weightKg: entry.weightKg,
        });
      }
    }

    return rows.sort((a, b) => a.line - b.line);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setImportResult(null);
    const file = e.target.files?.[0];
    if (!file) {
      resetState();
      return;
    }

    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("Hanya file .txt yang didukung.");
      resetState();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      if (!content.trim()) {
        setError("File kosong.");
        setPreview([]);
        setFileName(file.name);
        return;
      }
      setFileName(file.name);
      setPreview(buildPreview(content));
    };
    reader.onerror = () => {
      setError("Gagal membaca file.");
    };
    reader.readAsText(file, "UTF-8");
  }

  function handleApply() {
    if (entriesToApply.length === 0) return;
    setError(null);
    const formData = new FormData();
    formData.set("date", date);
    formData.set("entries", JSON.stringify(entriesToApply));

    startTransition(async () => {
      try {
        const result = await bulkImportWeightFromTxt(formData);
        setImportResult(result);
        router.refresh();
      } catch (err) {
        setError(getFriendlyMessage(err));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4 shrink-0" aria-hidden />
          Impor dari .txt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] flex flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Impor berat badan dari file .txt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto text-sm">
          <p className="text-muted-foreground">
            Satu baris per kucing: <span className="font-mono text-xs">Nama 3.25</span> atau{" "}
            <span className="font-mono text-xs">Nama - 3,25</span>. Nama dicocokkan dengan kucing aktif di sistem.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tanggal timbang</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full"
              disabled={isPending || importResult !== null}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">File .txt</label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              onChange={handleFileChange}
              disabled={isPending || importResult !== null}
              className="cursor-pointer"
            />
            {fileName && (
              <p className="text-xs text-muted-foreground">
                File: {fileName}
                {preview.length > 0 && (
                  <>
                    {" "}
                    · {okCount} siap diterapkan
                    {problemCount > 0 && ` · ${problemCount} perlu diperbaiki`}
                  </>
                )}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {importResult && (
            <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900">
              <p className="font-medium">Berhasil: {importResult.applied} kucing</p>
              {(importResult.notFound.length > 0 || importResult.ambiguous.length > 0) && (
                <p className="mt-1 text-xs">
                  {importResult.notFound.length > 0 && `${importResult.notFound.length} tidak ditemukan. `}
                  {importResult.ambiguous.length > 0 && `${importResult.ambiguous.length} ambigu (nama mirip).`}
                </p>
              )}
            </div>
          )}

          {preview.length > 0 && !importResult && (
            <div className="rounded-lg border border-border">
              <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                Pratinjau
              </div>
              <ul className="max-h-48 divide-y divide-border overflow-y-auto">
                {preview.map((row) => (
                  <li key={`${row.line}-${"name" in row ? row.name : row.raw}`} className="px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Baris {row.line}: </span>
                    {row.status === "ok" && (
                      <span>
                        <span className="font-medium">{row.matchedName}</span>
                        {" · "}
                        {row.weightKg.toFixed(2)} kg
                        {row.matchedName.toLowerCase() !== row.name.toLowerCase() && (
                          <span className="text-muted-foreground"> (dari &quot;{row.name}&quot;)</span>
                        )}
                      </span>
                    )}
                    {row.status === "not_found" && (
                      <span className="text-destructive">
                        &quot;{row.name}&quot; ({row.weightKg.toFixed(2)} kg) — kucing tidak ditemukan
                      </span>
                    )}
                    {row.status === "ambiguous" && (
                      <span className="text-amber-800">
                        &quot;{row.name}&quot; — cocok dengan beberapa kucing: {row.matches.join(", ")}
                      </span>
                    )}
                    {row.status === "parse_error" && (
                      <span className="text-destructive">
                        {row.reason}
                        {row.raw ? ` — "${row.raw}"` : ""}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium">Contoh format file</summary>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted/40 p-2 font-mono text-[11px] leading-relaxed">
{`Cipao 3.20
Mochi - 2.85
# baris komentar diabaikan
Luna, 4.1`}
            </pre>
          </details>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {importResult ? "Tutup" : "Batal"}
          </Button>
          {!importResult && (
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={isPending || entriesToApply.length === 0}
            >
              {isPending ? "Menyimpan…" : `Terapkan (${entriesToApply.length})`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
