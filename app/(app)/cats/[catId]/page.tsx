import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getSessionProfile, isAdmin } from "@/lib/auth";
import { buildStatusSuggestion } from "@/lib/cat-status";
import type { Tables } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addHealthLog, addWeightLog, addGroomingLog } from "@/app/actions/logs";
import { acceptSuggestedStatus } from "@/app/actions/cats";
import { EditCatDialog } from "@/components/cats/edit-cat-dialog";
import { DeleteCatButton } from "@/components/cats/delete-cat-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Cat = Tables<"cats">;
type HealthLog = Tables<"health_logs">;
type WeightLog = Tables<"weight_logs">;
type GroomingLog = Tables<"grooming_logs">;

const STATUS_LABELS: Record<string, string> = {
  baik: "Baik",
  kurang_baik: "Kurang Baik",
  sakit: "Sakit",
};

const LOCATION_LABELS: Record<string, string> = {
  rumah: "Rumah",
  toko: "Toko",
  klinik: "Klinik",
};

const SUGGESTION_LABELS: Record<string, string> = {
  "Needs Attention": "Perlu perhatian",
  Monitor: "Pantau",
  Healthy: "Sehat",
};

const HEALTH_TYPE_LABELS: Record<string, string> = {
  VACCINE: "Vaksin",
  FLEA: "Flea",
  DEWORM: "Deworm",
  ILLNESS: "Sakit",
  MEDICATION: "Obat",
  CLINIC: "Klinik",
  NOTE: "Catatan",
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function describeDue(date: Date | null | undefined): string {
  if (!date) return "Belum dijadwalkan";
  const today = startOfDay(new Date());
  const d = startOfDay(date);
  const days = Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return `Terlambat ${Math.abs(days)} hari`;
  if (days === 0) return "Hari ini";
  if (days <= 7) return `${days} hari lagi`;
  return `${days} hari lagi`;
}

function isOverdue(date: Date | null | undefined): boolean {
  if (!date) return false;
  return startOfDay(date).getTime() < startOfDay(new Date()).getTime();
}

function isDueSoon(date: Date | null | undefined): boolean {
  if (!date) return false;
  const d = startOfDay(date).getTime();
  const today = startOfDay(new Date()).getTime();
  const in7 = today + 7 * 24 * 60 * 60 * 1000;
  return d >= today && d <= in7;
}

interface CatProfilePageProps {
  params: Promise<{ catId: string }>;
}

export default async function CatProfilePage(props: CatProfilePageProps) {
  const { catId } = await props.params;
  const supabase = await createSupabaseServerClient();
  const { profile } = await getSessionProfile();
  const admin = isAdmin(profile);

  const { data: cat } = await supabase
    .from("cats")
    .select("*")
    .eq("id", catId)
    .maybeSingle();

  if (!cat) notFound();

  const [
    { data: healthLogs = [] },
    { data: weightLogs = [] },
    { data: groomingLogs = [] },
    { data: breeds = [] },
  ] = await Promise.all([
    supabase
      .from("health_logs")
      .select("*")
      .eq("cat_id", cat.id)
      .order("date", { ascending: false }),
    supabase
      .from("weight_logs")
      .select("*")
      .eq("cat_id", cat.id)
      .order("date", { ascending: false }),
    supabase
      .from("grooming_logs")
      .select("*")
      .eq("cat_id", cat.id)
      .order("date", { ascending: false }),
    supabase
      .from("cat_breeds")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  const suggestion = buildStatusSuggestion({
    healthLogs: healthLogs as HealthLog[],
    weightLogs: weightLogs as WeightLog[],
  });

  const showBanner = admin && suggestion.suggested !== (cat.status_manual as string);
  const lastGrooming = (groomingLogs as GroomingLog[])[0] ?? null;
  const weightHistory = (weightLogs as WeightLog[]).slice(0, 5);
  const c = cat as Cat;

  const suggestionLabel = SUGGESTION_LABELS[suggestion.suggested] ?? suggestion.suggested;

  const statusVariant =
    suggestion.suggested === "Needs Attention"
      ? "overdue"
      : suggestion.suggested === "Monitor"
        ? "due-soon"
        : "ok";

  return (
    <div className="flex flex-col gap-10">
      <Link
        href="/cats"
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Daftar kucing
      </Link>

      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <div className="shrink-0">
          {c.photo_url ? (
            <img
              src={c.photo_url}
              alt=""
              className="h-24 w-24 rounded-xl object-cover shadow-soft sm:h-28 sm:w-28"
            />
          ) : (
            <div
              className="flex h-24 w-24 items-center justify-center rounded-xl bg-muted text-xl font-semibold text-muted-foreground shadow-soft sm:h-28 sm:w-28"
              aria-hidden
            >
              {c.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {c.name}
            </h1>
            {c.status && (
              <Badge
                variant={
                  c.status === "sakit"
                    ? "sakit"
                    : c.status === "kurang_baik"
                      ? "kurang_baik"
                      : "baik"
                }
              >
                {STATUS_LABELS[c.status] ?? c.status}
              </Badge>
            )}
            <Badge variant={statusVariant}>{suggestionLabel}</Badge>
            {admin && (
              <>
                <EditCatDialog cat={c} breeds={(breeds as Tables<"cat_breeds">[]) ?? []} />
                <DeleteCatButton catId={c.id} catName={c.name} />
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0 text-sm text-muted-foreground">
            {c.location && (
              <span>{LOCATION_LABELS[c.location] ?? c.location}</span>
            )}
            {c.dob && <span>Lahir {formatDate(new Date(c.dob))}</span>}
          </div>
          {suggestion.reasons.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {suggestion.reasons.join(" · ")}
            </p>
          )}
        </div>
      </header>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Ringkasan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            label="Berat terakhir"
            value={
              suggestion.lastWeight
                ? `${suggestion.lastWeight.weightKg.toFixed(2)} kg`
                : "—"
            }
            meta={suggestion.lastWeight ? formatDate(suggestion.lastWeight.date) : "Belum ada"}
          />
          <MetricCard
            label="Vaksin (next)"
            value={suggestion.nextVaccine ? formatDate(suggestion.nextVaccine) : "—"}
            meta={describeDue(suggestion.nextVaccine)}
            overdue={isOverdue(suggestion.nextVaccine)}
            dueSoon={isDueSoon(suggestion.nextVaccine)}
          />
          <MetricCard
            label="Flea (next)"
            value={suggestion.nextFlea ? formatDate(suggestion.nextFlea) : "—"}
            meta={describeDue(suggestion.nextFlea)}
            overdue={isOverdue(suggestion.nextFlea)}
            dueSoon={isDueSoon(suggestion.nextFlea)}
          />
          <MetricCard
            label="Deworm (next)"
            value={suggestion.nextDeworm ? formatDate(suggestion.nextDeworm) : "—"}
            meta={describeDue(suggestion.nextDeworm)}
            overdue={isOverdue(suggestion.nextDeworm)}
            dueSoon={isDueSoon(suggestion.nextDeworm)}
          />
          <MetricCard
            label="Grooming terakhir"
            value={lastGrooming ? formatDate(new Date(lastGrooming.date)) : "—"}
            meta={lastGrooming ? "Tercatat" : "Belum pernah"}
          />
        </div>
      </section>

      {showBanner && (
        <form
          action={acceptSuggestedStatus}
          className="card flex flex-wrap items-center justify-between gap-3 border-[hsl(var(--status-due-soon))]/30 bg-[hsl(var(--status-bg-due-soon))] px-5 py-4"
        >
          <input type="hidden" name="cat_id" value={cat.id} />
          <input type="hidden" name="status" value={suggestion.suggested} />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              Sistem menyarankan status → {suggestionLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              {suggestion.reasons.length > 0
                ? suggestion.reasons.join(" · ")
                : "Tidak ada isu terdeteksi."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm">
              Terima
            </Button>
          </div>
        </form>
      )}

      {/* Quick add + Timeline */}
      <section className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tambah log cepat
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Catat vaksin, berat, grooming, sakit, atau obat.
              </p>
            </div>
            {admin ? (
              <div className="flex flex-wrap gap-2">
                <HealthQuickAdd cat={c} type="VACCINE" label="+ Vaksin" />
                <HealthQuickAdd cat={c} type="FLEA" label="+ Flea" />
                <HealthQuickAdd cat={c} type="DEWORM" label="+ Deworm" />
                <HealthQuickAdd cat={c} type="ILLNESS" label="+ Sakit" />
                <HealthQuickAdd cat={c} type="MEDICATION" label="+ Obat" />
                <WeightQuickAdd cat={c} />
                <GroomingQuickAdd cat={c} />
              </div>
            ) : (
              <p className="card px-4 py-2 text-xs text-muted-foreground">
                Hanya admin yang dapat menambah log. Hubungi admin untuk update.
              </p>
            )}
          </div>

          <div className="card overflow-hidden p-0">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Riwayat kesehatan
              </h2>
            </div>
            {(healthLogs as HealthLog[]).length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Belum ada log kesehatan.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {(healthLogs as HealthLog[]).map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20"
                  >
                    <span className="mt-0.5 shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {HEALTH_TYPE_LABELS[log.type] ?? log.type}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{log.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(new Date(log.date))}
                        {log.next_due_date && (
                          <span> · Jatuh tempo: {formatDate(new Date(log.next_due_date))}</span>
                        )}
                      </p>
                      {log.details && (
                        <p className="mt-1 text-xs text-muted-foreground">{log.details}</p>
                      )}
                      {log.is_active_treatment && (
                        <Badge variant="due-soon" className="mt-2">
                          Perawatan aktif
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card px-5 py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Riwayat berat (5 terakhir)
            </h2>
            {weightHistory.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Belum ada data.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {weightHistory.map((w) => (
                  <li
                    key={w.id}
                    className="flex justify-between gap-4 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {formatDate(new Date(w.date))}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      {Number(w.weight_kg).toFixed(2)} kg
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  meta,
  overdue,
  dueSoon,
}: {
  label: string;
  value: string;
  meta: string;
  overdue?: boolean;
  dueSoon?: boolean;
}) {
  return (
    <div
      className={cn(
        "card px-4 py-4 transition-colors",
        overdue && "border-[hsl(var(--status-overdue))]/30 bg-[hsl(var(--status-bg-overdue))]",
        dueSoon && !overdue && "border-[hsl(var(--status-due-soon))]/30 bg-[hsl(var(--status-bg-due-soon))]",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-base font-semibold tracking-tight",
          overdue && "text-[hsl(var(--status-overdue))]",
          dueSoon && !overdue && "text-[hsl(var(--status-due-soon))]",
          !overdue && !dueSoon && "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>
    </div>
  );
}

function HealthQuickAdd({
  cat,
  type,
  label,
}: {
  cat: Cat;
  type: HealthLog["type"];
  label: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-lg">
        <DialogHeader>
          <DialogTitle>{label} · {cat.name}</DialogTitle>
        </DialogHeader>
        <form action={addHealthLog} className="space-y-3 text-sm">
          <input type="hidden" name="cat_id" value={cat.id} />
          <input type="hidden" name="type" value={type} />
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tanggal</label>
              <Input type="date" name="date" defaultValue={today} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Jatuh tempo berikut (opsional)</label>
              <Input type="date" name="next_due_date" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Judul</label>
            <Input name="title" placeholder="Contoh: Booster rabies" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Detail (opsional)</label>
            <Textarea name="details" placeholder="Catatan untuk dokter atau kunjungan berikut." rows={3} />
          </div>
          {["ILLNESS", "MEDICATION"].includes(type) && (
            <label className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <input type="checkbox" name="is_active_treatment" className="h-3.5 w-3.5 rounded border border-input accent-black" />
              <span>Tandai sebagai perawatan aktif</span>
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" size="sm">Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WeightQuickAdd({ cat }: { cat: Cat }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">+ Berat</Button>
      </DialogTrigger>
      <DialogContent className="rounded-lg">
        <DialogHeader>
          <DialogTitle>Log berat · {cat.name}</DialogTitle>
        </DialogHeader>
        <form action={addWeightLog} className="space-y-3 text-sm">
          <input type="hidden" name="cat_id" value={cat.id} />
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tanggal</label>
              <Input type="date" name="date" defaultValue={today} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Berat (kg)</label>
              <Input type="number" name="weight_kg" step="0.01" min="0" required />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" size="sm">Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GroomingQuickAdd({ cat }: { cat: Cat }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">+ Grooming</Button>
      </DialogTrigger>
      <DialogContent className="rounded-lg">
        <DialogHeader>
          <DialogTitle>Log grooming · {cat.name}</DialogTitle>
        </DialogHeader>
        <form action={addGroomingLog} className="space-y-3 text-sm">
          <input type="hidden" name="cat_id" value={cat.id} />
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tanggal</label>
            <Input type="date" name="date" defaultValue={today} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" size="sm">Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
