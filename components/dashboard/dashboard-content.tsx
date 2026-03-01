"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Cat,
  AlertTriangle,
  Package,
  Heart,
  AlertCircle,
  Info,
  Bell,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DUE_SOON_DAYS, NOTIFICATION_WINDOW_DAYS } from "@/lib/constants";
import type {
  DashboardData,
  DashboardCatRecord,
  DashboardLowStockItem,
  CatWithStatus,
  SuggestedStatus,
  CatStatus,
  CatLocation,
} from "@/app/(app)/dashboard/types";

const STATUS_LABEL: Record<NonNullable<CatStatus>, string> = {
  sehat: "Sehat",
  membaik: "Membaik",
  memburuk: "Memburuk",
  hampir_sembuh: "Hampir Sembuh",
  observasi: "Observasi",
  sakit: "Sakit",
};

const LOCATION_LABEL: Record<NonNullable<CatLocation>, string> = {
  rumah: "rumah",
  toko: "toko",
  klinik: "klinik",
};

type PreventiveType = "VACCINE" | "FLEA" | "DEWORM";
type LocationValue = "klinik" | "rumah" | "toko";

/** Parses natural language query for smart dashboard search. Keyword tunggal pun langsung dipakai. */
function parseSmartSearch(query: string): {
  mode:
    | "preventive"
    | "name"
    | "grooming"
    | "weight_drop"
    | "weight_gain"
    | "sick"
    | "location"
    | "stock_empty"
    | "stock_low"
    | "healthy";
  preventiveType?: PreventiveType;
  keyword?: string;
  nameTerms?: string[];
  locationValue?: LocationValue;
} {
  const q = query.trim().toLowerCase();
  if (!q) return { mode: "name", nameTerms: [] };

  // ---- Stok ----
  if (q.includes("habis") || q.includes("kosong")) {
    if (q.includes("stok") || q.includes("barang") || q.length <= 12) return { mode: "stock_empty" };
  }
  if (
    (q.includes("stok") || q.includes("barang")) &&
    (q.includes("habis") || q.includes("kosong"))
  ) {
    return { mode: "stock_empty" };
  }
  const needBuy =
    q.includes("perlu dibeli") ||
    q.includes("perlu di beli") ||
    (q.includes("perlu") && (q.includes("di beli") || q.includes("dibeli") || q.includes("beli")));
  const stockLow =
    q.includes("stok rendah") ||
    q.includes("restock") ||
    q.includes("reorder") ||
    q.includes("belanja") ||
    q.includes("pengadaan") ||
    (q.includes("inventory") && (q.includes("rendah") || q.includes("perlu") || q.includes("beli")));
  const stokPerlu =
    (q.includes("stok") || q.includes("apa")) &&
    (q.includes("perlu") || q.includes("dibeli") || q.includes("di beli") || q.includes("rendah"));
  if (needBuy || stockLow || stokPerlu) return { mode: "stock_low" };
  if (q === "rendah" || q === "habis" || q === "beli" || q === "dibeli") {
    if (q === "habis") return { mode: "stock_empty" };
    if (q === "rendah" || q === "beli" || q === "dibeli") return { mode: "stock_low" };
  }

  // ---- Lokasi ----
  if (q.includes("klinik")) return { mode: "location", locationValue: "klinik" };
  if (q.includes("toko")) return { mode: "location", locationValue: "toko" };
  if (q.includes("rumah")) return { mode: "location", locationValue: "rumah" };

  // ---- Dirawat / Sakit: tab Dirawat (sakit, kurang baik, atau dalam perawatan aktif) ----
  const dirawatKeywords =
    q.includes("dirawat") ||
    q.includes("dalam perawatan") ||
    q.includes("sedang dirawat") ||
    q.includes("perawatan medis") ||
    q.includes("perawatan aktif") ||
    (q.includes("perawatan") && !q.includes("grooming")) ||
    q.includes("sakit") ||
    q.includes("kurang baik") ||
    q === "rawat";
  if (dirawatKeywords) return { mode: "sick" };

  // ---- Grooming: belum mandi/grooming ----
  if (q.includes("grooming") || q.includes("groom") || q.includes("mandi") || q.includes("belum mandi")) return { mode: "grooming" };

  // ---- Berat: turun / naik ----
  if (q.includes("berat naik") || q === "naik") return { mode: "weight_gain" };
  if (q.includes("turun") || q.includes("berat turun")) return { mode: "weight_drop" };

  // ---- Preventif: vaksin / cacing / kutu (belum, perlu, terlambat, dll) ----
  const isVaccineQuery =
    q.includes("vaksin") ||
    q.includes("vaccine") ||
    q.includes("belum vaksin") ||
    q.includes("perlu vaksin") ||
    q.includes("terlambat vaksin") ||
    q.includes("belum rabies") ||
    q.includes("perlu rabies") ||
    q.includes("belum pernah") ||
    q.includes("belum f4") ||
    q.includes("belum f3") ||
    q.includes("belum dapat") ||
    q.includes("yang belum f4") ||
    q.includes("yang belum f3") ||
    q.includes("yang belum rabies") ||
    q.includes("tidak pernah vaksin") ||
    q.includes("tidak punya f4") ||
    q.includes("tidak punya f3") ||
    q.includes("tidak punya rabies") ||
    q.includes("perlu f4") ||
    q.includes("perlu f3") ||
    q.includes("terlambat f4") ||
    q.includes("terlambat f3") ||
    q === "f4" ||
    q === "f3" ||
    q === "rabies" ||
    (q.includes("f4") && (q.includes("belum") || q.includes("perlu") || q.includes("terlambat") || q.includes("pernah") || q.includes("dapat"))) ||
    (q.includes("f3") && (q.includes("belum") || q.includes("perlu") || q.includes("terlambat") || q.includes("pernah") || q.includes("dapat"))) ||
    (q.includes("rabies") && (q.includes("belum") || q.includes("perlu") || q.includes("terlambat") || q.includes("pernah") || q.includes("dapat")));
  if (isVaccineQuery) {
    // Keyword dipakai untuk cocokkan lastTitle (F4, F3, RABIES di DB) — tampilkan kucing yang TIDAK punya vaksin tersebut
    let keyword: string | undefined;
    if (q.includes("f4")) keyword = "f4";
    else if (q.includes("f3") || q.includes("triple")) keyword = "f3";
    else if (q.includes("rabies")) keyword = "rabies";
    return { mode: "preventive", preventiveType: "VACCINE", keyword };
  }
  if (
    q.includes("kutu") ||
    q.includes("flea") ||
    q.includes("obat kutu") ||
    q.includes("belum kutu") ||
    q.includes("perlu obat kutu")
  ) {
    return { mode: "preventive", preventiveType: "FLEA" };
  }
  if (
    q.includes("cacing") ||
    q.includes("deworm") ||
    q.includes("obat cacing") ||
    q.includes("belum cacing") ||
    q.includes("perlu obat cacing")
  ) {
    return { mode: "preventive", preventiveType: "DEWORM" };
  }

  // ---- Sehat: status baik ----
  if (q === "sehat" || q === "baik") return { mode: "healthy" };

  const nameTerms = q.split("&").map((t) => t.trim()).filter(Boolean);
  return { mode: "name", nameTerms };
}

