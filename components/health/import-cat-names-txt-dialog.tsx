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
import {
  bulkImportGroomingFromTxt,
  bulkImportPreventiveFromTxt,
  type BulkImportCatNamesResult,
} from "@/app/actions/logs";
import { matchCatByToken, type CatMatchCandidate } from "@/lib/cat-name-match";
import { getFriendlyMessage } from "@/lib/errors";
import { parseCatNamesTxtContent } from "@/lib/cat-names-txt-parser";
import type { PreventiveType } from "@/lib/constants";

export type ImportCatNamesKind = "deworm" | "flea" | "vaccine" | "grooming";

interface ImportCatNamesTxtDialogProps {
  cats: CatMatchCandidate[];
  kind: ImportCatNamesKind;
}

type PreviewRow =
  | { status: "ok"; line: number; name: string; title?: string; matchedName: string }
  | { status: "not_found"; line: number; name: string; title?: string }
  | { status: "ambiguous"; line: number; name: string; title?: string; matches: string[] }
  | { status: "parse_error"; line: number; raw: string; reason: string };

const KIND_CONFIG: Record<
  ImportCatNamesKind,
  {
    dialogTitle: string;
    dateLabel: string;
    description: string;
    example: string;
    showDefaultTitle: boolean;
    defaultTitleLabel?: string;
    defaultTitlePlaceholder?: string;
  }
> = {
  deworm: {
    dialogTitle: "Impor obat cacing dari file .txt",
    dateLabel: "Tanggal pemberian",
    description:
      "Satu baris per kucing. Opsional: Nama - jenis obat (mis. Drontal). Nama dicocokkan dengan kucing aktif di sistem.",
    example: "Cipao\nMochi - Drontal\n# baris komentar diabaikan",
    showDefaultTitle: true,
    defaultTitleLabel: "Jenis obat cacing default (opsional)",
    defaultTitlePlaceholder: "Contoh: Drontal, Profender, …",
  },
  flea: {
    dialogTitle: "Impor obat kutu dari file .txt",
    dateLabel: "Tanggal pemberian",
    description:
      "Satu baris per kucing. Opsional: Nama - jenis obat. Nama dicocokkan dengan kucing aktif di sistem.",
    example: "Cipao\nMochi - Frontline\nLuna",
    showDefaultTitle: true,
    defaultTitleLabel: "Jenis obat kutu default (opsional)",
    defaultTitlePlaceholder: "Contoh: Frontline, Revolution, …",
  },
  vaccine: {
    dialogTitle: "Impor vaksin dari file .txt",
    dateLabel: "Tanggal vaksinasi",
    description:
      "Satu baris per kucing. Opsional: Nama - jenis vaksin (mis. F3). Nama dicocokkan dengan kucing aktif di sistem.",
    example: "Cipao\nMochi - F3\nLuna - Rabies",
    showDefaultTitle: true,
    defaultTitleLabel: "Jenis vaksin default (opsional)",
    defaultTitlePlaceholder: "Contoh: F3, F4, Rabies, …",
  },
  grooming: {
    dialogTitle: "Impor grooming dari file .txt",
    dateLabel: "Tanggal grooming",
    description: "Satu baris per kucing. Nama dicocokkan dengan kucing aktif di sistem.",
    example: "Cipao\nMochi\nLuna",
    showDefaultTitle: false,
  },
};

const PREVENTIVE_TYPE: Record<Exclude<ImportCatNamesKind, "grooming">, PreventiveType> = {
  deworm: "DEWORM",
  flea: "FLEA",
  vaccine: "VACCINE",
};

export function ImportCatNamesTxtDialog({ cats, kind }: ImportCatNamesTxtDialogProps) {
  const config = KIND_CONFIG[kind];
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [defaultTitle, setDefaultTitle] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<BulkImportCatNamesResult | null>(null);

  const okCount = preview.filter((r) => r.status === "ok").length;
  const problemCount = preview.length - okCount;

  const entriesToApply = useMemo(
    () =>
      preview
        .filter((r): r is Extract<PreviewRow, { status: "ok" }> => r.status === "ok")
        .map((r) => ({ name: r.name, title: r.title, line: r.line })),
    [preview],
  );

  function resetState() {
    setFileName(null);
    setPreview([]);
    setError(null);
    setImportResult(null);
    setDefaultTitle("");
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
    const { entries, errors } = parseCatNamesTxtContent(content);
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
          title: entry.title,
          matchedName: match.cat.name,
        });
      } else if (match.status === "ambiguous") {
        rows.push({
          status: "ambiguous",
          line: entry.line,
          name: entry.name,
          title: entry.title,
          matches: match.matches.map((c) => c.name),
        });
      } else {
        rows.push({
          status: "not_found",
          line: entry.line,
          name: entry.name,
          title: entry.title,
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
    if (config.showDefaultTitle && defaultTitle.trim()) {
      formData.set("title", defaultTitle.trim());
    }
    if (kind !== "grooming") {
      formData.set("type", PREVENTIVE_TYPE[kind]);
    }

    startTransition(async () => {
      try {
        const result =
          kind === "grooming"
            ? await bulkImportGroomingFromTxt(formData)
            : await bulkImportPreventiveFromTxt(formData);
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
          <DialogTitle>{config.dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto text-sm">
          <p className="text-muted-foreground">{config.description}</p>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{config.dateLabel}</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full"
              disabled={isPending || importResult !== null}
            />
          </div>

          {config.showDefaultTitle && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {config.defaultTitleLabel}
              </label>
              <Input
                type="text"
                value={defaultTitle}
                onChange={(e) => setDefaultTitle(e.target.value)}
                placeholder={config.defaultTitlePlaceholder}
                className="w-full"
                disabled={isPending || importResult !== null}
              />
            </div>
          )}

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
            <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
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
                  <li
                    key={`${row.line}-${"name" in row ? row.name : row.raw}`}
                    className="px-3 py-2 text-xs"
                  >
                    <span className="text-muted-foreground">Baris {row.line}: </span>
                    {row.status === "ok" && (
                      <span>
                        <span className="font-medium">{row.matchedName}</span>
                        {row.title && (
                          <span className="text-muted-foreground"> · {row.title}</span>
                        )}
                        {row.matchedName.toLowerCase() !== row.name.toLowerCase() && (
                          <span className="text-muted-foreground"> (dari &quot;{row.name}&quot;)</span>
                        )}
                      </span>
                    )}
                    {row.status === "not_found" && (
                      <span className="text-destructive">
                        &quot;{row.name}&quot;
                        {row.title ? ` (${row.title})` : ""} — kucing tidak ditemukan
                      </span>
                    )}
                    {row.status === "ambiguous" && (
                      <span className="text-amber-800 dark:text-amber-200">
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
              {config.example}
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
