"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const busy = loading || isConfirming;

  async function handleConfirm() {
    setIsConfirming(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsConfirming(false);
    }
  }

  function handleCancel() {
    if (!busy) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-1/2 -translate-y-1/2"
        onPointerDownOutside={handleCancel}
        onEscapeKeyDown={handleCancel}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
