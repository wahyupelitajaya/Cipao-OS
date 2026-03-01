"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bulkSetLastPreventiveDate, bulkSetNextDueDate, bulkAddWeightLog } from "@/app/actions/logs";
import { getFriendlyMessage } from "@/lib/errors";
import { SetNextDueDialog } from "@/components/health/set-next-due-dialog";
import { SetLastDateDialog } from "@/components/health/set-last-date-dialog";
import { EditWeightLogDialog } from "@/components/health/edit-weight-log-dialog";
import { DeleteWeightLogButton } from "@/components/health/delete-weight-log-button";
import type { Tables } from "@/lib/types";
import type { StatusSuggestion } from "@/lib/cat-status";

type Cat = Tables<"cats">;
type Breed = Tables<"cat_breeds">;

export interface PreventiveLog {
  id: string;
  date: string;
  next_due_date: string | null;
  title: string;
}

export interface HealthRow {
  cat: Cat;
  suggestion: StatusSuggestion;
  lastWeightLogId: string | null;
  previousWeight: { id: string; date: string; weightKg: number } | null;
  lastVaccineLog: PreventiveLog | null;
  lastFleaLog: PreventiveLog | null;
  lastDewormLog: PreventiveLog | null;
}

const PREVENTIVE_OPTIONS = [
  { value: "VACCINE", label: "Vaksin" },
  { value: "FLEA", label: "Obat kutu" },
  { value: "DEWORM", label: "Obat cacing" },
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

/** Status & keterangan untuk preventive (vaksin/obat kutu/obat cacing) berdasarkan next_due_date */
function getPreventiveStatus(nextDue: string | null): { status: "Terlambat" | "Aman" | "—"; keterangan: string } {
  if (!nextDue) return { status: "—", keterangan: "Belum dijadwalkan" };
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(nextDue));
  const days = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return { status: "Terlambat", keterangan: `Terlambat ${Math.abs(days)} hari` };
  if (days === 0) return { status: "Aman", keterangan: "Hari ini" };
  return { status: "Aman", keterangan: `${days} hari lagi` };
}

/** Status berat: naik / turun / sama berdasarkan berat terbaru vs sebelumnya, plus jumlah kenaikan/turun (kg) */
function getWeightTrend(
  last: { weightKg?: number } | null | undefined,
  previous: { weightKg?: number } | null | undefined,
): { label: "Naik" | "Turun" | "Sama" | "—"; deltaKg: number | null } {
  const lastKg = last != null ? Number(last.weightKg) : NaN;
  const prevKg = previous != null ? Number(previous.weightKg) : NaN;
  if (Number.isNaN(lastKg) || Number.isNaN(prevKg)) return { label: "—", deltaKg: null };
  const deltaKg = lastKg - prevKg;
  if (deltaKg > 0) return { label: "Naik", deltaKg };
  if (deltaKg < 0) return { label: "Turun", deltaKg };
  return { label: "Sama", deltaKg: 0 };
}

