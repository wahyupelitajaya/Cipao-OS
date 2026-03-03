"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { updateGroomingLog, deleteGroomingLog } from "@/app/actions/logs";
import type { Tables } from "@/lib/types";

type GroomingLog = Tables<"grooming_logs">;

interface EditGroomingDialogProps {
  catName: string;
  log: GroomingLog;
  /** Jika ada, dipakai sebagai trigger (mis. tanggal yang bisa diklik). */
  trigger?: ReactNode;
}

export function EditGroomingDialog({ catName, log, trigger }: EditGroomingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const currentDate = log.date.slice(0, 10); // YYYY-MM-DD

  async function handleDelete() {
    setDeletePending(true);
    try {
      const formData = new FormData();
      formData.set("id", log.id);
      await deleteGroomingLog(formData);
      setShowDeleteConfirm(false);
      setOpen(false);
      router.refresh();
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="ghost" size="sm">Edit</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit grooming · {catName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <form
            action={async (formData) => {
              await updateGroomingLog(formData);
              setOpen(false);
              router.refresh();
            }}
            className="space-y-3"
          >
            <input type="hidden" name="id" value={log.id} />
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Ubah tanggal grooming
              </label>
              <Input
                type="date"
                name="date"
                defaultValue={currentDate}
                required
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm">
                Simpan tanggal
              </Button>
            </div>
          </form>
          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-2">Atau hapus log grooming ini</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Hapus log ini
            </Button>
          </div>
        </div>
      </DialogContent>
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Hapus log grooming"
        description={`Yakin hapus tanggal grooming ini untuk "${catName}"? Data tidak bisa dikembalikan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={handleDelete}
        loading={deletePending}
      />
    </Dialog>
  );
}