function filterCatsBySmartSearch(cats: DashboardCatRecord[], query: string): DashboardCatRecord[] {
  const parsed = parseSmartSearch(query);
  if (parsed.mode === "name") {
    if (!parsed.nameTerms?.length) return cats;
    return cats.filter((c) =>
      parsed.nameTerms!.some(
        (term) =>
          (c.name?.toLowerCase().includes(term) ?? false) ||
          (c.badge?.toLowerCase().includes(term) ?? false) ||
          (c.breedName?.toLowerCase().includes(term) ?? false),
      ),
    );
  }
  if (parsed.mode === "preventive" && parsed.preventiveType) {
    const type = parsed.preventiveType;
    const keyword = parsed.keyword?.toLowerCase();
    return cats.filter((c) => {
      const p = c.preventive.find((x) => x.type === type);
      if (!p) return true;
      if (keyword) {
        const hasMatch = p.lastTitle?.toLowerCase().includes(keyword) ?? false;
        return !hasMatch;
      }
      return p.nextDueDate == null;
    });
  }
  if (parsed.mode === "grooming") {
    return cats.filter((c) => c.lastGroomingDate == null);
  }
  if (parsed.mode === "weight_drop") {
    return cats.filter(
      (c) =>
        c.weight.previousKg != null &&
        c.weight.previousKg > 0 &&
        c.weight.currentKg < c.weight.previousKg,
    );
  }
  if (parsed.mode === "weight_gain") {
    return cats.filter(
      (c) =>
        c.weight.previousKg != null &&
        c.weight.previousKg > 0 &&
        c.weight.currentKg > c.weight.previousKg,
    );
  }
  if (parsed.mode === "sick") {
    return cats.filter(
      (c) =>
        c.status === "sakit" ||
        c.status === "memburuk" ||
        c.hasActiveTreatment,
    );
  }
  if (parsed.mode === "healthy") {
    return cats.filter(
      (c) =>
        c.status === "sehat" ||
        c.status === "membaik" ||
        c.status === "hampir_sembuh" ||
        c.status === "observasi" ||
        c.status == null,
    );
  }
  if (parsed.mode === "location" && parsed.locationValue) {
    return cats.filter((c) => c.location === parsed.locationValue);
  }
  return cats;
}

