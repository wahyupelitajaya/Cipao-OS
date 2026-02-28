"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Cat,
  AlertTriangle,
  Package,
  Heart,
  AlertCircle,
  Info,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DUE_SOON_DAYS, NOTIFICATION_WINDOW_DAYS } from "@/lib/constants";
import type {
  DashboardData,
  DashboardCatRecord,
  CatWithStatus,
  SuggestedStatus,
  CatStatus,
  CatLocation,
} from "@/app/(app)/dashboard/types";

const STATUS_LABEL: Record<NonNullable<CatStatus>, string> = {
  baik: "Baik",
  kurang_baik: "Kurang baik",
  sakit: "Sakit",
};

const LOCATION_LABEL: Record<NonNullable<CatLocation>, string> = {
  rumah: "rumah",
  toko: "toko",
  klinik: "klinik",
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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

type PreventiveType = "VACCINE" | "FLEA" | "DEWORM";

const PREVENTIVE_LABEL: Record<PreventiveType, string> = {
  VACCINE: "Vaksin",
  FLEA: "Flea",
  DEWORM: "Deworm",
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
        title: `${PREVENTIVE_LABEL[p.type as PreventiveType]} Terlambat`,
        description: cat.name,
        date: p.nextDueDate,
        href: `/cats/${cat.id}`,
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
        href: `/cats/${cat.id}`,
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
        title: `${PREVENTIVE_LABEL[p.type as PreventiveType]} jatuh tempo`,
        description: cat.name,
        date: p.nextDueDate,
        href: `/cats/${cat.id}`,
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
      href: `/cats/${entry.catId}`,
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

  /** Kucing yang dianggap "dalam perawatan" untuk tampilan: punya perawatan aktif ATAU status kurang_baik/sakit */
  const medicalCareCats = useMemo(
    () =>
      initialData.cats.filter(
        (c) =>
          c.hasActiveTreatment ||
          c.status === "kurang_baik" ||
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
  const activeCats = totalCats; // Dashboard only fetches active cats

  return (
    <div className="flex flex-col gap-10">
      {/* ----------------------------------- HEADER ----------------------------------- */}
      <header className="space-y-1 border-b border-border/80 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan prioritas dan status sistem
        </p>
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
            {activeCats} aktif
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
          href="/health"
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
                        <span className="shrink-0 text-xs text-muted-foreground">
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
                      <span className="shrink-0 text-xs text-muted-foreground">
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
            Sedang Dirawat
          </h2>
          <div className="max-h-[20rem] overflow-y-auto rounded-xl border border-border/60 bg-[hsl(var(--status-bg-ok))]/30">
            <ul className="flex flex-col gap-1.5 p-2">
              {medicalCareCats.map((cat) => {
                const loc = cat.location ? LOCATION_LABEL[cat.location] : null;
                const dirawatDi = loc ? `Dirawat di ${loc}` : "Dalam perawatan";
                return (
                  <li key={cat.id}>
                    <Link
                      href={`/cats/${cat.id}`}
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
                          {cat.status && cat.status !== "baik"
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
