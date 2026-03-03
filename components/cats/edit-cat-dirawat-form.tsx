"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Tables } from "@/lib/types";
import { updateCatWithState } from "@/app/actions/cats";
import { Button } from "@/components/ui/button";
import { CAT_STATUSES, CAT_LOCATIONS, CAT_STATUS_LABELS, CAT_LOCATION_LABELS, DIRAWAT_STATUSES, DIRAWAT_STATUS_LABELS } from "@/lib/constants";

type Cat = Tables<"cats">;
type Breed = Tables<"cat_breeds">;

const STATUS_OPTIONS = CAT_STATUSES.map((value) => ({ value, label: CAT_STATUS_LABELS[value] }));
const LOCATION_OPTIONS = CAT_LOCATIONS.map((value) => ({ value, label: CAT_LOCATION_LABELS[value] }));
const DIRAWAT_STATUS_OPTIONS = DIRAWAT_STATUSES.map((value) => ({ value, label: DIRAWAT_STATUS_LABELS[value] }));

const selectClass =
  "flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type UpdateCatState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

const initialState: UpdateCatState = { status: "idle" };

function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

interface EditCatDirawatFormProps {
  cat: Cat;
  breeds: Breed[];
  onSuccess?: () => void;
}

export function EditCatDirawatForm({ cat, breeds, onSuccess }: EditCatDirawatFormProps) {
  const [state, formAction] = useActionState<UpdateCatState, FormData>(
    updateCatWithState,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success" && onSuccess) {
      onSuccess();
    }
  }, [state.status, onSuccess]);

  return (
    <form action={formAction} className="space-y-3 text-sm">
      <input type="hidden" name="id" value={cat.id} />
      <input type="hidden" name="name" value={cat.name} />
      <input type="hidden" name="dob" value={formatDateForInput(cat.dob)} />
      <input type="hidden" name="photo_url" value={cat.photo_url ?? ""} />
      <input type="hidden" name="dirawat_status_sent" value="1" />
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Status (bisa pilih lebih dari satu)
        </label>
        <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl border border-input bg-muted/30 p-3">
          {DIRAWAT_STATUS_OPTIONS.map((o) => {
            const checked = Array.isArray(cat.dirawat_status) && cat.dirawat_status.includes(o.value);
            return (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="dirawat_status"
                  value={o.value}
                  defaultChecked={checked}
                  className="h-4 w-4 rounded border-input"
                />
                {o.label}
              </label>
            );
          })}
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Status umum
        </label>
        <select
          name="status"
          className={selectClass}
          defaultValue={cat.status ?? "observasi"}
        >
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
        <select
          name="location"
          className={selectClass}
          defaultValue={cat.location ?? "rumah"}
        >
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
        <select
          name="is_contagious"
          className={selectClass}
          defaultValue={
            cat.is_contagious === true ? "true" : cat.is_contagious === false ? "false" : ""
          }
        >
          <option value="">Tidak ditentukan</option>
          <option value="true">Ya, menular</option>
          <option value="false">Tidak menular</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Jenis kucing
        </label>
        <select
          name="breed_id"
          className={selectClass}
          defaultValue={cat.breed_id ?? ""}
        >
          <option value="">— Tidak ada —</option>
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
          rows={3}
          placeholder="Contoh: Jenis penyakit, siapa yang merawat, lokasi perawatan, catatan lain…"
          defaultValue={cat.treatment_notes ?? ""}
          className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y min-h-[4rem]"
        />
      </div>

      {state.status === "success" && (
        <p className="text-xs text-green-600">
          Perubahan berhasil disimpan.
        </p>
      )}
      {state.status === "error" && (
        <p className="text-xs text-red-600">
          Gagal menyimpan: {state.message}
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
      {pending ? "Menyimpan..." : "Simpan"}
    </Button>
  );
}
