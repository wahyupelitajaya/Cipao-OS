"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditCatDirawatForm } from "@/components/cats/edit-cat-dirawat-form";
import type { Tables } from "@/lib/types";

type Cat = Tables<"cats">;
type Breed = Tables<"cat_breeds">;

interface EditCatDirawatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cat: Cat | null;
  breeds: Breed[];
  onSuccess?: () => void;
}

export function EditCatDirawatDialog({
  open,
  onOpenChange,
  cat,
  breeds,
  onSuccess,
}: EditCatDirawatDialogProps) {
  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0">
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4">
          <DialogTitle>
            {cat ? `Edit kondisi — ${cat.name}` : "Edit kondisi"}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {cat && (
            <EditCatDirawatForm
              cat={cat}
              breeds={breeds}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
