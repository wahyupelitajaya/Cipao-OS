"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setVisitStatus, deleteActivity, deleteActivities } from "@/app/actions/activity";
import { getFriendlyMessage } from "@/lib/errors";
import { AddActivityDialog } from "@/components/activity/add-activity-dialog";
import type { DayActivityItem, VisitDayState } from "@/app/actions/activity";
import { cn } from "@/lib/utils";

interface ActivityDayPanelProps {
  date: string | null;
  visit: VisitDayState | null;
  activities: DayActivityItem[];
  cats: { id: string; name: string }[];
  admin: boolean;
  onVisitChange?: () => void;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Warna kapsul soft per waktu — selalu terang, menyesuaikan jenis */
const TIME_CAPSULE_CLASS: Record<string, string> = {
  Pagi: "bg-amber-50 text-amber-700/90",
  Siang: "bg-yellow-50 text-yellow-700/90",
  Sore: "bg-orange-50 text-orange-700/90",
  Malam: "bg-indigo-50 text-indigo-700/90",
};

/** Warna kapsul soft per lokasi — selalu terang */
const LOCATION_CAPSULE_CLASS: Record<string, string> = {
  Toko: "bg-sky-50 text-sky-700/90",
  Rumah: "bg-emerald-50 text-emerald-700/90",
};

function getCapsuleClass(value: string, map: Record<string, string>): string {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tracking-wide";
  const theme = map[value.trim()] ?? "bg-neutral-50 text-neutral-600/90";
  return `${base} ${theme}`;
}


export function ActivityDayPanel({
  date,
  visit,
  activities,
  cats,
  admin,
  onVisitChange,
}: ActivityDayPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<{ successCount: number; failed: { id: string; reason: string }[] } | null>(null);
  const [confirmSingleId, setConfirmSingleId] = useState<string | null>(null);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);