function PreventiveCell({
  log,
  type,
  catId,
  catName,
  admin,
  showJenis = true,
}: {
  log: PreventiveLog | null;
  type: "VACCINE" | "FLEA" | "DEWORM";
  catId: string;
  catName: string;
  admin: boolean;
  showJenis?: boolean;
}) {
  const jenis = log?.title?.trim() || "—";
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
      {showJenis && (
        <div className="font-medium text-foreground">{jenis}</div>
      )}
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

type SectionKey = "berat" | "obatCacing" | "obatKutu" | "vaksin";

export function HealthTable({ rows, breeds, admin }: HealthTableProps) {
  const breedsById = new Map(breeds.map((b) => [b.id, b]));
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIdsBerat, setSelectedIdsBerat] = useState<Set<string>>(new Set());
  const [selectedIdsObatCacing, setSelectedIdsObatCacing] = useState<Set<string>>(new Set());
  const [selectedIdsObatKutu, setSelectedIdsObatKutu] = useState<Set<string>>(new Set());
  const [selectedIdsVaksin, setSelectedIdsVaksin] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<SectionKey>("berat");
  const [bulkSetDate, setBulkSetDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [bulkNextDueDate, setBulkNextDueDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [bulkWeightDate, setBulkWeightDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [bulkWeightKg, setBulkWeightKg] = useState("");
  const [bulkWeightError, setBulkWeightError] = useState<string | null>(null);

  const allIds = rows.map((r) => r.cat.id);

  function getSelectedForSection(section: SectionKey): Set<string> {
    switch (section) {
      case "berat":
        return selectedIdsBerat;
      case "obatCacing":
        return selectedIdsObatCacing;
      case "obatKutu":
        return selectedIdsObatKutu;
      case "vaksin":
        return selectedIdsVaksin;
    }
  }

  function setSelectedForSection(section: SectionKey, set: Set<string> | ((prev: Set<string>) => Set<string>)) {
    const updater = typeof set === "function" ? set : () => set;
    switch (section) {
      case "berat":
        setSelectedIdsBerat(updater);
        break;
      case "obatCacing":
        setSelectedIdsObatCacing(updater);
        break;
      case "obatKutu":
        setSelectedIdsObatKutu(updater);
        break;
      case "vaksin":
        setSelectedIdsVaksin(updater);
        break;
    }
  }

  function toggleOne(section: SectionKey, catId: string) {
    setSelectedForSection(section, (prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  function toggleAll(section: SectionKey) {
    const selected = getSelectedForSection(section);
    const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
    setSelectedForSection(section, allSelected ? new Set() : new Set(allIds));
  }

  const PREVENTIVE_SECTION_MAP: Record<"obatCacing" | "obatKutu" | "vaksin", { type: "DEWORM" | "FLEA" | "VACCINE"; label: string }> = {
    obatCacing: { type: "DEWORM", label: "Obat cacing" },
    obatKutu: { type: "FLEA", label: "Obat kutu" },
    vaksin: { type: "VACCINE", label: "Vaksin" },
  };

  function handleBulkSetLastForSection(section: "obatCacing" | "obatKutu" | "vaksin") {
    const ids = getSelectedForSection(section);
    if (ids.size === 0) return;
    const { type } = PREVENTIVE_SECTION_MAP[section];
    const formData = new FormData();
    formData.set("cat_ids", JSON.stringify(Array.from(ids)));
    formData.set("type", type);
    formData.set("date", bulkSetDate);
    startTransition(async () => {
      await bulkSetLastPreventiveDate(formData);
      setSelectedForSection(section, new Set());
      router.refresh();
    });
  }

  function handleBulkSetNextDueForSection(section: "obatCacing" | "obatKutu" | "vaksin") {
    const ids = getSelectedForSection(section);
    if (ids.size === 0) return;
    const { type } = PREVENTIVE_SECTION_MAP[section];
    const formData = new FormData();
    formData.set("cat_ids", JSON.stringify(Array.from(ids)));
    formData.set("type", type);
    formData.set("next_due_date", bulkNextDueDate);
    startTransition(async () => {
      await bulkSetNextDueDate(formData);
      setSelectedForSection(section, new Set());
      router.refresh();
    });
  }

  function handleBulkAddWeight(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIdsBerat.size === 0) return;
    const w = parseFloat(bulkWeightKg.replace(",", "."));
    if (Number.isNaN(w) || w <= 0) return;
    const formData = new FormData();
    formData.set("cat_ids", JSON.stringify(Array.from(selectedIdsBerat)));
    formData.set("date", bulkWeightDate);
    formData.set("weight_kg", String(w));
    setBulkWeightError(null);
    startTransition(async () => {
      try {
        await bulkAddWeightLog(formData);
        setSelectedIdsBerat(new Set());
        setBulkWeightKg("");
        router.refresh();
      } catch (err) {
        setBulkWeightError(getFriendlyMessage(err));
      }
    });
  }

  const colSpanBerat = admin ? 5 : 4;
  const colSpanPreventive = admin ? 6 : 5;

  function CatCell({ cat }: { cat: Cat }) {
    return (
      <Link
        href={`/cats/${cat.id}?returnTo=/health`}
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
    );
  }

  function TableBox({ children }: { children: React.ReactNode }) {
    return (
      <div className="w-full max-w-full overflow-auto rounded-xl border border-border max-h-[75vh]" style={{ WebkitOverflowScrolling: "touch" }}>
        {children}
      </div>
    );
  }

  const tabs: { key: SectionKey; label: string }[] = [
    { key: "berat", label: "Berat badan" },
    { key: "obatCacing", label: "Obat cacing" },
    { key: "obatKutu", label: "Obat kutu" },
    { key: "vaksin", label: "Vaksin" },
  ];

  function handleTabChange(key: SectionKey) {
    if (key === activeTab) return;
    // Hilangkan centang di tab yang ditinggalkan
    switch (activeTab) {
      case "berat":
        setSelectedIdsBerat(new Set());
        break;
      case "obatCacing":
        setSelectedIdsObatCacing(new Set());
        break;
      case "obatKutu":
        setSelectedIdsObatKutu(new Set());
        break;
      case "vaksin":
        setSelectedIdsVaksin(new Set());
        break;
    }
    setActiveTab(key);
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Tab: pilih kategori, satu tabel tampil tanpa scroll panjang */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleTabChange(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {admin && selectedIdsBerat.size > 0 && (
        <div className="card space-y-3 px-5 py-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-muted-foreground">
              {selectedIdsBerat.size} kucing dipilih (dari tabel Berat badan)
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedIdsBerat(new Set()); setBulkWeightError(null); }}
            >
              Batal pilih
            </Button>
          </div>
          {bulkWeightError && (
            <p className="text-sm text-destructive" role="alert">
              {bulkWeightError}
            </p>
          )}
          <form onSubmit={handleBulkAddWeight} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tanggal</label>
              <Input
                type="date"
                name="bulk_weight_date"
                value={bulkWeightDate}
                onChange={(e) => setBulkWeightDate(e.target.value)}
                required
                className="h-9 w-[10.5rem]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Berat (kg)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Contoh: 4.5"
                value={bulkWeightKg}
                onChange={(e) => setBulkWeightKg(e.target.value)}
                required
                className="h-9 w-24"
              />
            </div>
            <Button type="submit" size="sm" disabled={isPending || !bulkWeightKg.trim()}>
              {isPending ? "Menyimpan…" : "Tambah log berat"}
            </Button>
          </form>
        </div>
      )}

      {admin && selectedIdsObatCacing.size > 0 && (
        <div className="card space-y-3 px-5 py-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-muted-foreground">
              {selectedIdsObatCacing.size} kucing dipilih (dari tabel Obat cacing)
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIdsObatCacing(new Set())}>
              Batal pilih
            </Button>
          </div>
          <div className="grid gap-4 border-t pt-3 sm:grid-cols-2">
            <form onSubmit={(e) => { e.preventDefault(); handleBulkSetLastForSection("obatCacing"); }} className="flex min-h-[7.5rem] flex-col gap-3 rounded-md border border-border bg-[hsl(var(--status-bg-due-soon))] p-3">
            <p className="text-xs font-medium text-[hsl(var(--status-due-soon))]">Set Last</p>
            <p className="text-[11px] text-muted-foreground">Tanggal pemberian terakhir</p>
            <div className="flex flex-1 flex-wrap items-end gap-2">
              <Input type="date" value={bulkSetDate} onChange={(e) => setBulkSetDate(e.target.value)} required className="h-9 w-[10.5rem]" />
              <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Menyimpan…" : "Simpan Last"}</Button>
            </div>
            </form>
            <form onSubmit={(e) => { e.preventDefault(); handleBulkSetNextDueForSection("obatCacing"); }} className="flex min-h-[7.5rem] flex-col gap-3 rounded-md border border-border bg-[hsl(var(--status-bg-ok))] p-3">
            <p className="text-xs font-medium text-[hsl(var(--status-ok))]">Set Next due</p>
            <p className="text-[11px] text-muted-foreground">Jadwal pemberian berikutnya</p>
            <div className="flex flex-1 flex-wrap items-end gap-2">
              <Input type="date" value={bulkNextDueDate} onChange={(e) => setBulkNextDueDate(e.target.value)} required className="h-9 w-[10.5rem]" />
              <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Menyimpan…" : "Simpan Next due"}</Button>
            </div>
            </form>
          </div>
        </div>
      )}

      {admin && selectedIdsObatKutu.size > 0 && (
        <div className="card space-y-3 px-5 py-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-muted-foreground">
              {selectedIdsObatKutu.size} kucing dipilih (dari tabel Obat kutu)
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIdsObatKutu(new Set())}>
              Batal pilih
            </Button>
          </div>
          <div className="grid gap-4 border-t pt-3 sm:grid-cols-2">
            <form onSubmit={(e) => { e.preventDefault(); handleBulkSetLastForSection("obatKutu"); }} className="flex min-h-[7.5rem] flex-col gap-3 rounded-md border border-border bg-[hsl(var(--status-bg-due-soon))] p-3">
            <p className="text-xs font-medium text-[hsl(var(--status-due-soon))]">Set Last</p>
            <p className="text-[11px] text-muted-foreground">Tanggal pemberian terakhir</p>
            <div className="flex flex-1 flex-wrap items-end gap-2">
              <Input type="date" value={bulkSetDate} onChange={(e) => setBulkSetDate(e.target.value)} required className="h-9 w-[10.5rem]" />
              <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Menyimpan…" : "Simpan Last"}</Button>
            </div>
            </form>
            <form onSubmit={(e) => { e.preventDefault(); handleBulkSetNextDueForSection("obatKutu"); }} className="flex min-h-[7.5rem] flex-col gap-3 rounded-md border border-border bg-[hsl(var(--status-bg-ok))] p-3">
            <p className="text-xs font-medium text-[hsl(var(--status-ok))]">Set Next due</p>
            <p className="text-[11px] text-muted-foreground">Jadwal pemberian berikutnya</p>
            <div className="flex flex-1 flex-wrap items-end gap-2">
              <Input type="date" value={bulkNextDueDate} onChange={(e) => setBulkNextDueDate(e.target.value)} required className="h-9 w-[10.5rem]" />
              <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Menyimpan…" : "Simpan Next due"}</Button>
            </div>
            </form>
          </div>
        </div>
      )}

      {admin && selectedIdsVaksin.size > 0 && (
        <div className="card space-y-3 px-5 py-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-muted-foreground">
              {selectedIdsVaksin.size} kucing dipilih (dari tabel Vaksin)
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIdsVaksin(new Set())}>
              Batal pilih
            </Button>
          </div>
          <div className="grid gap-4 border-t pt-3 sm:grid-cols-2">
            <form onSubmit={(e) => { e.preventDefault(); handleBulkSetLastForSection("vaksin"); }} className="flex min-h-[7.5rem] flex-col gap-3 rounded-md border border-border bg-[hsl(var(--status-bg-due-soon))] p-3">
            <p className="text-xs font-medium text-[hsl(var(--status-due-soon))]">Set Last</p>
            <p className="text-[11px] text-muted-foreground">Tanggal pemberian terakhir</p>
            <div className="flex flex-1 flex-wrap items-end gap-2">
              <Input type="date" value={bulkSetDate} onChange={(e) => setBulkSetDate(e.target.value)} required className="h-9 w-[10.5rem]" />
              <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Menyimpan…" : "Simpan Last"}</Button>
            </div>
            </form>
            <form onSubmit={(e) => { e.preventDefault(); handleBulkSetNextDueForSection("vaksin"); }} className="flex min-h-[7.5rem] flex-col gap-3 rounded-md border border-border bg-[hsl(var(--status-bg-ok))] p-3">
            <p className="text-xs font-medium text-[hsl(var(--status-ok))]">Set Next due</p>
            <p className="text-[11px] text-muted-foreground">Jadwal pemberian berikutnya</p>
            <div className="flex flex-1 flex-wrap items-end gap-2">
              <Input type="date" value={bulkNextDueDate} onChange={(e) => setBulkNextDueDate(e.target.value)} required className="h-9 w-[10.5rem]" />
              <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Menyimpan…" : "Simpan Next due"}</Button>
            </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "berat" && (
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Berat badan
        </h2>
        <TableBox>
          <table className="min-w-[560px] w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {admin && (
                  <th className="w-10 px-5 py-3 text-left">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allIds.length > 0 && allIds.every((id) => selectedIdsBerat.has(id))}
                        onChange={() => toggleAll("berat")}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="sr-only">Pilih semua (berat badan)</span>
                    </label>
                  </th>
                )}
                <th className="px-5 py-3 text-left">Cat</th>
                <th className="min-w-[5rem] px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Berat terbaru</th>
                <th className="px-5 py-3 text-right">Berat sebelumnya</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={colSpanBerat} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Tidak ada kucing.
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const { label: trendLabel, deltaKg } = getWeightTrend(row.suggestion.lastWeight ?? null, row.previousWeight);
                return (
                  <tr key={row.cat.id} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                    {admin && (
                      <td className="px-5 py-3 align-middle">
                        <label className="flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={selectedIdsBerat.has(row.cat.id)}
                            onChange={() => toggleOne("berat", row.cat.id)}
                            className="h-4 w-4 rounded border-input"
                          />
                        </label>
                      </td>
                    )}
                    <td className="px-5 py-3 align-middle">
                      <CatCell cat={row.cat} />
                    </td>
                    <td className="px-5 py-3 align-middle text-center">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={
                            trendLabel === "Naik"
                              ? "text-xs font-medium text-green-600"
                              : trendLabel === "Turun"
                                ? "text-xs font-medium text-amber-600"
                                : "text-xs text-muted-foreground"
                          }
                        >
                          {trendLabel}
                        </span>
                        {deltaKg !== null && (
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {deltaKg > 0 ? `+${deltaKg.toFixed(2)} kg` : deltaKg < 0 ? `${deltaKg.toFixed(2)} kg` : "0 kg"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 align-middle text-right text-[11px] tabular-nums text-muted-foreground">
                      {row.suggestion.lastWeight && row.lastWeightLogId ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <div>{Number(row.suggestion.lastWeight.weightKg).toFixed(2)} kg</div>
                          <div className="text-[10px] font-normal">
                            {formatDateShort(new Date(row.suggestion.lastWeight.date))}
                          </div>
                          {admin && (
                            <div className="flex items-center gap-2">
                              <EditWeightLogDialog
                                logId={row.lastWeightLogId}
                                initialDate={typeof row.suggestion.lastWeight.date === "string" ? row.suggestion.lastWeight.date : new Date(row.suggestion.lastWeight.date).toISOString().slice(0, 10)}
                                initialWeightKg={Number(row.suggestion.lastWeight.weightKg)}
                                label="Berat terbaru"
                                catName={row.cat.name ?? row.cat.cat_id ?? "—"}
                              >
                                <button type="button" className="text-xs text-primary hover:underline">
                                  Edit
                                </button>
                              </EditWeightLogDialog>
                              <DeleteWeightLogButton
                                logId={row.lastWeightLogId}
                                label="Berat terbaru"
                                catName={row.cat.name ?? row.cat.cat_id ?? "—"}
                                weightDisplay={`${Number(row.suggestion.lastWeight.weightKg).toFixed(2)} kg`}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 align-middle text-right text-[11px] tabular-nums text-muted-foreground">
                      {row.previousWeight ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <div>{Number(row.previousWeight.weightKg).toFixed(2)} kg</div>
                          <div className="text-[10px] font-normal">{formatDateShort(new Date(row.previousWeight.date))}</div>
                          {admin && (
                            <div className="flex items-center gap-2">
                              <EditWeightLogDialog
                                logId={row.previousWeight.id}
                                initialDate={row.previousWeight.date}
                                initialWeightKg={row.previousWeight.weightKg}
                                label="Berat sebelumnya"
                                catName={row.cat.name ?? row.cat.cat_id ?? "—"}
                              >
                                <button type="button" className="text-xs text-primary hover:underline">
                                  Edit
                                </button>
                              </EditWeightLogDialog>
                              <DeleteWeightLogButton
                                logId={row.previousWeight.id}
                                label="Berat sebelumnya"
                                catName={row.cat.name ?? row.cat.cat_id ?? "—"}
                                weightDisplay={`${Number(row.previousWeight.weightKg).toFixed(2)} kg`}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableBox>
      </section>
      )}

      {activeTab === "obatCacing" && (
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Obat cacing
        </h2>
        <TableBox>
          <table className="min-w-[780px] w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {admin && (
                  <th className="w-10 px-5 py-3 text-left">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allIds.length > 0 && allIds.every((id) => selectedIdsObatCacing.has(id))}
                        onChange={() => toggleAll("obatCacing")}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="sr-only">Pilih semua (obat cacing)</span>
                    </label>
                  </th>
                )}
                <th className="px-5 py-3 text-left">Cat</th>
                <th className="min-w-[5rem] px-5 py-3 text-left">Status</th>
                <th className="min-w-[6rem] px-5 py-3 text-left">Jenis obat cacing</th>
                <th className="min-w-[8rem] px-5 py-3 text-left">Last / Next due</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const { status, keterangan } = getPreventiveStatus(row.lastDewormLog?.next_due_date ?? null);
                return (
                  <tr key={row.cat.id} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                    {admin && (
                      <td className="px-5 py-3 align-middle">
                        <label className="flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={selectedIdsObatCacing.has(row.cat.id)}
                            onChange={() => toggleOne("obatCacing", row.cat.id)}
                            className="h-4 w-4 rounded border-input"
                          />
                        </label>
                      </td>
                    )}
                    <td className="px-5 py-3 align-middle">
                      <CatCell cat={row.cat} />
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <div className="space-y-0.5 text-[11px]">
                        <div className={status === "Terlambat" ? "font-medium text-red-600" : status === "Aman" ? "font-medium text-green-600" : "text-muted-foreground"}>
                          {status}
                        </div>
                        <div className="text-muted-foreground">{keterangan}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3 align-middle text-[11px] font-medium text-foreground">
                      {row.lastDewormLog?.title?.trim() || "—"}
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <PreventiveCell
                        log={row.lastDewormLog}
                        type="DEWORM"
                        catId={row.cat.id}
                        catName={row.cat.name}
                        admin={admin}
                        showJenis={false}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableBox>
      </section>
      )}

      {activeTab === "obatKutu" && (
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Obat kutu
        </h2>
        <TableBox>
          <table className="min-w-[780px] w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {admin && (
                  <th className="w-10 px-5 py-3 text-left">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allIds.length > 0 && allIds.every((id) => selectedIdsObatKutu.has(id))}
                        onChange={() => toggleAll("obatKutu")}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="sr-only">Pilih semua (obat kutu)</span>
                    </label>
                  </th>
                )}
                <th className="px-5 py-3 text-left">Cat</th>
                <th className="min-w-[5rem] px-5 py-3 text-left">Status</th>
                <th className="min-w-[6rem] px-5 py-3 text-left">Jenis obat kutu</th>
                <th className="min-w-[8rem] px-5 py-3 text-left">Last / Next due</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const { status, keterangan } = getPreventiveStatus(row.lastFleaLog?.next_due_date ?? null);
                return (
                  <tr key={row.cat.id} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                    {admin && (
                      <td className="px-5 py-3 align-middle">
                        <label className="flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={selectedIdsObatKutu.has(row.cat.id)}
                            onChange={() => toggleOne("obatKutu", row.cat.id)}
                            className="h-4 w-4 rounded border-input"
                          />
                        </label>
                      </td>
                    )}
                    <td className="px-5 py-3 align-middle">
                      <CatCell cat={row.cat} />
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <div className="space-y-0.5 text-[11px]">
                        <div className={status === "Terlambat" ? "font-medium text-red-600" : status === "Aman" ? "font-medium text-green-600" : "text-muted-foreground"}>
                          {status}
                        </div>
                        <div className="text-muted-foreground">{keterangan}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3 align-middle text-[11px] font-medium text-foreground">
                      {row.lastFleaLog?.title?.trim() || "—"}
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <PreventiveCell
                        log={row.lastFleaLog}
                        type="FLEA"
                        catId={row.cat.id}
                        catName={row.cat.name}
                        admin={admin}
                        showJenis={false}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableBox>
      </section>
      )}

      {activeTab === "vaksin" && (
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Vaksin
        </h2>
        <TableBox>
          <table className="min-w-[780px] w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {admin && (
                  <th className="w-10 px-5 py-3 text-left">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allIds.length > 0 && allIds.every((id) => selectedIdsVaksin.has(id))}
                        onChange={() => toggleAll("vaksin")}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="sr-only">Pilih semua (vaksin)</span>
                    </label>
                  </th>
                )}
                <th className="px-5 py-3 text-left">Cat</th>
                <th className="min-w-[5rem] px-5 py-3 text-left">Status</th>
                <th className="min-w-[6rem] px-5 py-3 text-left">Jenis vaksin</th>
                <th className="min-w-[8rem] px-5 py-3 text-left">Last / Next due</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const { status, keterangan } = getPreventiveStatus(row.lastVaccineLog?.next_due_date ?? null);
                return (
                  <tr key={row.cat.id} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                    {admin && (
                      <td className="px-5 py-3 align-middle">
                        <label className="flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={selectedIdsVaksin.has(row.cat.id)}
                            onChange={() => toggleOne("vaksin", row.cat.id)}
                            className="h-4 w-4 rounded border-input"
                          />
                        </label>
                      </td>
                    )}
                    <td className="px-5 py-3 align-middle">
                      <CatCell cat={row.cat} />
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <div className="space-y-0.5 text-[11px]">
                        <div className={status === "Terlambat" ? "font-medium text-red-600" : status === "Aman" ? "font-medium text-green-600" : "text-muted-foreground"}>
                          {status}
                        </div>
                        <div className="text-muted-foreground">{keterangan}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3 align-middle text-[11px] font-medium text-foreground">
                      {row.lastVaccineLog?.title?.trim() || "—"}
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <PreventiveCell
                        log={row.lastVaccineLog}
                        type="VACCINE"
                        catId={row.cat.id}
                        catName={row.cat.name}
                        admin={admin}
                        showJenis={false}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableBox>
      </section>
      )}
    </div>
  );
}
