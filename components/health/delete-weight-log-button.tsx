"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteWeightLog } from "@/app/actions/logs";
import { getFriendlyMessage } from "@/lib/errors";

interface DeleteWeightLogButtonProps {
  logId: string;
  label: string;
  catName: string;
  weightDisplay: string;
}

export function DeleteWeightLogButton({
  logId,
  label,
  catName,
  weightDisplay,
}: DeleteWeightLogButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      const formData = new FormData();
      formData.set("id", logId);
      await deleteWeightLog(formData);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(getFriendlyMessage(err));
      throw err;
    }
  }

  const description = error
    ? `${error}\n\nYakin ingin menghapus log ${label} (${weightDisplay}) untuk "${catName}"?`
    : `Yakin ingin menghapus log ${label} (${weightDisplay}) untuk "${catName}"?`;

  return (
    <>
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
        title="Hapus log berat"
        description={description}
        confirmLabel="Hapus"
        onConfirm={handleConfirm}
      />
    </>
  );
}
