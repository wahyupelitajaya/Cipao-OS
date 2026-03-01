"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bulkSetLastPreventiveDate, bulkSetNextDueDate, bulkAddWeightLog, checkExistingPreventiveLogs, markCatsSembuh, addCatsToDirawat } from "@/app/actions/logs";
import { getFriendlyMessage } from "@/lib/errors";
import { SetNextDueDialog } from "@/components/health/set-next-due-dialog";
import { SetLastDateDialog } from "@/components/health/set-last-date-dialog";
import { EditWeightLogDialog } from "@/components/health/edit-weight-log-dialog";
import { DeleteWeightLogButton } from "@/components/health/delete-weight-log-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditCatDirawatDialog } from "@/components/cats/edit-cat-dirawat-dialog";
import { BulkEditDirawatDialog } from "@/components/cats/bulk-edit-dirawat-dialog";
import { parseLocalDateString } from "@/lib/dates";
import { CAT_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
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
  /** Tab aktif dari URL (agar setelah pencarian/refresh tetap di tab yang sama). */
  initialTab?: SectionKey;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Capsule styles untuk tampilan mewah & soft di tabel health */
const CAPSULE = {
  /** Naik / Aman / positif */
  ok: "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80",
  /** Turun / perhatian */
  warning: "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80",
  /** Terlambat / sakit */
  overdue: "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200/80",
  /** Due soon / kurang baik */
  dueSoon: "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80",
  /** Netral / belum dijadwalkan / sama */
  neutral: "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/80",
  /** Tanggal / info sekunder */
  date: "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100/80 text-slate-600 border border-slate-200/60",
} as const;

/** Jenis vaksin → label tampilan + kelas kapsul (F3, F4, Rabies mudah dibedakan). */
function getVaccineTypeCapsule(title: string | null | undefined): { label: string; capsuleClass: string } {
  const t = title?.trim().toUpperCase() ?? "";
  if (t === "F3") {
    return { label: "F3", capsuleClass: "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200/80" };
  }
  if (t === "F4") {
    return { label: "F4", capsuleClass: "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-violet-50 text-violet-800 border border-violet-200/80" };
  }
  if (t === "RABIES") {
    return { label: "Rabies", capsuleClass: "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80" };
  }
  const fallback = title?.trim() || "—";
  return { label: fallback, capsuleClass: CAPSULE.neutral };
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
  const d = parseLocalDateString(nextDue);
  if (!d) return false;
  return d.getTime() < startOfDay(new Date()).getTime();
}

function isDueWithin7Days(nextDue: string | null): boolean {
  const due = parseLocalDateString(nextDue);
  if (!due) return false;
  const today = startOfDay(new Date());
  const diff = (due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000);
  return diff >= 0 && diff <= 7;
}

/** Status & keterangan untuk preventive berdasarkan next_due_date. Semua pakai tanggal lokal (hari kalender). */
function getPreventiveStatus(nextDue: string | null | undefined): { status: "Terlambat" | "Aman" | "—"; keterangan: string } {
  const due = parseLocalDateString(nextDue != null ? String(nextDue).trim() : null);
  if (!due) return { status: "—", keterangan: "Belum dijadwalkan" };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.floor((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
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

  const nextCapsuleClass = nextDue
    ? isOverdue(nextDue)
      ? CAPSULE.overdue
      : isDueWithin7Days(nextDue)
        ? CAPSULE.dueSoon
        : CAPSULE.ok
    : CAPSULE.neutral;

  return (
    <div className="min-w-0 space-y-1.5 text-[11px] leading-tight">
      {showJenis && (
        <div className="font-medium text-foreground">{jenis}</div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={CAPSULE.date}>{lastLine}</span>
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
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={nextCapsuleClass}>{nextLine}</span>
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

type SectionKey = "berat" | "obatCacing" | "obatKutu" | "vaksin" | "dirawat";

export function HealthTable({ rows, breeds, admin, initialTab = "berat" }: HealthTableProps) {
  const breedsById = new Map(breeds.map((b) => [b.id, b]));
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedIdsBerat, setSelectedIdsBerat] = useState<Set<string>>(new Set());
  const [selectedIdsObatCacing, setSelectedIdsObatCacing] = useState<Set<string>>(new Set());
  const [selectedIdsObatKutu, setSelectedIdsObatKutu] = useState<Set<string>>(new Set());
  const [selectedIdsVaksin, setSelectedIdsVaksin] = useState<Set<string>>(new Set());
  const [selectedIdsDirawat, setSelectedIdsDirawat] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<SectionKey>(initialTab);
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [viewScale, setViewScale] = useState(1);
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
  const [bulkDewormTitle, setBulkDewormTitle] = useState("");
  const [bulkFleaTitle, setBulkFleaTitle] = useState("");
  const [bulkVaccineTitle, setBulkVaccineTitle] = useState("");
  /** Konfirmasi replace log di tanggal yang sama (obat cacing / obat kutu / vaksin) */
  const [replaceConfirm, setReplaceConfirm] = useState<{ formData: FormData; section: "obatCacing" | "obatKutu" | "vaksin" } | null>(null);
  /** Yang sedang disimpan: { section, action } agar hanya tombol yang diklik yang tampil loading */
  const [pendingBulkAction, setPendingBulkAction] = useState<{ section: "obatCacing" | "obatKutu" | "vaksin"; action: "last" | "next" } | null>(null);
  /** Pesan sukses setelah simpan (per section+action), hilang setelah beberapa detik */
  const [savedFeedback, setSavedFeedback] = useState<{ section: "obatCacing" | "obatKutu" | "vaksin"; action: "last" | "next" } | null>(null);
  /** Tab Dirawat: id kucing yang sedang diedit (dialog edit per kucing) */
  const [editingDirawatCatId, setEditingDirawatCatId] = useState<string | null>(null);
  /** Tab Dirawat: dialog bulk edit untuk kucing terpilih */
  const [bulkEditDirawatOpen, setBulkEditDirawatOpen] = useState(false);
  /** Tab Dirawat: konfirmasi tandai sembuh */
  const [sembuhConfirmIds, setSembuhConfirmIds] = useState<string[] | null>(null);
  /** Tab Dirawat: dialog tambah kucing ke Dirawat */
  const [addToDirawatOpen, setAddToDirawatOpen] = useState(false);
  const [addToDirawatSelected, setAddToDirawatSelected] = useState<Set<string>>(new Set());
  const [addToDirawatKeterangan, setAddToDirawatKeterangan] = useState("");

  useEffect(() => {
    if (!savedFeedback) return;
    const t = setTimeout(() => setSavedFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [savedFeedback]);

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
      case "dirawat":
        return selectedIdsDirawat;
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
      case "dirawat":
        setSelectedIdsDirawat(updater);
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

  async function handleBulkSetLastForSection(section: "obatCacing" | "obatKutu" | "vaksin") {
    const ids = getSelectedForSection(section);
    if (ids.size === 0) return;
    const { type } = PREVENTIVE_SECTION_MAP[section];
    const formData = new FormData();
    formData.set("cat_ids", JSON.stringify(Array.from(ids)));
    formData.set("type", type);
    formData.set("date", bulkSetDate);
    if (section === "obatCacing" && bulkDewormTitle.trim()) formData.set("title", bulkDewormTitle.trim());
    if (section === "obatKutu" && bulkFleaTitle.trim()) formData.set("title", bulkFleaTitle.trim());
    if (section === "vaksin" && bulkVaccineTitle.trim()) formData.set("title", bulkVaccineTitle.trim());

    setPendingBulkAction({ section, action: "last" });
    try {
      const { hasExisting } = await checkExistingPreventiveLogs(formData);
      if (hasExisting) {
        setReplaceConfirm({ formData, section });
        return;
      }
      await bulkSetLastPreventiveDate(formData);
      setSavedFeedback({ section, action: "last" });
      router.refresh();
    } finally {
      setPendingBulkAction(null);
    }
  }

  async function handleReplaceConfirm() {
    const payload = replaceConfirm;
    if (!payload) return;
    const { formData, section } = payload;
    formData.set("replace_existing", "1");
    setReplaceConfirm(null);
    setPendingBulkAction({ section, action: "last" });
    try {
      await bulkSetLastPreventiveDate(formData);
      setSavedFeedback({ section, action: "last" });
      router.refresh();
    } finally {
      setPendingBulkAction(null);
    }
  }

  function handleBulkSetNextDueForSection(section: "obatCacing" | "obatKutu" | "vaksin") {
    const ids = getSelectedForSection(section);
    if (ids.size === 0) return;
    setPendingBulkAction({ section, action: "next" });
    const { type } = PREVENTIVE_SECTION_MAP[section];
    const formData = new FormData();
    formData.set("cat_ids", JSON.stringify(Array.from(ids)));
    formData.set("type", type);
    formData.set("next_due_date", bulkNextDueDate);
    if (section === "obatCacing" && bulkDewormTitle.trim()) formData.set("title", bulkDewormTitle.trim());
    if (section === "obatKutu" && bulkFleaTitle.trim()) formData.set("title", bulkFleaTitle.trim());
    if (section === "vaksin" && bulkVaccineTitle.trim()) formData.set("title", bulkVaccineTitle.trim());
    startTransition(async () => {
      try {
        await bulkSetNextDueDate(formData);
        setSavedFeedback({ section, action: "next" });
        router.refresh();
      } finally {
        setPendingBulkAction(null);
      }
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

  const tabs: { key: SectionKey; label: string }[] = [
    { key: "berat", label: "Berat badan" },
    { key: "obatCacing", label: "Obat cacing" },
    { key: "obatKutu", label: "Obat kutu" },
    { key: "vaksin", label: "Vaksin" },
    { key: "dirawat", label: "Dirawat" },
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
      case "dirawat":
        setSelectedIdsDirawat(new Set());
        break;
    }
    setActiveTab(key);
    // Sinkronkan tab ke URL agar saat pencarian (Enter) tab tetap sama
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.replace(`/health?${params.toString()}`, { scroll: false });
  }

  const scaleOptions = [1, 0.9, 0.8, 0.75] as const;

  return (
    <div className="w-full min-w-0 space-y-4">
      <ConfirmDialog
        open={replaceConfirm !== null}
        onOpenChange={(open) => { if (!open) setReplaceConfirm(null); }}
        title={replaceConfirm ? `Simpan log ${PREVENTIVE_SECTION_MAP[replaceConfirm.section].label}` : "Konfirmasi"}
        description={
          replaceConfirm
            ? `Simpan ${PREVENTIVE_SECTION_MAP[replaceConfirm.section].label.toLowerCase()} untuk tanggal ${bulkSetDate}? Jika kucing sudah punya log di tanggal ini, data akan diganti.`
            : ""
        }
        confirmLabel="Ya, simpan"
        cancelLabel="Batal"
        onConfirm={handleReplaceConfirm}
      />
      <ConfirmDialog
        open={sembuhConfirmIds !== null}
        onOpenChange={(open) => { if (!open) setSembuhConfirmIds(null); }}
        title="Tandai sebagai sembuh"
        description={
          sembuhConfirmIds?.length
            ? `${sembuhConfirmIds.length} kucing akan dihapus dari daftar Dirawat. Status diubah ke Membaik dan log perawatan dinonaktifkan.`
            : ""
        }
        confirmLabel="Ya, tandai sembuh"
        cancelLabel="Batal"
        onConfirm={async () => {
          if (!sembuhConfirmIds?.length) return;
          const fd = new FormData();
          fd.set("cat_ids", JSON.stringify(sembuhConfirmIds));
          await markCatsSembuh(fd);
          router.refresh();
          setSelectedIdsDirawat(new Set());
          setSembuhConfirmIds(null);
        }}
      />
      {/* Tab + kontrol tampilan */}
      <div className="flex flex-wrap items-center gap-3">
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Tampilan:</span>
          <select
            value={viewScale}
            onChange={(e) => setViewScale(Number(e.target.value) as typeof scaleOptions[number])}
            className="h-8 rounded-lg border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Perkecil tampilan"
          >
            {scaleOptions.map((s) => (
              <option key={s} value={s}>{Math.round(s * 100)}%</option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full overflow-hidden" style={{ maxWidth: "100%" }}>
        <div
          style={{
            display: "inline-block",
            width: `${100 / viewScale}%`,
            minWidth: "100%",
            transform: `scale(${viewScale})`,
            transformOrigin: "top left",
          }}
        >
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
          <div className="space-y-1 border-t border-border pt-3">
            <label className="text-xs font-medium text-muted-foreground">Jenis obat cacing (opsional)</label>
            <Input
              type="text"
              placeholder="Contoh: Drontal, Combantrin, …"
              value={bulkDewormTitle}
              onChange={(e) => setBulkDewormTitle(e.target.value)}
              className="h-9 max-w-xs"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <form onSubmit={(e) => { e.preventDefault(); handleBulkSetLastForSection("obatCacing"); }} className="flex min-h-[7.5rem] flex-col gap-3 rounded-md border border-border bg-[hsl(var(--status-bg-due-soon))] p-3">
            <p className="text-xs font-medium text-[hsl(var(--status-due-soon))]">Set Last</p>
            <p className="text-[11px] text-muted-foreground">Tanggal pemberian terakhir</p>
            {savedFeedback?.section === "obatCacing" && savedFeedback?.action === "last" && (
              <p className="text-xs font-medium text-[hsl(var(--status-ok))]">Sudah tersimpan</p>
            )}
            <div className="flex flex-1 flex-wrap items-end gap-2">
              <Input type="date" value={bulkSetDate} onChange={(e) => setBulkSetDate(e.target.value)} required className="h-9 w-[10.5rem]" />
              <Button type="submit" size="sm" disabled={pendingBulkAction !== null}>{pendingBulkAction?.section === "obatCacing" && pendingBulkAction?.action === "last" ? "Menyimpan…" : "Simpan Last"}</Button>
            </div>
            </form>
            <form onSubmit={(e) => { e.preventDefault(); handleBulkSetNextDueForSection("obatCacing"); }} className="flex min-h-[7.5rem] flex-col gap-3 rounded-md border border-border bg-[hsl(var(--status-bg-ok))] p-3">
            <p className="text-xs font-medium text-[hsl(var(--status-ok))]">Set Next due</p>
            <p className="text-[11px] text-muted-foreground">Jadwal pemberian berikutnya</p>
            {savedFeedback?.section === "obatCacing" && savedFeedback?.action === "next" && (
              <p className="text-xs font-medium text-[hsl(var(--status-ok))]">Sudah tersimpan</p>
            )}
            <div className="flex flex-1 flex-wrap items-end gap-2">
              <Input type="date" value={bulkNextDueDate} onChange={(e) => setBulkNextDueDate(e.target.value)} required className="h-9 w-[10.5rem]" />
              <Button type="submit" size="sm" disabled={pendingBulkAction !== null}>{pendingBulkAction?.section === "obatCacing" && pendingBulkAction?.action === "next" ? "Menyimpan…" : "Simpan Next due"}</Button>
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
          <div className="space-y-1 border-t border-border pt-3">
            <label className="text-xs font-medium text-muted-foreground">Jenis obat kutu (opsional)</label>
            <Input
              type="text"
              placeholder="Contoh: Frontline, Revolution, …"
              value={bulkFleaTitle}
              onChange={(e) => setBulkFleaTitle(e.target.value)}
              className="h-9 max-w-xs"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <form onSubmit={(e) => { e.preventDefault(); handleBulkSetLastForSection("obatKutu"); }} className="flex min-h-[7.5rem] flex-col gap-3 rounded-md border border-border bg-[hsl(var(--status-bg-due-soon))] p-3">
            <p className="text-xs font-medium text-[hsl(var(--status-due-soon))]">Set Last</p>
            <p className="text-[11px] text-muted-foreground">Tanggal pemberian terakhir</p>
            {savedFeedback?.section === "obatKutu" && savedFeedback?.action === "last" && (
              <p className="text-xs font-medium text-[hsl(var(--status-ok))]">Sudah tersimpan</p>
            )}
            <div className="flex flex-1 flex-wrap items-end gap-2">
              <Input type="date" value={bulkSetDate} onChange={(e) => setBulkSetDate(e.target.value)} required className="h-9 w-[10.5rem]" />
              <Button type="submit" size="sm" disabled={pendingBulkAction !== null}>{pendingBulkAction?.section === "obatKutu" && pendingBulkAction?.action === "last" ? "Menyimpan…" : "Simpan Last"}</Button>
            </div>
            </form>
            <form onSubmit={(e) => { e.preventDefault(); handleBulkSetNextDueForSection("obatKutu"); }} className="flex min-h-[7.5rem] flex-col gap-3 rounded-md border border-border bg-[hsl(var(--status-bg-ok))] p-3">
            <p className="text-xs font-medium text-[hsl(var(--status-ok))]">Set Next due</p>
            <p className="text-[11px] text-muted-foreground">Jadwal pemberian berikutnya</p>
            {savedFeedback?.section === "obatKutu" && savedFeedback?.action === "next" && (
              <p className="text-xs font-medium text-[hsl(var(--status-ok))]">Sudah tersimpan</p>
            )}
            <div className="flex flex-1 flex-wrap items-end gap-2">
              <Input type="date" value={bulkNextDueDate} onChange={(e) => setBulkNextDueDate(e.target.value)} required className="h-9 w-[10.5rem]" />
              <Button type="submit" size="sm" disabled={pendingBulkAction !== null}>{pendingBulkAction?.section === "obatKutu" && pendingBulkAction?.action === "next" ? "Menyimpan…" : "Simpan Next due"}</Button>
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
          <div className="space-y-1 border-t border-border pt-3">
            <label className="text-xs font-medium text-muted-foreground">Jenis vaksin (opsional)</label>
            <Input
              type="text"
              placeholder="Contoh: F3, F4, Rabies, …"
              value={bulkVaccineTitle}
              onChange={(e) => setBulkVaccineTitle(e.target.value)}
              className="h-9 max-w-xs"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <form onSubmit={(e) => { e.preventDefault(); handleBulkSetLastForSection("vaksin"); }} className="flex min-h-[7.5rem] flex-col gap-3 rounded-md border border-border bg-[hsl(var(--status-bg-due-soon))] p-3">
            <p className="text-xs font-medium text-[hsl(var(--status-due-soon))]">Set Last</p>
            <p className="text-[11px] text-muted-foreground">Tanggal pemberian terakhir</p>
            {savedFeedback?.section === "vaksin" && savedFeedback?.action === "last" && (
              <p className="text-xs font-medium text-[hsl(var(--status-ok))]">Sudah tersimpan</p>
            )}
            <div className="flex flex-1 flex-wrap items-end gap-2">
              <Input type="date" value={bulkSetDate} onChange={(e) => setBulkSetDate(e.target.value)} required className="h-9 w-[10.5rem]" />
              <Button type="submit" size="sm" disabled={pendingBulkAction !== null}>{pendingBulkAction?.section === "vaksin" && pendingBulkAction?.action === "last" ? "Menyimpan…" : "Simpan Last"}</Button>
            </div>
            </form>
            <form onSubmit={(e) => { e.preventDefault(); handleBulkSetNextDueForSection("vaksin"); }} className="flex min-h-[7.5rem] flex-col gap-3 rounded-md border border-border bg-[hsl(var(--status-bg-ok))] p-3">
            <p className="text-xs font-medium text-[hsl(var(--status-ok))]">Set Next due</p>
            <p className="text-[11px] text-muted-foreground">Jadwal pemberian berikutnya</p>
            {savedFeedback?.section === "vaksin" && savedFeedback?.action === "next" && (
              <p className="text-xs font-medium text-[hsl(var(--status-ok))]">Sudah tersimpan</p>
            )}
            <div className="flex flex-1 flex-wrap items-end gap-2">
              <Input type="date" value={bulkNextDueDate} onChange={(e) => setBulkNextDueDate(e.target.value)} required className="h-9 w-[10.5rem]" />
              <Button type="submit" size="sm" disabled={pendingBulkAction !== null}>{pendingBulkAction?.section === "vaksin" && pendingBulkAction?.action === "next" ? "Menyimpan…" : "Simpan Next due"}</Button>
            </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "berat" && (
      <section className="w-full min-w-0">
        <h2 className="mb-3">
          <span className="inline-flex rounded-full border border-slate-200/80 bg-slate-100/80 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-slate-700 shadow-sm">
            Berat badan
          </span>
        </h2>
        <div className="w-full max-w-full overflow-auto max-h-[75vh]" style={{ WebkitOverflowScrolling: "touch" }}>
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
                      <div className="flex flex-col gap-1 items-center">
                        <span
                          className={
                            trendLabel === "Naik"
                              ? CAPSULE.ok
                              : trendLabel === "Turun"
                                ? CAPSULE.warning
                                : trendLabel === "Sama"
                                  ? CAPSULE.neutral
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
                    <td className="px-5 py-3 align-middle text-right text-[11px] tabular-nums">
                      {row.suggestion.lastWeight && row.lastWeightLogId ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-medium text-foreground">{Number(row.suggestion.lastWeight.weightKg).toFixed(2)} kg</span>
                          <span className={CAPSULE.date}>
                            {formatDateShort(new Date(row.suggestion.lastWeight.date))}
                          </span>
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
                    <td className="px-5 py-3 align-middle text-right text-[11px] tabular-nums">
                      {row.previousWeight ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-medium text-foreground">{Number(row.previousWeight.weightKg).toFixed(2)} kg</span>
                          <span className={CAPSULE.date}>{formatDateShort(new Date(row.previousWeight.date))}</span>
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
        </div>
      </section>
      )}

      {activeTab === "obatCacing" && (
      <section className="w-full min-w-0">
        <h2 className="mb-3">
          <span className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50/90 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-800 shadow-sm">
            Obat cacing
          </span>
        </h2>
        <div className="w-full max-w-full overflow-auto max-h-[75vh]" style={{ WebkitOverflowScrolling: "touch" }}>
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
                      <div className="flex flex-col gap-1">
                        <span className={status === "Terlambat" ? CAPSULE.overdue : status === "Aman" ? CAPSULE.ok : CAPSULE.neutral}>
                          {status}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{keterangan}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <span className={CAPSULE.neutral}>
                        {row.lastDewormLog?.title?.trim() || "—"}
                      </span>
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
        </div>
      </section>
      )}

      {activeTab === "obatKutu" && (
      <section className="w-full min-w-0">
        <h2 className="mb-3">
          <span className="inline-flex rounded-full border border-sky-200/80 bg-sky-50/90 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-sky-800 shadow-sm">
            Obat kutu
          </span>
        </h2>
        <div className="w-full max-w-full overflow-auto max-h-[75vh]" style={{ WebkitOverflowScrolling: "touch" }}>
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
                      <div className="flex flex-col gap-1">
                        <span className={status === "Terlambat" ? CAPSULE.overdue : status === "Aman" ? CAPSULE.ok : CAPSULE.neutral}>
                          {status}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{keterangan}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <span className={CAPSULE.neutral}>
                        {row.lastFleaLog?.title?.trim() || "—"}
                      </span>
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
        </div>
      </section>
      )}

      {activeTab === "vaksin" && (
      <section className="w-full min-w-0">
        <h2 className="mb-3">
          <span className="inline-flex rounded-full border border-violet-200/80 bg-violet-50/90 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-violet-800 shadow-sm">
            Vaksin
          </span>
        </h2>
        <div className="w-full max-w-full overflow-auto max-h-[75vh]" style={{ WebkitOverflowScrolling: "touch" }}>
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
                      <div className="flex flex-col gap-1">
                        <span className={status === "Terlambat" ? CAPSULE.overdue : status === "Aman" ? CAPSULE.ok : CAPSULE.neutral}>
                          {status}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{keterangan}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 align-middle">
                      {(() => {
                        const { label, capsuleClass } = getVaccineTypeCapsule(row.lastVaccineLog?.title);
                        return <span className={capsuleClass}>{label}</span>;
                      })()}
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
        </div>
      </section>
      )}

      {activeTab === "dirawat" && (() => {
        const dirawatRows = rows.filter(
          (row) =>
            row.suggestion.reasons.some((r) => r.includes("Sedang dalam perawatan aktif")) ||
            row.cat.status === "sakit" ||
            row.cat.status === "memburuk",
        );
        const dirawatIds = dirawatRows.map((r) => r.cat.id);
        const allDirawatSelected =
          dirawatIds.length > 0 && dirawatIds.every((id) => selectedIdsDirawat.has(id));
        const statusLabel = (s: string | null) => (s ? CAT_STATUS_LABELS[s as keyof typeof CAT_STATUS_LABELS] ?? s : "");
        const colSpan = admin ? 7 : 6;
        return (
          <section className="w-full min-w-0 space-y-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="sr-only">Dirawat</h2>
              <span className="inline-flex rounded-full border border-amber-200/80 bg-amber-50/90 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-amber-800 shadow-sm">
                Dirawat
              </span>
              {admin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAddToDirawatSelected(new Set());
                    setAddToDirawatOpen(true);
                  }}
                >
                  Tambah kucing
                </Button>
              )}
            </div>
            {admin && selectedIdsDirawat.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIdsDirawat.size} kucing dipilih
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIdsDirawat(new Set())}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => setSembuhConfirmIds(Array.from(selectedIdsDirawat))}
                >
                  Sembuh
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedIdsDirawat.size === 1) {
                      setEditingDirawatCatId(Array.from(selectedIdsDirawat)[0]!);
                    } else {
                      setBulkEditDirawatOpen(true);
                    }
                  }}
                >
                  Edit
                </Button>
              </div>
            )}
            <div className="w-full max-w-full overflow-auto max-h-[75vh]" style={{ WebkitOverflowScrolling: "touch" }}>
              <table className="min-w-[700px] w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {admin && (
                      <th className="w-10 px-2 py-3 text-left">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={allDirawatSelected}
                            onChange={() =>
                              setSelectedIdsDirawat(allDirawatSelected ? new Set() : new Set(dirawatIds))
                            }
                            className="h-4 w-4 rounded border-input"
                          />
                          <span className="sr-only">Pilih semua (dirawat)</span>
                        </label>
                      </th>
                    )}
                    <th className="px-5 py-3 text-left">Cat</th>
                    <th className="min-w-[10rem] px-5 py-3 text-left">Kondisi</th>
                    <th className="min-w-[6rem] px-5 py-3 text-left">Lokasi</th>
                    <th className="min-w-[6rem] px-5 py-3 text-left">Menular</th>
                    <th className="min-w-[10rem] px-5 py-3 text-left">Keterangan</th>
                    <th className="w-20 px-5 py-3 text-right">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {dirawatRows.length === 0 ? (
                    <tr>
                      <td colSpan={colSpan} className="px-5 py-8 text-center text-muted-foreground">
                        Tidak ada kucing yang sedang dalam perawatan.
                      </td>
                    </tr>
                  ) : (
                    dirawatRows.map((row) => {
                      const kondisi =
                        row.suggestion.reasons.length > 0
                          ? row.suggestion.reasons.join(" · ")
                          : statusLabel(row.cat.status) || "—";
                      const st = row.cat.status;
                      const statusCapsuleClass: Record<string, string> = {
                        sehat: "bg-emerald-100 text-emerald-800 border border-emerald-200/80",
                        membaik: "bg-green-100 text-green-800 border border-green-200/80",
                        hampir_sembuh: "bg-teal-100 text-teal-800 border border-teal-200/80",
                        observasi: "bg-slate-100 text-slate-700 border border-slate-200/80",
                        memburuk: "bg-amber-100 text-amber-800 border border-amber-200/80",
                        sakit: "bg-rose-100 text-rose-800 border border-rose-200/80",
                      };
                      const kondisiEl =
                        st && statusCapsuleClass[st] ? (
                          <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusCapsuleClass[st])}>
                            {statusLabel(st)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{kondisi}</span>
                        );
                      const lokasiEl =
                        row.cat.location === "rumah" ? (
                          <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200/80">
                            Rumah
                          </span>
                        ) : row.cat.location === "toko" ? (
                          <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200/80">
                            Toko
                          </span>
                        ) : row.cat.location === "klinik" ? (
                          <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-violet-100 text-violet-800 border border-violet-200/80">
                            Klinik
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200/80">
                            —
                          </span>
                        );
                      const manualNotes = row.cat.treatment_notes?.trim() || null;
                      const systemReasons =
                        row.suggestion.reasons.length > 0 ? row.suggestion.reasons.join(" · ") : "";
                      const keterangan =
                        [manualNotes, systemReasons].filter(Boolean).join(" · ") || "—";
                      return (
                        <tr key={row.cat.id} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                          {admin && (
                            <td className="px-2 py-3 align-middle">
                              <label className="flex cursor-pointer items-center">
                                <input
                                  type="checkbox"
                                  checked={selectedIdsDirawat.has(row.cat.id)}
                                  onChange={() => toggleOne("dirawat", row.cat.id)}
                                  className="h-4 w-4 rounded border-input"
                                />
                              </label>
                            </td>
                          )}
                          <td className="px-5 py-3 align-middle">
                            <CatCell cat={row.cat} />
                          </td>
                          <td className="px-5 py-3 align-middle text-xs">
                            {kondisiEl}
                          </td>
                          <td className="px-5 py-3 align-middle text-xs">
                            {lokasiEl}
                          </td>
                          <td className="px-5 py-3 align-middle text-xs">
                            {row.cat.is_contagious === true ? (
                              <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200/80">
                                Menular
                              </span>
                            ) : row.cat.is_contagious === false ? (
                              <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200/80">
                                Tidak menular
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200/80">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 align-middle text-xs">
                            {keterangan !== "—" ? (
                              <span className="inline-flex max-w-[12rem] rounded-lg border border-slate-200/60 bg-slate-50/80 px-2.5 py-1 text-slate-600">
                                {keterangan}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3 align-middle text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingDirawatCatId(row.cat.id)}
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <EditCatDirawatDialog
              open={editingDirawatCatId !== null}
              onOpenChange={(open) => !open && setEditingDirawatCatId(null)}
              cat={rows.find((r) => r.cat.id === editingDirawatCatId)?.cat ?? null}
              breeds={breeds}
              onSuccess={() => {
                router.refresh();
                setEditingDirawatCatId(null);
              }}
            />
            <BulkEditDirawatDialog
              open={bulkEditDirawatOpen}
              onOpenChange={setBulkEditDirawatOpen}
              catIds={Array.from(selectedIdsDirawat)}
              breeds={breeds.map((b) => ({ id: b.id, name: b.name }))}
              onSuccess={() => {
                router.refresh();
                setBulkEditDirawatOpen(false);
                setSelectedIdsDirawat(new Set());
              }}
            />
            <Dialog open={addToDirawatOpen} onOpenChange={(open) => { setAddToDirawatOpen(open); if (!open) { setAddToDirawatSelected(new Set()); setAddToDirawatKeterangan(""); } }}>
              <DialogContent className="max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Tambah kucing ke Dirawat</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Pilih kucing yang akan ditambahkan ke daftar Dirawat (log &quot;Dalam perawatan&quot; akan dibuat dan muncul di riwayat kesehatan profil).
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Keterangan (opsional)</label>
                  <Input
                    type="text"
                    placeholder="Mis. jenis penyakit, yang merawat, lokasi..."
                    value={addToDirawatKeterangan}
                    onChange={(e) => setAddToDirawatKeterangan(e.target.value)}
                    className="text-sm"
                  />
                </div>
                {(() => {
                  const notInDirawat = rows.filter((r) => !dirawatIds.includes(r.cat.id));
                  if (notInDirawat.length === 0) {
                    return <p className="text-sm text-muted-foreground py-4">Semua kucing sudah ada di daftar Dirawat.</p>;
                  }
                  return (
                    <div className="flex flex-col gap-2 min-h-0 overflow-auto py-2">
                      {notInDirawat.map((row) => (
                        <label key={row.cat.id} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 hover:bg-muted/30 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addToDirawatSelected.has(row.cat.id)}
                            onChange={() => {
                              setAddToDirawatSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(row.cat.id)) next.delete(row.cat.id);
                                else next.add(row.cat.id);
                                return next;
                              });
                            }}
                            className="h-4 w-4 rounded border-input"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">{row.cat.name}</span>
                            <span className="text-xs text-muted-foreground ml-1">
                              {[breedsById.get(row.cat.breed_id ?? "")?.name ?? "—", formatAge(row.cat.dob)].filter(Boolean).join(" | ")}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  );
                })()}
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setAddToDirawatOpen(false); setAddToDirawatSelected(new Set()); }}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={addToDirawatSelected.size === 0}
                    onClick={async () => {
                      if (addToDirawatSelected.size === 0) return;
                      const fd = new FormData();
                      fd.set("cat_ids", JSON.stringify(Array.from(addToDirawatSelected)));
                      if (addToDirawatKeterangan.trim()) fd.set("keterangan", addToDirawatKeterangan.trim());
                      await addCatsToDirawat(fd);
                      router.refresh();
                      setAddToDirawatOpen(false);
                      setAddToDirawatSelected(new Set());
                      setAddToDirawatKeterangan("");
                    }}
                  >
                    Tambah ({addToDirawatSelected.size})
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </section>
        );
      })()}
        </div>
      </div>
    </div>
  );
}
