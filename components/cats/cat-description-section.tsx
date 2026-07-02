"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateCatDescriptionWithState } from "@/app/actions/cats";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type UpdateCatState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

const initialState: UpdateCatState = { status: "idle" };

const MAX_LENGTH = 2000;

interface CatDescriptionSectionProps {
  catId: string;
  description: string | null;
  admin: boolean;
}

export function CatDescriptionSection({
  catId,
  description,
  admin,
}: CatDescriptionSectionProps) {
  const hasDescription = Boolean(description?.trim());

  if (!hasDescription && !admin) {
    return null;
  }

  return (
    <section className="card px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Deskripsi
          </h2>
          {hasDescription ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Belum ada deskripsi untuk kucing ini.
            </p>
          )}
        </div>
        {admin && (
          <EditDescriptionDialog catId={catId} description={description} />
        )}
      </div>
    </section>
  );
}

function EditDescriptionDialog({
  catId,
  description,
}: {
  catId: string;
  description: string | null;
}) {
  const hasDescription = Boolean(description?.trim());

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {hasDescription ? "Edit deskripsi" : "Tambah deskripsi"}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-lg">
        <DialogHeader>
          <DialogTitle>{hasDescription ? "Edit deskripsi" : "Tambah deskripsi"}</DialogTitle>
        </DialogHeader>
        <DescriptionForm catId={catId} description={description} />
      </DialogContent>
    </Dialog>
  );
}

function DescriptionForm({
  catId,
  description,
}: {
  catId: string;
  description: string | null;
}) {
  const [state, formAction] = useActionState<UpdateCatState, FormData>(
    updateCatDescriptionWithState,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3 text-sm">
      <input type="hidden" name="id" value={catId} />
      <div className="space-y-1">
        <label htmlFor="cat-description" className="text-xs font-medium text-muted-foreground">
          Deskripsi kucing
        </label>
        <Textarea
          id="cat-description"
          name="description"
          rows={6}
          maxLength={MAX_LENGTH}
          defaultValue={description ?? ""}
          placeholder="Contoh: Kucing pendiam, suka tidur di balkon, alergi makanan ikan."
        />
        <p className="text-[11px] text-muted-foreground">
          Maksimal {MAX_LENGTH} karakter. Kosongkan untuk menghapus deskripsi.
        </p>
      </div>

      {state.status === "success" && (
        <p className="text-xs text-green-600">Deskripsi berhasil disimpan.</p>
      )}
      {state.status === "error" && (
        <p className="text-xs text-red-600">Gagal menyimpan: {state.message}</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
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
