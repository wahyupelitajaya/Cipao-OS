"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BulkEditDirawatForm } from "@/components/cats/bulk-edit-dirawat-form";

interface BulkEditDirawatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catIds: string[];
  breeds: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function BulkEditDirawatDialog({
  open,
  onOpenChange,
  catIds,
  breeds,
  onSuccess,
}: BulkEditDirawatDialogProps) {
  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0">
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4">
          <DialogTitle>
            Edit kondisi ({catIds.length} kucing)
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <BulkEditDirawatForm
            catIds={catIds}
            breeds={breeds}
            onSuccess={handleSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
