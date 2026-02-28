"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditCatDialog } from "@/components/cats/edit-cat-dialog";
import { bulkSetLastPreventiveDate, bulkSetNextDueDate } from "@/app/actions/logs";
import { SetNextDueDialog } from "@/components/health/set-next-due-dialog";
import { SetLastDateDialog } from "@/components/health/set-last-date-dialog";
import type { Tables } from "@/lib/types";
import type { StatusSuggestion } from "@/lib/cat-status";

type Cat = Tables<"cats">;
type Breed = Tables<"cat_breeds">;

export interface PreventiveLog {
  id: string;
  date: string;
  next_due_date: string | null;
}

export interface HealthRow {
  cat: Cat;
  suggestion: StatusSuggestion;
  lastVaccineLog: PreventiveLog | null;
  lastFleaLog: PreventiveLog | null;
  lastDewormLog: PreventiveLog | null;
}

const PREVENTIVE_OPTIONS = [
  { value: "VACCINE", label: "Vaccine" },
  { value: "FLEA", label: "Flea" },
  { value: "DEWORM", label: "Deworm" },
] as const;

interface HealthTableProps {
  rows: HealthRow[];
  breeds: Breed[];
  admin: boolean;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAge(dob: string | null | undefined): string {
  if (!dob) return "—";
  try {
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return "—";
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years > 0 && months > 0) return `${years} tahun ${months} bulan`;
    if (years > 0) return `${years} tahun`;
    if (months > 0) return `${months} bulan`;
    return "< 1 bulan";
  } catch {
    return "—";
  }
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isOverdue(nextDue: string | null): boolean {
  if (!nextDue) return false;
  const d = new Date(nextDue);
  return startOfDay(d).getTime() < startOfDay(new Date()).getTime();
}

function isDueWithin7Days(nextDue: string | null): boolean {
  if (!nextDue) return false;
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(nextDue));
  const diff = (due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000);
  return diff >= 0 && diff <= 7;
}

function PreventiveCell({
  log,
  type,
  catId,
  catName,
  admin,
}: {
  log: PreventiveLog | null;
  type: "VACCINE" | "FLEA" | "DEWORM";
  catId: string;
  catName: string;
  admin: boolean;
}) {
  const lastLine = log?.date
    ? `Last: ${formatDateShort(new Date(log.date))}`
    : "—";
  const nextDue = log?.next_due_date ?? null;
  const nextLine = nextDue
    ? `Next: ${formatDateShort(new Date(nextDue))}`
    : "—";

  const nextClass = nextDue
    ? isOverdue(nextDue)
      ? "text-[hsl(var(--status-overdue))]"
      : isDueWithin7Days(nextDue)
        ? "text-[hsl(var(--status-due-soon))]"
        : "text-muted-foreground"
    : "text-muted-foreground";

  return (
    <div className="min-w-0 space-y-0.5 text-[11px] leading-tight">
      <div className="flex items-center gap-1 text-muted-foreground">
        <span>{lastLine}</span>
        {admin && log && (
          <SetLastDateDialog
            logId={log.id}
            currentDate={log.date}
            catName={catName}
            type={type}
            admin={admin}
            triggerLabel="Set Last"
          />
        )}
      </div>
      <div className={`flex items-center gap-1 ${nextClass}`}>
        <span>{nextLine}</span>
        {admin && (
          <SetNextDueDialog
            catId={catId}
            catName={catName}
            type={type}
            log={log}
            admin={admin}
            triggerLabel="Set Next"
          />
        )}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  reasons,
}: {
  status: StatusSuggestion["suggested"];
  reasons: string[];
}) {
  const label =
    status === "Needs Attention"
      ? "Perlu Perhatian"
      : status === "Monitor"
        ? "Pantau"
        : "Sehat";
  const variant =
    status === "Needs Attention"
      ? "bg-[hsl(var(--status-bg-overdue))] text-[hsl(var(--status-overdue))]"
      : status === "Monitor"
        ? "bg-[hsl(var(--status-bg-due-soon))] text-[hsl(var(--status-due-soon))]"
        : "bg-[hsl(var(--status-bg-ok))] text-[hsl(var(--status-ok))]";
  const tooltip =
    reasons.length > 0 ? reasons.join("\n") : status === "Healthy" ? "Tidak ada catatan khusus" : label;
  return (
    <span
      title={tooltip}
      className={`inline-flex cursor-help items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${variant}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          status === "Needs Attention"
            ? "bg-[hsl(var(--status-overdue))]"
            : status === "Monitor"
              ? "bg-[hsl(var(--status-due-soon))]"
              : "bg-[hsl(var(--status-ok))]"
        }`}
        aria-hidden
      />
      {label}
    </span>
  );
}

