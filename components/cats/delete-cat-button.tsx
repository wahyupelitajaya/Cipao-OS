"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteCat } from "@/app/actions/cats";
import { getFriendlyMessage } from "@/lib/errors";

interface DeleteCatButtonProps {
  catId: string;
  catName: string;
}

export function DeleteCatButton({ catId, catName }: DeleteCatButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      const formData = new FormData();
      formData.set("id", catId);
      await deleteCat(formData);
      setOpen(false);
      router.push("/cats");
      router.refresh();
    } catch (err) {
      setError(getFriendlyMessage(err));
    }
  }

  const description = error
    ? `${error}\n\nYakin ingin menghapus "${catName}"? Semua data health, weight, dan grooming kucing ini akan ikut terhapus.`
    : `Yakin ingin menghapus "${catName}"? Semua data health, weight, dan grooming kucing ini akan ikut terhapus.`;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
        onClick={() => { setOpen(true); setError(null); }}
      >
        Hapus kucing
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}
        title="Hapus kucing"
        description={description}
        confirmLabel="Hapus"
        onConfirm={handleConfirm}
      />
    </>
  );
}
