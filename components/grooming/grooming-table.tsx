"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditGroomingDialog } from "@/components/grooming/edit-grooming-dialog";
import { AddGroomingDialog } from "@/components/grooming/add-grooming-dialog";
import { bulkSetGroomingDate, bulkDeleteGroomingLogs } from "@/app/actions/logs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Tables } from "@/lib/types";

type Cat = Tables<"cats">;
type Breed = Tables<"cat_breeds">;
type GroomingLog = Tables<"grooming_logs">;

export interface GroomingRow {
  cat: Cat;
  /** Grooming terbaru (paling baru). */
  last: GroomingLog | null;
  /** Grooming sebelumnya (sebelum yang terbaru). */
  previous: GroomingLog | null;
}

interface GroomingTableProps {
  rows: GroomingRow[];
  breeds: Breed[];
  /** Admin or groomer can edit; owner is read-only. */
  canEdit: boolean;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Apakah tanggal grooming terbaru masuk dalam bulan (dan tahun) berjalan. */
function isGroomedThisMonth(lastDate: string | null | undefined): boolean {
  if (!lastDate) return false;
  const d = new Date(lastDate);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

const STATUS_CAPSULE = {
  sudah:
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tracking-wide bg-emerald-50 text-emerald-700/90 border border-emerald-200/80",
  belum:
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tracking-wide bg-amber-50 text-amber-700/90 border border-amber-200/80",
} as const;

const DATE_CAPSULE =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tabular-nums bg-slate-50 text-slate-700/90 border border-slate-200/80";
const DATE_EMPTY = "text-muted-foreground/70 text-xs";

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

export function GroomingTable({ rows, breeds, canEdit }: GroomingTableProps) {
  const router = useRouter();
  const breedsById = new Map(breeds.map((b) => [b.id, b]));
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDate, setBulkDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [bulkDeleteWhich, setBulkDeleteWhich] = useState<"latest" | "oldest" | null>(null);

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

  function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    const items = rows
      .filter((r) => selectedIds.has(r.cat.id))
      .map((r) => ({ catId: r.cat.id, logId: r.last?.id ?? null }));
    const formData = new FormData();
    formData.set("date", bulkDate);
    formData.set("payload", JSON.stringify({ items }));
    startTransition(async () => {
      await bulkSetGroomingDate(formData);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  const selectedCount = selectedIds.size;

  function handleBulkDelete(which: "latest" | "oldest") {
    setBulkDeleteWhich(which);
  }

  async function confirmBulkDelete() {
    if (!bulkDeleteWhich || selectedIds.size === 0) return;
    const formData = new FormData();
    formData.set("payload", JSON.stringify({ catIds: [...selectedIds], which: bulkDeleteWhich }));
    startTransition(async () => {
      await bulkDeleteGroomingLogs(formData);
      setBulkDeleteWhich(null);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {canEdit && selectedCount > 0 && (
        <div className="space-y-3">
          <form
            onSubmit={handleBulkSubmit}
            className="card flex flex-wrap items-center gap-3 px-5 py-4"
          >
            <span className="text-sm font-medium text-muted-foreground">
              Ubah tanggal grooming untuk {selectedCount} kucing
            </span>
            <Input
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              required
              className="h-9 w-[10.5rem]"
            />
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Menyimpan…" : "Simpan"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Batal
            </Button>
          </form>
          <div className="card flex flex-wrap items-center gap-2 px-5 py-3 border-border/60">
            <span className="text-sm text-muted-foreground mr-1">Hapus tanggal grooming:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => handleBulkDelete("latest")}
              disabled={isPending}
            >
              Hapus grooming terbaru
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => handleBulkDelete("oldest")}
              disabled={isPending}
            >
              Hapus grooming terlama
            </Button>
          </div>
        </div>
      )}

      <div className="w-full min-w-0 overflow-auto max-h-[75vh]" style={{ WebkitOverflowScrolling: "touch" }}>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {canEdit && (
                <th className="w-10 px-5 py-3">
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
              <th className="px-5 py-3">Cat</th>
              <th className="px-5 py-3">Status bulan ini</th>
              <th className="px-5 py-3">Grooming terbaru</th>
              <th className="px-5 py-3">Grooming sebelumnya</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={canEdit ? 5 : 4}
                  className="px-5 py-8 text-center text-sm text-muted-foreground"
                >
                  Tidak ada kucing.
                </td>
              </tr>
            )}
            {rows.map(({ cat, last, previous }) => (
              <tr
                key={cat.id}
                className="border-b border-border last:border-b-0 hover:bg-muted/20"
              >
                {canEdit && (
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
                    href={`/cats/${cat.id}?returnTo=/grooming`}
                    className="flex items-center gap-3 font-medium text-foreground hover:text-primary"
                  >
                    {cat.photo_url ? (
                      <img
                        src={cat.photo_url}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-medium text-muted-foreground"
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
                <td className="px-5 py-3 align-middle">
                  <span
                    className={
                      isGroomedThisMonth(last?.date) ? STATUS_CAPSULE.sudah : STATUS_CAPSULE.belum
                    }
                  >
                    {isGroomedThisMonth(last?.date) ? "Sudah" : "Belum"}
                  </span>
                </td>
                <td className="px-5 py-3 align-middle">
                  {canEdit && last ? (
                    <EditGroomingDialog
                      catName={cat.name}
                      log={last}
                      trigger={
                        <button
                          type="button"
                          className={`${DATE_CAPSULE} cursor-pointer hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`}
                        >
                          {formatDate(new Date(last.date))}
                        </button>
                      }
                    />
                  ) : canEdit && !last ? (
                    <AddGroomingDialog cat={cat} />
                  ) : last ? (
                    <span className={DATE_CAPSULE}>{formatDate(new Date(last.date))}</span>
                  ) : (
                    <span className={DATE_EMPTY}>—</span>
                  )}
                </td>
                <td className="px-5 py-3 align-middle">
                  {canEdit && previous ? (
                    <EditGroomingDialog
                      catName={cat.name}
                      log={previous}
                      trigger={
                        <button
                          type="button"
                          className={`${DATE_CAPSULE} cursor-pointer hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`}
                        >
                          {formatDate(new Date(previous.date))}
                        </button>
                      }
                    />
                  ) : previous ? (
                    <span className={DATE_CAPSULE}>{formatDate(new Date(previous.date))}</span>
                  ) : (
                    <span className={DATE_EMPTY}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bulkDeleteWhich && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => !open && setBulkDeleteWhich(null)}
          title={
            bulkDeleteWhich === "latest"
              ? "Hapus grooming terbaru"
              : "Hapus grooming terlama"
          }
          description={`Hapus tanggal grooming ${bulkDeleteWhich === "latest" ? "terbaru" : "terlama"} untuk ${selectedCount} kucing yang dipilih? Data tidak bisa dikembalikan.`}
          confirmLabel="Hapus"
          cancelLabel="Batal"
          onConfirm={confirmBulkDelete}
          loading={isPending}
        />
      )}
    </div>
  );
}
