"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createBreed, updateBreed, deleteBreed } from "@/app/actions/breeds";
import { getFriendlyMessage } from "@/lib/errors";
import type { Tables } from "@/lib/types";

type Breed = Tables<"cat_breeds">;

interface BreedsTableProps {
  breeds: Breed[];
  admin: boolean;
}

export function BreedsTable({ breeds, admin }: BreedsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createBreed(formData);
        router.refresh();
        form.reset();
      } catch (err) {
        setError(getFriendlyMessage(err));
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-foreground">
            Jenis Kucing
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftar jenis/ras kucing. Input manual untuk menambah jenis baru.
          </p>
        </div>
        {admin && (
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px]">
              <label htmlFor="breed-name" className="sr-only">
                Nama jenis
              </label>
              <Input
                id="breed-name"
                name="name"
                placeholder="Contoh: Persian, Angora"
                required
                disabled={isPending}
                className="h-9"
              />
            </div>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "..." : "Tambah jenis"}
            </Button>
          </form>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-4 py-3 font-medium">No</th>
              <th className="px-4 py-3 font-medium">Nama jenis</th>
              {admin && (
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody>
            {breeds.length === 0 ? (
              <tr>
                <td
                  colSpan={admin ? 3 : 2}
                  className="px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  Belum ada jenis kucing. {admin && "Gunakan form di atas untuk menambah."}
                </td>
              </tr>
            ) : (
              breeds.map((breed, index) => (
                <tr
                  key={breed.id}
                  className="border-b border-border/40 last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {breed.name}
                  </td>
                  {admin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <EditBreedDialog breed={breed} onSuccess={() => router.refresh()} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          disabled={isPending}
                          onClick={() => setConfirmDeleteId(breed.id)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
        title="Hapus jenis kucing"
        description="Jenis ini akan dihapus. Lanjutkan?"
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={async () => {
          if (!confirmDeleteId) return;
          setError(null);
          const formData = new FormData();
          formData.set("id", confirmDeleteId);
          try {
            await deleteBreed(formData);
            router.refresh();
          } catch (err) {
            setError(getFriendlyMessage(err));
            throw err;
          }
        }}
        loading={isPending}
      />
    </div>
  );
}

function EditBreedDialog({
  breed,
  onSuccess,
}: {
  breed: Breed;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await updateBreed(formData);
        onSuccess();
        setOpen(false);
      } catch (err) {
        setError(getFriendlyMessage(err));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit jenis kucing</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="hidden" name="id" value={breed.id} />
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Nama jenis
            </label>
            <Input
              name="name"
              defaultValue={breed.name}
              required
              disabled={isPending}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