  async function handleSetVisited(visited: boolean) {
    if (!date) return;
    setError(null);
    startTransition(async () => {
      try {
        await setVisitStatus(date, visited);
        onVisitChange?.();
        router.refresh();
      } catch (err) {
        setError(getFriendlyMessage(err));
      }
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === activities.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(activities.map((a) => a.id)));
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    setError(null);
    setBulkResult(null);
    setDeletePending(true);
    try {
      const result = await deleteActivities(Array.from(selectedIds));
      setBulkResult(result);
      if (result.failed.length === 0) {
        setSelectedIds(new Set());
        onVisitChange?.();
        router.refresh();
      } else if (result.successCount > 0) {
        setSelectedIds(new Set());
        onVisitChange?.();
        router.refresh();
      }
    } catch (err) {
      setError(getFriendlyMessage(err));
    } finally {
      setDeletePending(false);
    }
  }

  async function handleDeleteOne(id: string) {
    setError(null);
    setBulkResult(null);
    setDeletePending(true);
    try {
      await deleteActivity(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      onVisitChange?.();
      router.refresh();
    } catch (err) {
      setError(getFriendlyMessage(err));
    } finally {
      setDeletePending(false);
    }
  }

  if (!date) {
    return (
      <div className="rounded-lg border border-border bg-background-elevated p-6 shadow-soft">
        <p className="text-sm text-muted-foreground">Pilih tanggal di kalender.</p>
      </div>
    );
  }

  const isVisited = visit?.visited === true;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-background-elevated p-6 shadow-soft">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {bulkResult && bulkResult.failed.length > 0 && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200" role="status">
          <p className="font-medium">
            {bulkResult.successCount} berhasil dihapus, {bulkResult.failed.length} gagal.
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs">Daftar ID yang gagal (bisa disalin)</summary>
            <pre className="mt-1 overflow-auto rounded bg-background/80 p-2 text-xs">
              {bulkResult.failed.map(({ id, reason }) => `${id}\t${reason}`).join("\n")}
            </pre>
          </details>
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {formatDateLabel(date)}
        </h2>
        {admin && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status kunjungan:</span>
            <Button
              variant={isVisited ? "default" : "outline"}
              size="sm"
              disabled={isPending}
              onClick={() => handleSetVisited(true)}
            >
              Dikunjungi
            </Button>
            <Button
              variant={!isVisited ? "default" : "outline"}
              size="sm"
              disabled={isPending}
              onClick={() => handleSetVisited(false)}
            >
              Tidak dikunjungi
            </Button>
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">Aktivitas hari ini</h3>
          {admin && (
            <div className="flex items-center gap-2">
              {activities.length > 0 && selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deletePending}
                  onClick={() => setConfirmBulkOpen(true)}
                >
                  {deletePending ? "Menghapus…" : `Hapus yang dipilih (${selectedIds.size})`}
                </Button>
              )}
              <AddActivityDialog
                date={date}
                cats={cats}
                onSuccess={() => {
                  onVisitChange?.();
                  router.refresh();
                }}
              />
            </div>
          )}
        </div>
        <ul className="space-y-2">
          {activities.length === 0 ? (
            <li className="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              Belum ada aktivitas.
            </li>
          ) : (
            <>
              {admin && activities.length > 0 && (
                <li className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === activities.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="text-muted-foreground">Pilih semua</span>
                  </label>
                </li>
              )}
              {activities.map((a) => (
                <li
                  key={a.id}
                  className={cn(
                    "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md border border-border bg-background px-3 py-2 text-sm",
                  )}
                >
                  {admin && (
                    <>
                      <label className="flex cursor-pointer items-center shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(a.id)}
                          onChange={() => toggleSelect(a.id)}
                          className="h-4 w-4 rounded border-border"
                        />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 px-2 text-muted-foreground hover:text-[hsl(var(--status-overdue))]"
                        disabled={deletePending}
                        onClick={() => setConfirmSingleId(a.id)}
                        title="Hapus aktivitas ini"
                      >
                        Hapus
                      </Button>
                      <span className="text-muted-foreground">·</span>
                    </>
                  )}
                  {(() => {
                    const tsRaw = (a.time_slots || "").trim();
                    const locRaw = (a.locations || "").trim();
                    const cat = (a.categories || "").trim();
                    const hide = (s: string) => !s || s === "Other" || s === "—";
                    const parts: React.ReactNode[] = [];
                    const timeValues = tsRaw ? tsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
                    const locValues = locRaw ? locRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
                    timeValues.forEach((t, i) => {
                      if (!hide(t)) {
                        parts.push(
                          <span key={`t-${i}`} className={getCapsuleClass(t, TIME_CAPSULE_CLASS)}>
                            {t}
                          </span>,
                        );
                      }
                    });
                    locValues.forEach((l, i) => {
                      if (!hide(l)) {
                        parts.push(
                          <span key={`l-${i}`} className={getCapsuleClass(l, LOCATION_CAPSULE_CLASS)}>
                            {l}
                          </span>,
                        );
                      }
                    });
                    if (!hide(cat)) parts.push(<span key="c" className="text-muted-foreground">{cat}</span>);
                    return parts.length === 0 ? null : parts.reduce<ReactNode[]>((acc, node, i) =>
                      i === 0 ? [node] : [...acc, <span key={`d${i}`} className="text-muted-foreground/60 mx-1">·</span>, node],
                      [],
                    );
                  })()}
                  {a.note && (
                    <span className="block w-full whitespace-pre-wrap text-muted-foreground">{a.note}</span>
                  )}
                </li>
              ))}
            </>
          )}
        </ul>
      </div>

      <ConfirmDialog
        open={confirmSingleId !== null}
        onOpenChange={(open) => !open && setConfirmSingleId(null)}
        title="Hapus aktivitas"
        description="Aktivitas ini akan dihapus. Lanjutkan?"
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={async () => {
          if (confirmSingleId) await handleDeleteOne(confirmSingleId);
        }}
        loading={deletePending}
      />
      <ConfirmDialog
        open={confirmBulkOpen}
        onOpenChange={(open) => !open && setConfirmBulkOpen(false)}
        title="Hapus aktivitas yang dipilih"
        description={`Yakin hapus ${selectedIds.size} aktivitas yang dipilih?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={handleDeleteSelected}
        loading={deletePending}
      />
    </div>
  );
}
