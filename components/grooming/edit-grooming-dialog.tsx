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
import { updateGroomingLog } from "@/app/actions/logs";
import type { Tables } from "@/lib/types";

type GroomingLog = Tables<"grooming_logs">;

interface EditGroomingDialogProps {
  catName: string;
  log: GroomingLog;
}

export function EditGroomingDialog({ catName, log }: EditGroomingDialogProps) {
  const currentDate = log.date.slice(0, 10); // YYYY-MM-DD

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah tanggal grooming · {catName}</DialogTitle>
        </DialogHeader>
        <form action={updateGroomingLog} className="space-y-3 text-sm">
          <input type="hidden" name="id" value={log.id} />
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Tanggal terakhir grooming
            </label>
            <Input
              type="date"
              name="date"
              defaultValue={currentDate}
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
