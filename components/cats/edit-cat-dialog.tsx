"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EditCatForm } from "@/components/cats/edit-cat-form";
import type { Tables } from "@/lib/types";

type Cat = Tables<"cats">;
type Breed = Tables<"cat_breeds">;

interface EditCatDialogProps {
  cat: Cat;
  breeds: Breed[];
}

export function EditCatDialog({ cat, breeds }: EditCatDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col p-0">
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4">
          <DialogTitle>Edit cat</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <EditCatForm cat={cat} breeds={breeds} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
