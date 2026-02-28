"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addGroomingLog } from "@/app/actions/logs";
import type { Tables } from "@/lib/types";

type Cat = Tables<"cats">;

interface AddGroomingDialogProps {
  cat: Cat;
}

export function AddGroomingDialog({ cat }: AddGroomingDialogProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Tambah grooming
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah grooming · {cat.name}</DialogTitle>
        </DialogHeader>
        <form action={addGroomingLog} className="space-y-3 text-sm">
          <input type="hidden" name="cat_id" value={cat.id} />
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Tanggal grooming
            </label>
            <Input
              type="date"
              name="date"
              defaultValue={today}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" size="sm">
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
