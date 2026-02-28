"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Tables } from "@/lib/types";
import { updateCatWithState } from "@/app/actions/cats";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CAT_STATUSES, CAT_LOCATIONS, CAT_STATUS_LABELS, CAT_LOCATION_LABELS } from "@/lib/constants";

type Cat = Tables<"cats">;
type Breed = Tables<"cat_breeds">;

const STATUS_OPTIONS = CAT_STATUSES.map((value) => ({ value, label: CAT_STATUS_LABELS[value] }));
const LOCATION_OPTIONS = CAT_LOCATIONS.map((value) => ({ value, label: CAT_LOCATION_LABELS[value] }));

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

interface EditCatFormProps {
  cat: Cat;
  breeds: Breed[];
}

export function EditCatForm({ cat, breeds }: EditCatFormProps) {
  const [state, formAction] = useActionState<UpdateCatState, FormData>(
    updateCatWithState,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3 text-sm">
      <input type="hidden" name="id" value={cat.id} />
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Cat ID
        </label>
        <Input value={cat.cat_id} disabled />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Name
        </label>
        <Input name="name" defaultValue={cat.name} required />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          DoB (optional)
        </label>
        <Input
          name="dob"
          type="date"
          defaultValue={formatDateForInput(cat.dob)}
        />
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
          Status
        </label>
        <select
          name="status"
          className={selectClass}
          defaultValue={cat.status ?? "baik"}
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
          Foto kucing
        </label>
        <div className="rounded-xl border border-input bg-background px-3 py-2">
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Upload dari perangkat (maks. 5MB, JPG/PNG/GIF/WebP). Jika diisi, akan dipakai menggantikan URL di bawah.
        </p>
        <div className="pt-1">
          <label className="text-[11px] font-medium text-muted-foreground">
            Atau isi URL foto (jika sudah ada di internet)
          </label>
          <Input
            name="photo_url"
            type="url"
            placeholder="https://..."
            defaultValue={cat.photo_url ?? ""}
            className="mt-0.5 rounded-xl"
          />
        </div>
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
      {pending ? "Menyimpan..." : "Save changes"}
    </Button>
  );
}

