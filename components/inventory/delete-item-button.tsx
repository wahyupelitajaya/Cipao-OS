"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type DeleteItemAction = (formData: FormData) => void | Promise<void>;

export function DeleteItemButton({
  itemId,
  action,
}: {
  itemId: string;
  action: DeleteItemAction;
}) {
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    const formData = new FormData();
    formData.set("id", itemId);
    await action(formData);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        title="Hapus item"
        onClick={() => setOpen(true)}
      >
        ×
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Hapus item"
        description="Item ini dan riwayat movement-nya akan dihapus. Lanjutkan?"
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={handleConfirm}
      />
    </>
  );
}