export function HealthTable({ rows, breeds, admin }: HealthTableProps) {
  const breedsById = new Map(breeds.map((b) => [b.id, b]));
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSetType, setBulkSetType] = useState("VACCINE");
  const [bulkSetDate, setBulkSetDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [bulkNextDueType, setBulkNextDueType] = useState("VACCINE");
  const [bulkNextDueDate, setBulkNextDueDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const allIds = rows.map((r) => r.cat.id);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  function toggleOne(catId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }

  function handleBulkSetLast(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    const formData = new FormData();
    formData.set("cat_ids", JSON.stringify(Array.from(selectedIds)));
    formData.set("type", bulkSetType);
    formData.set("date", bulkSetDate);
    startTransition(async () => {
      await bulkSetLastPreventiveDate(formData);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  function handleBulkSetNextDue(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    const formData = new FormData();
    formData.set("cat_ids", JSON.stringify(Array.from(selectedIds)));
    formData.set("type", bulkNextDueType);
    formData.set("next_due_date", bulkNextDueDate);
    startTransition(async () => {
      await bulkSetNextDueDate(formData);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  const selectedCount = selectedIds.size;
  const colSpanBase = admin ? 8 : 7;

  return (
    <div className="space-y-4">
      {admin && selectedCount > 0 && (
        <div className="card space-y-3 px-5 py-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-muted-foreground">
              {selectedCount} kucing dipilih
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Batal pilih
            </Button>
          </div>
          <div className="grid gap-4 border-t pt-3 sm:grid-cols-2">
            <form
              onSubmit={handleBulkSetLast}
              className="flex min-h-[7.5rem] flex-col gap-3 rounded-md border border-border bg-[hsl(var(--status-bg-due-soon))] p-3"
            >
              <div>
                <p className="text-xs font-medium text-[hsl(var(--status-due-soon))]">
                  Set Last
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Tanggal pemberian terakhir
                </p>
              </div>
              <div className="flex flex-1 flex-wrap items-end gap-2">
                <select
                  value={bulkSetType}
                  onChange={(e) => setBulkSetType(e.target.value)}
                  name="bulk_last_type"
                  title="Tipe: Vaccine, Flea, atau Deworm"
                  className="h-9 min-w-[5.5rem] rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {PREVENTIVE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  name="bulk_last_date"
                  value={bulkSetDate}
                  onChange={(e) => setBulkSetDate(e.target.value)}
                  required
                  title="Tanggal pemberian terakhir"
                  className="h-9 w-[10.5rem]"
                />
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Menyimpan…" : "Simpan Last"}
                </Button>
              </div>
            </form>
            <form
              onSubmit={handleBulkSetNextDue}
              className="flex min-h-[7.5rem] flex-col gap-3 rounded-md border border-border bg-[hsl(var(--status-bg-ok))] p-3"
            >
              <div>
                <p className="text-xs font-medium text-[hsl(var(--status-ok))]">
                  Set Next due
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Jadwal pemberian berikutnya
                </p>
              </div>
              <div className="flex flex-1 flex-wrap items-end gap-2">
                <select
                  value={bulkNextDueType}
                  onChange={(e) => setBulkNextDueType(e.target.value)}
                  name="bulk_next_type"
                  title="Tipe: Vaccine, Flea, atau Deworm"
                  className="h-9 min-w-[5.5rem] rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {PREVENTIVE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  name="bulk_next_date"
                  value={bulkNextDueDate}
                  onChange={(e) => setBulkNextDueDate(e.target.value)}
                  required
                  title="Jadwal berikutnya"
                  className="h-9 w-[10.5rem]"
                />
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Menyimpan…" : "Simpan Next due"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {admin && (
                <th className="w-10 px-5 py-3 text-left">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="sr-only">Pilih semua</span>
                  </label>
                </th>
              )}
              <th className="px-5 py-3 text-left">Cat</th>
              <th className="min-w-[7rem] px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-right">Last weight</th>
              <th className="px-5 py-3 text-left">Vaccine</th>
              <th className="px-5 py-3 text-left">Flea</th>
              <th className="px-5 py-3 text-left">Deworm</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={colSpanBase}
                  className="px-5 py-8 text-center text-sm text-muted-foreground"
                >
                  Tidak ada kucing.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const { cat, suggestion, lastVaccineLog, lastFleaLog, lastDewormLog } = row;
              const lastWeight = suggestion.lastWeight;
              return (
                <tr
                  key={cat.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/20"
                >
                  {admin && (
                    <td className="px-5 py-3 align-middle">
                      <label className="flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(cat.id)}
                          onChange={() => toggleOne(cat.id)}
                          className="h-4 w-4 rounded border-input"
                        />
                      </label>
                    </td>
                  )}
                  <td className="px-5 py-3 align-middle">
                    <Link
                      href={`/cats/${cat.id}`}
                      className="flex items-center gap-3 font-medium text-foreground hover:text-primary"
                    >
                      {cat.photo_url ? (
                        <img
                          src={cat.photo_url}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-medium text-muted-foreground"
                          aria-hidden
                        >
                          {cat.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="flex flex-col gap-0.5">
                        <span>{cat.name}</span>
                        <span className="font-elegant text-[0.7rem] italic text-muted-foreground tracking-wide">
                          {cat.breed_id && breedsById.get(cat.breed_id)?.name
                            ? breedsById.get(cat.breed_id)!.name
                            : "—"}
                          {" | "}
                          {formatAge(cat.dob)}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="min-w-[7rem] px-5 py-3 align-middle">
                    <StatusBadge status={suggestion.suggested} reasons={suggestion.reasons} />
                  </td>
                  <td className="px-5 py-3 align-middle text-right text-[11px] tabular-nums text-muted-foreground">
                    {lastWeight ? (
                      <>
                        <div>{lastWeight.weightKg.toFixed(2)} kg</div>
                        <div className="text-[10px] font-normal">
                          {formatDateShort(lastWeight.date)}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3 align-middle">
                    <PreventiveCell
                      log={lastVaccineLog}
                      type="VACCINE"
                      catId={cat.id}
                      catName={cat.name}
                      admin={admin}
                    />
                  </td>
                  <td className="px-5 py-3 align-middle">
                    <PreventiveCell
                      log={lastFleaLog}
                      type="FLEA"
                      catId={cat.id}
                      catName={cat.name}
                      admin={admin}
                    />
                  </td>
                  <td className="px-5 py-3 align-middle">
                    <PreventiveCell
                      log={lastDewormLog}
                      type="DEWORM"
                      catId={cat.id}
                      catName={cat.name}
                      admin={admin}
                    />
                  </td>
                  <td className="px-5 py-3 align-middle text-right text-xs">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/cats/${cat.id}`}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Buka
                      </Link>
                      {admin && <EditCatDialog cat={cat} breeds={breeds} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