function filterStockBySmartSearch(
  items: { id: string; name: string; stockQty: number; minStockQty: number; unit: string }[],
  query: string,
): { id: string; name: string; stockQty: number; minStockQty: number; unit: string }[] {
  const parsed = parseSmartSearch(query);
  if (parsed.mode === "stock_empty") {
    return items.filter((i) => i.stockQty === 0);
  }
  if (parsed.mode === "stock_low") {
    return items; // lowStockPanel sudah berisi item stok rendah
  }
  return [];
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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

function isOverdue(dateStr: string | null, today: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return startOfDay(d).getTime() < today.getTime();
}

function isDueWithin(dateStr: string | null, today: Date, days: number): boolean {
  if (!dateStr) return false;
  const target = startOfDay(new Date(dateStr)).getTime();
  const from = today.getTime();
  const to = from + days * 24 * 60 * 60 * 1000;
  return target >= from && target <= to;
}

function computeCatStatus(record: DashboardCatRecord): {
  bucket: SuggestedStatus;
  reasons: string[];
} {
  const today = startOfDay(new Date());
  const reasons: string[] = [];

  const vaccine = record.preventive.find((p) => p.type === "VACCINE")?.nextDueDate ?? null;
  const flea = record.preventive.find((p) => p.type === "FLEA")?.nextDueDate ?? null;
  const deworm = record.preventive.find((p) => p.type === "DEWORM")?.nextDueDate ?? null;

  const anyOverdue =
    isOverdue(vaccine, today) || isOverdue(flea, today) || isOverdue(deworm, today);
  const anyDueSoon =
    isDueWithin(vaccine, today, DUE_SOON_DAYS) ||
    isDueWithin(flea, today, DUE_SOON_DAYS) ||
    isDueWithin(deworm, today, DUE_SOON_DAYS);

  const overdueItems: string[] = [];
  if (isOverdue(vaccine, today)) overdueItems.push("Vaksin");
  if (isOverdue(flea, today)) overdueItems.push("Flea");
  if (isOverdue(deworm, today)) overdueItems.push("Deworm");
  if (overdueItems.length > 0) {
    reasons.push(`${overdueItems.join(", ")} terlambat`);
  }

  const dueSoonItems: string[] = [];
  if (anyDueSoon && !isOverdue(vaccine, today) && isDueWithin(vaccine, today, DUE_SOON_DAYS))
    dueSoonItems.push("Vaksin");
  if (anyDueSoon && !isOverdue(flea, today) && isDueWithin(flea, today, DUE_SOON_DAYS))
    dueSoonItems.push("Flea");
  if (anyDueSoon && !isOverdue(deworm, today) && isDueWithin(deworm, today, DUE_SOON_DAYS))
    dueSoonItems.push("Deworm");
  if (dueSoonItems.length > 0) {
    reasons.push(`${dueSoonItems.join(", ")} jatuh tempo dalam ${DUE_SOON_DAYS} hari`);
  }

  if (record.hasActiveTreatment) {
    reasons.push("Sedang dalam perawatan aktif");
  }

  const prev = record.weight.previousKg;
  const curr = record.weight.currentKg;
  if (prev != null && prev > 0 && curr < prev * 0.9) {
    reasons.push("Berat badan turun >10% dari log sebelumnya");
  }

  let bucket: SuggestedStatus = "Healthy";
  if (anyOverdue || record.hasActiveTreatment || (prev != null && prev > 0 && curr < prev * 0.9)) {
    bucket = "Needs Attention";
  } else if (anyDueSoon) {
    bucket = "Monitor";
  }

  return { bucket, reasons };
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const PREVENTIVE_LABEL: Record<PreventiveType, string> = {
  VACCINE: "Vaksin",
  FLEA: "Flea",
  DEWORM: "Deworm",
};

/** Label untuk notifikasi & prioritas: "Next Vaksin", "Next Obat Kutu", "Next Obat Cacing" */
const PREVENTIVE_NEED_LABEL: Record<PreventiveType, string> = {
  VACCINE: "Next Vaksin",
  FLEA: "Next Obat Kutu",
  DEWORM: "Next Obat Cacing",
};

// Priority alert for the Priority Alerts section
type AlertSeverity = "critical" | "warning" | "neutral";

interface PriorityAlertItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  date: string | null;
  href?: string;
  photoUrl: string | null; // foto kucing jika terkait kucing
}

// Notification for Recent Notifications section
interface NotificationItem {
  id: string;
  title: string;
  description: string;
  date: string;
  href?: string;
  photoUrl: string | null;
}

/** Kelas kapsul tanggal: mudah dibaca, tema mewah & soft */
const DATE_CAPSULE_BY_SEVERITY: Record<AlertSeverity, string> = {
  critical:
    "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium tracking-wide bg-rose-50/95 text-rose-700 border border-rose-200/70 shadow-sm",
  warning:
    "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium tracking-wide bg-amber-50/95 text-amber-800 border border-amber-200/70 shadow-sm",
  neutral:
    "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium tracking-wide bg-slate-100/90 text-slate-700 border border-slate-200/60",
};

/** Kapsul tanggal untuk notifikasi terbaru (soft & mewah) */
const DATE_CAPSULE_NOTIFICATION =
  "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium tracking-wide bg-slate-100/90 text-slate-700 border border-slate-200/60 shadow-sm";

function buildPriorityAlerts(
  cats: DashboardCatRecord[],
  lowStockPanel: DashboardData["lowStockPanel"],
  today: Date,
): PriorityAlertItem[] {
  const items: PriorityAlertItem[] = [];
  const seen = new Set<string>();

  for (const cat of cats) {
    for (const p of cat.preventive) {
      if (!p.nextDueDate || !isOverdue(p.nextDueDate, today)) continue;
      const key = `${cat.id}-${p.type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: key,
        severity: "critical",
        title: PREVENTIVE_NEED_LABEL[p.type as PreventiveType],
        description: cat.name,
        date: p.nextDueDate,
        href: `/cats/${cat.id}?returnTo=/dashboard`,
        photoUrl: cat.photoUrl ?? null,
      });
    }
    if (cat.hasActiveTreatment) {
      items.push({
        id: `care-${cat.id}`,
        severity: "warning",
        title: "Dalam perawatan",
        description: cat.name,
        date: null,
        href: "/health?tab=dirawat",
        photoUrl: cat.photoUrl ?? null,
      });
    }
  }

  for (const item of lowStockPanel) {
    items.push({
      id: `stock-${item.id}`,
      severity: "warning",
      title: "Stok rendah",
      description: item.name,
      date: null,
      href: "/inventory",
      photoUrl: null,
    });
  }

  return items;
}

function buildRecentNotifications(
  cats: DashboardCatRecord[],
  groomingPanel: DashboardData["groomingPanel"],
  today: Date,
): NotificationItem[] {
  const items: NotificationItem[] = [];
  const catsById = new Map(cats.map((c) => [c.id, c]));

  for (const cat of cats) {
    for (const p of cat.preventive) {
      if (!p.nextDueDate || isOverdue(p.nextDueDate, today)) continue;
      if (!isDueWithin(p.nextDueDate, today, NOTIFICATION_WINDOW_DAYS)) continue;
      items.push({
        id: `due-${cat.id}-${p.type}`,
        title: PREVENTIVE_NEED_LABEL[p.type as PreventiveType],
        description: cat.name,
        date: p.nextDueDate,
        href: `/cats/${cat.id}?returnTo=/dashboard`,
        photoUrl: cat.photoUrl ?? null,
      });
    }
  }

  for (const entry of groomingPanel.slice(0, 3)) {
    if (!entry.lastGroomingDate) continue;
    const cat = catsById.get(entry.catId);
    items.push({
      id: `groom-${entry.catId}`,
      title: "Grooming terakhir",
      description: entry.catName,
      date: entry.lastGroomingDate,
      href: `/cats/${entry.catId}?returnTo=/dashboard`,
      photoUrl: cat?.photoUrl ?? null,
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items;
}

interface DashboardContentProps {
  initialData: DashboardData;
}

export function DashboardContent({ initialData }: DashboardContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const parsedQuery = useMemo(() => parseSmartSearch(searchQuery), [searchQuery]);
  const filteredCats = useMemo(
    () => filterCatsBySmartSearch(initialData.cats, searchQuery),
    [initialData.cats, searchQuery],
  );
  const filteredStock = useMemo((): DashboardLowStockItem[] => {
    if (parsedQuery.mode !== "stock_empty" && parsedQuery.mode !== "stock_low") return [];
    return filterStockBySmartSearch(initialData.lowStockPanel, searchQuery);
  }, [initialData.lowStockPanel, searchQuery, parsedQuery.mode]);
  const isStockResult =
    parsedQuery.mode === "stock_empty" || parsedQuery.mode === "stock_low";
  const withStatus = useMemo<CatWithStatus[]>(
    () =>
      initialData.cats.map((cat) => ({
        cat,
        computed: computeCatStatus(cat),
      })),
    [initialData.cats],
  );

  const priorityAlertCount = useMemo(
    () => withStatus.filter((e) => e.computed.bucket === "Needs Attention").length,
    [withStatus],
  );

  const inActiveTreatment = useMemo(
    () => initialData.cats.filter((c) => c.hasActiveTreatment),
    [initialData.cats],
  );

  /** Kucing yang dianggap "dalam perawatan": punya perawatan aktif ATAU status memburuk/sakit */
  const medicalCareCats = useMemo(
    () =>
      initialData.cats.filter(
        (c) =>
          c.hasActiveTreatment ||
          c.status === "memburuk" ||
          c.status === "sakit",
      ),
    [initialData.cats],
  );

  const today = useMemo(() => startOfDay(new Date()), []);
  const priorityAlerts = useMemo(
    () => buildPriorityAlerts(initialData.cats, initialData.lowStockPanel, today),
    [initialData.cats, initialData.lowStockPanel, today],
  );
  const recentNotifications = useMemo(
    () => buildRecentNotifications(initialData.cats, initialData.groomingPanel, today),
    [initialData.cats, initialData.groomingPanel, today],
  );

  const totalCats = initialData.cats.length;
  /** Sakit = yang tampil di tab Dirawat (perawatan aktif / status memburuk atau sakit) */
  const sakitCount = medicalCareCats.length;
  const sehatCount = totalCats - sakitCount;

  return (
    <div className="flex flex-col gap-10">
      {/* ----------------------------------- HEADER ----------------------------------- */}
      <header className="space-y-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan prioritas dan status sistem
          </p>
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex items-center gap-2"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Coba: sakit, dirawat, klinik, grooming, vaksin rabies, berat turun, sehat, stok habis…"
            className="max-w-md"
            aria-label="Pencarian pintar"
          />
        </form>
        {searchQuery.trim() && (
          <div className="space-y-2">
            {isStockResult ? (
              <>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Hasil pencarian ({filteredStock.length} item stok)
                </h2>
                <div className="max-h-[20rem] overflow-y-auto rounded-xl border border-border/60 bg-muted/20">
                  {filteredStock.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-muted-foreground">
                      Tidak ada item stok yang cocok.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1.5 p-2">
                      {filteredStock.map((item) => (
                        <li key={item.id}>
                          <Link
                            href="/inventory"
                            className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-background/80 px-3 py-2.5 transition-colors hover:bg-muted/40"
                          >
                            <span className="font-medium text-foreground">{item.name}</span>
                            <span className="text-xs text-muted-foreground">
                              Stok: {item.stockQty} / {item.minStockQty} {item.unit}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Hasil pencarian ({filteredCats.length} kucing)
                  </h2>
                  {parsedQuery.mode === "sick" && (
                    <Link
                      href="/health?tab=dirawat"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      → Lihat di tab Dirawat
                    </Link>
                  )}
                  {parsedQuery.mode === "preventive" && parsedQuery.preventiveType && (
                    <Link
                      href={
                        parsedQuery.preventiveType === "VACCINE"
                          ? "/health?tab=vaksin"
                          : parsedQuery.preventiveType === "FLEA"
                            ? "/health?tab=obatKutu"
                            : "/health?tab=obatCacing"
                      }
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      → Lihat di Health
                    </Link>
                  )}
                  {parsedQuery.mode === "grooming" && (
                    <Link href="/cats" className="text-xs font-medium text-primary hover:underline">
                      → Lihat daftar kucing
                    </Link>
                  )}
                  {(parsedQuery.mode === "weight_drop" || parsedQuery.mode === "weight_gain") && (
                    <Link href="/health?tab=berat" className="text-xs font-medium text-primary hover:underline">
                      → Lihat di tab Berat badan
                    </Link>
                  )}
                  {parsedQuery.mode === "location" && (
                    <Link href="/health" className="text-xs font-medium text-primary hover:underline">
                      → Lihat di Health
                    </Link>
                  )}
                  {parsedQuery.mode === "healthy" && (
                    <Link href="/cats" className="text-xs font-medium text-primary hover:underline">
                      → Lihat daftar kucing
                    </Link>
                  )}
                </div>
                <div className="max-h-[20rem] overflow-y-auto rounded-xl border border-border/60 bg-muted/20">
                  {filteredCats.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-muted-foreground">
                      Tidak ada kucing yang cocok.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1.5 p-2">
                      {filteredCats.map((cat) => (
                        <li key={cat.id}>
                          <Link
                            href={`/cats/${cat.id}?returnTo=/dashboard`}
                            className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-background/80 px-3 py-2.5 transition-colors hover:bg-muted/40"
                          >
                            {cat.photoUrl ? (
                              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/80 bg-muted shadow-sm">
                                <img
                                  src={cat.photoUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  width={40}
                                  height={40}
                                />
                              </span>
                            ) : (
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/80 text-sm font-medium text-muted-foreground">
                                {cat.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{cat.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[cat.breedName, formatAge(cat.dob)].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* ----------------------------------- KARTU RINGKASAN (bisa diklik, dengan warna halus) ----------------------------------- */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/cats"
          className="rounded-xl border-l-4 border-l-slate-400/70 border border-border/60 bg-background shadow-sm p-6 transition-colors hover:bg-muted/30 hover:border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:ring-offset-2"
        >
          <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {totalCats}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sehat {sehatCount} · Sakit {sakitCount}
          </p>
          <div className="mt-3 flex items-center gap-2 text-muted-foreground">
            <Cat className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium">Total Kucing</span>
          </div>
        </Link>

        <Link
          href="/health"
          className="rounded-xl border-l-4 border-l-[hsl(var(--status-overdue))]/60 border border-border/60 bg-[hsl(var(--status-bg-overdue))]/50 shadow-sm p-6 transition-colors hover:opacity-95 hover:border-[hsl(var(--status-overdue)/0.3)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--status-overdue)/0.3)] focus:ring-offset-2"
        >
          <p className="text-3xl font-bold tabular-nums tracking-tight text-[hsl(var(--status-overdue))]">
            {priorityAlertCount}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Perlu perhatian segera
          </p>
          <div className="mt-3 flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium">Prioritas</span>
          </div>
        </Link>

        <Link
          href="/inventory"
          className="rounded-xl border-l-4 border-l-[hsl(var(--status-due-soon))]/60 border border-border/60 bg-[hsl(var(--status-bg-due-soon))]/50 shadow-sm p-6 transition-colors hover:opacity-95 hover:border-[hsl(var(--status-due-soon)/0.3)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--status-due-soon)/0.3)] focus:ring-offset-2"
        >
          <p className="text-3xl font-bold tabular-nums tracking-tight text-[hsl(var(--status-due-soon))]">
            {initialData.lowStockPanel.length}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Disarankan restock
          </p>
          <div className="mt-3 flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium">Stok Rendah</span>
          </div>
        </Link>

        <Link
          href="/health?tab=dirawat"
          className="rounded-xl border-l-4 border-l-[hsl(var(--status-ok))]/60 border border-border/60 bg-[hsl(var(--status-bg-ok))]/50 shadow-sm p-6 transition-colors hover:opacity-95 hover:border-[hsl(var(--status-ok)/0.3)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--status-ok)/0.3)] focus:ring-offset-2"
        >
          <p className="text-3xl font-bold tabular-nums tracking-tight text-[hsl(var(--status-ok))]">
            {medicalCareCats.length}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {medicalCareCats.length === 0 ? "Tidak ada dalam perawatan" : "Sedang dirawat"}
          </p>
          <div className="mt-3 flex items-center gap-2 text-muted-foreground">
            <Heart className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium">Perawatan Medis</span>
          </div>
        </Link>
      </section>

      {/* Prioritas + Notifikasi — foto kucing, bahasa Indonesia */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Prioritas
          </h2>
          <div className="max-h-[17rem] overflow-y-auto rounded-lg border border-border/50 bg-muted/20">
            <ul className="flex flex-col gap-1.5 p-1.5">
              {priorityAlerts.length === 0 ? (
                <li className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Semua aman.
                </li>
              ) : (
                priorityAlerts.map((alert) => {
                  const bg =
                    alert.severity === "critical"
                      ? "bg-[hsl(var(--status-bg-overdue))] border-[hsl(var(--status-overdue)/0.2)]"
                      : alert.severity === "warning"
                        ? "bg-[hsl(var(--status-bg-due-soon))] border-amber-200/80"
                        : "bg-muted/40 border-border/60";
                  const content = (
                    <>
                      {alert.photoUrl ? (
                        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/80 bg-muted shadow-sm">
                          <img
                            src={alert.photoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            width={36}
                            height={36}
                          />
                        </span>
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-muted-foreground">
                          <Package className="h-4 w-4" aria-hidden />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground leading-tight">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.description}</p>
                      </div>
                      {alert.date && (
                        <span className={cn(DATE_CAPSULE_BY_SEVERITY[alert.severity])}>
                          {formatDateShort(alert.date)}
                        </span>
                      )}
                    </>
                  );
                  const className = cn(
                    "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors",
                    bg,
                    alert.href && "hover:opacity-90",
                  );
                  return (
                    <li key={alert.id}>
                      {alert.href ? (
                        <Link href={alert.href} className={className}>
                          {content}
                        </Link>
                      ) : (
                        <div className={className}>{content}</div>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Notifikasi Terbaru
          </h2>
          <div className="max-h-[17rem] overflow-y-auto rounded-lg border border-border/50 bg-muted/20">
            <ul className="flex flex-col gap-1.5 p-1.5">
              {recentNotifications.length === 0 ? (
                <li className="rounded-lg bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  Tidak ada notifikasi.
                </li>
              ) : (
                recentNotifications.map((notif) => {
                  const className = cn(
                    "flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 transition-colors",
                    notif.href && "hover:bg-muted/30",
                  );
                  const content = (
                    <>
                      {notif.photoUrl ? (
                        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/80 bg-muted shadow-sm">
                          <img
                            src={notif.photoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            width={36}
                            height={36}
                          />
                        </span>
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
                          <Bell className="h-3.5 w-3.5" aria-hidden />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground leading-tight">{notif.title}</p>
                        <p className="text-xs text-muted-foreground">{notif.description}</p>
                      </div>
                      <span className={DATE_CAPSULE_NOTIFICATION}>
                        {formatDateShort(notif.date)}
                      </span>
                    </>
                  );
                  return (
                    <li key={notif.id}>
                      {notif.href ? (
                        <Link href={notif.href} className={className}>
                          {content}
                        </Link>
                      ) : (
                        <div className={className}>{content}</div>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </section>
      </div>

      {/* ----------------------------------- SEDANG DIRAWAT (foto, nama, kondisi, lokasi) ----------------------------------- */}
      {medicalCareCats.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Link href="/health?tab=dirawat" className="hover:text-foreground hover:underline">
              Sedang Dirawat
            </Link>
          </h2>
          <div className="max-h-[20rem] overflow-y-auto rounded-xl border border-border/60 bg-[hsl(var(--status-bg-ok))]/30">
            <ul className="flex flex-col gap-1.5 p-2">
              {medicalCareCats.map((cat) => {
                const loc = cat.location ? LOCATION_LABEL[cat.location] : null;
                const dirawatDi = loc ? `Dirawat di ${loc}` : "Dalam perawatan";
                return (
                  <li key={cat.id}>
                    <Link
                      href="/health?tab=dirawat"
                      className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-background/80 px-3 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      {cat.photoUrl ? (
                        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/80 bg-muted shadow-sm">
                          <img
                            src={cat.photoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            width={40}
                            height={40}
                          />
                        </span>
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/80 text-sm font-medium text-muted-foreground">
                          {cat.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cat.status && !["sehat", "membaik", "hampir_sembuh", "observasi"].includes(cat.status)
                            ? `${STATUS_LABEL[cat.status]} · ${dirawatDi}`
                            : dirawatDi}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
