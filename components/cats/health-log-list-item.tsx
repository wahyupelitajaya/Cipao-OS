"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteHealthLog } from "@/app/actions/logs";
import { getFriendlyMessage } from "@/lib/errors";
import type { Tables } from "@/lib/types";

type HealthLog = Tables<"health_logs">;

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
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface HealthLogListItemProps {
  log: HealthLog;
  admin: boolean;
  /** Keterangan dari cat (tab Dirawat); dipakai untuk log "Dalam perawatan" jika log.details kosong. */
  catTreatmentNotes?: string | null;
}

export function HealthLogListItem({ log, admin, catTreatmentNotes }: HealthLogListItemProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      const formData = new FormData();
      formData.set("id", log.id);
      await deleteHealthLog(formData);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(getFriendlyMessage(err));
      throw err;
    }
  }

  const typeLabel = HEALTH_TYPE_LABELS[log.type] ?? log.type;
  const dalamPerawatanKeterangan =
    (log.title || "").toLowerCase() === "dalam perawatan"
      ? (log.details?.trim() || catTreatmentNotes?.trim() || null)
      : null;
  const displayTitlePlain =
    dalamPerawatanKeterangan !== null
      ? dalamPerawatanKeterangan
        ? `Dalam perawatan | ${dalamPerawatanKeterangan}`
        : "Dalam perawatan"
      : (log.title || "");
  const description = error
    ? `${error}\n\nYakin ingin menghapus riwayat "${displayTitlePlain}" (${typeLabel})?`
    : `Yakin ingin menghapus riwayat "${displayTitlePlain}" (${typeLabel})?`;

  const titleEl =
    dalamPerawatanKeterangan !== null && dalamPerawatanKeterangan ? (
      <p className="font-medium text-foreground">
        <span>Dalam perawatan</span>
        <span className="mx-1.5 text-muted-foreground/80">|</span>
        <span className="text-[12px] font-normal tracking-wide text-slate-500/90">
          {dalamPerawatanKeterangan}
        </span>
      </p>
    ) : (
      <p className="font-medium text-foreground">{displayTitlePlain}</p>
    );

  return (
    <li className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20">
      <span className="mt-0.5 shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {typeLabel}
      </span>
      <div className="min-w-0 flex-1">
        {titleEl}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDate(new Date(log.date))}
          {log.next_due_date && (
            <span> · Jatuh tempo: {formatDate(new Date(log.next_due_date))}</span>
          )}
        </p>
        {log.details?.trim() && (log.title || "").toLowerCase() !== "dalam perawatan" && (
          <p className="mt-1 text-xs text-muted-foreground">{log.details}</p>
        )}
        {log.is_active_treatment && (
          <Badge variant="due-soon" className="mt-2">
            Perawatan aktif
          </Badge>
        )}
      </div>
      {admin && (
        <div className="shrink-0">
          <button
            type="button"
            className="text-xs text-destructive hover:underline"
            onClick={() => { setOpen(true); setError(null); }}
          >
            Hapus
          </button>
          <ConfirmDialog
            open={open}
            onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}
            title="Hapus riwayat kesehatan"
            description={description}
            confirmLabel="Hapus"
            onConfirm={handleConfirm}
          />
        </div>
      )}
    </li>
  );
}
