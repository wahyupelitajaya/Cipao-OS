"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { bulkUpdateCatsWithState, type BulkUpdateCatsState } from "@/app/actions/cats";
import { Button } from "@/components/ui/button";
import { CAT_STATUSES, CAT_LOCATIONS, CAT_STATUS_LABELS, CAT_LOCATION_LABELS, DIRAWAT_STATUSES, DIRAWAT_STATUS_LABELS } from "@/lib/constants";

const STATUS_OPTIONS = CAT_STATUSES.map((value) => ({ value, label: CAT_STATUS_LABELS[value] }));
const LOCATION_OPTIONS = CAT_LOCATIONS.map((value) => ({ value, label: CAT_LOCATION_LABELS[value] }));
const DIRAWAT_STATUS_OPTIONS = DIRAWAT_STATUSES.map((value) => ({ value, label: DIRAWAT_STATUS_LABELS[value] }));

const selectClass =
  "flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const initialState: BulkUpdateCatsState = { status: "idle" };

interface BulkEditDirawatFormProps {
  catIds: string[];
  breeds: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function BulkEditDirawatForm({
  catIds,
  breeds,
  onSuccess,
}: BulkEditDirawatFormProps) {
  const [state, formAction] = useActionState<BulkUpdateCatsState, FormData>(
    bulkUpdateCatsWithState,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success" && onSuccess) {
      onSuccess();
    }
  }, [state.status, onSuccess]);

  return (
    <form action={formAction} className="space-y-3 text-sm">
      <input
        type="hidden"
        name="cat_ids"
        value={JSON.stringify(catIds)}
      />
      <p className="text-xs text-muted-foreground">
        Pilih minimal satu field untuk diterapkan ke {catIds.length} kucing. Keterangan bisa diisi untuk semua atau dikosongkan untuk tidak mengubah.
      </p>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Status (bisa pilih lebih dari satu) — centang &quot;Terapkan&quot; agar dipakai
        </label>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-input bg-muted/30 p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="apply_dirawat_status" value="1" className="h-4 w-4 rounded border-input" />
            Terapkan status di bawah ke semua
          </label>
          {DIRAWAT_STATUS_OPTIONS.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="dirawat_status"
                value={o.value}
                className="h-4 w-4 rounded border-input"
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Status umum
        </label>
        <select name="status" className={selectClass} defaultValue="">
          <option value="">— Tidak ubah —</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Lokasi
        </label>
        <select name="location" className={selectClass} defaultValue="">
          <option value="">— Tidak ubah —</option>
          {LOCATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Menular
        </label>
        <select name="is_contagious" className={selectClass} defaultValue="">
          <option value="">— Tidak ubah —</option>
          <option value="true">Ya, menular</option>
          <option value="false">Tidak menular</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Jenis kucing
        </label>
        <select name="breed_id" className={selectClass} defaultValue="">
          <option value="">— Tidak ubah —</option>
          {breeds.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Keterangan (opsional)
        </label>
        <textarea
          name="treatment_notes"
          rows={2}
          placeholder="Contoh: Jenis penyakit, yang merawat… (diterapkan ke semua)"
          className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y min-h-[3rem]"
        />
      </div>

      {state.status === "success" && (
        <p className="text-xs text-green-600">
          {state.count} kucing berhasil diperbarui.
        </p>
      )}
      {state.status === "error" && (
        <p className="text-xs text-red-600">
          Gagal: {state.message}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Menyimpan..." : "Simpan ke semua"}
    </Button>
  );
}
