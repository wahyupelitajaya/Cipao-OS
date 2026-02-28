"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateHealthLogDate } from "@/app/actions/logs";
import { getFriendlyMessage } from "@/lib/errors";

export type PreventiveType = "VACCINE" | "FLEA" | "DEWORM";

const TYPE_LABELS: Record<PreventiveType, string> = {
  VACCINE: "Vaccine",
  FLEA: "Flea",
  DEWORM: "Deworm",
};

interface SetLastDateDialogProps {
  logId: string;
  currentDate: string;
  catName: string;
  type: PreventiveType;
  admin: boolean;
  triggerLabel?: string;
}

export function SetLastDateDialog({
  logId,
  currentDate,
  catName,
  type,
  admin,
  triggerLabel = "Set",
}: SetLastDateDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentYmd = currentDate.slice(0, 10);
  const [date, setDate] = useState(currentYmd);

  const typeLabel = TYPE_LABELS[type];

  useEffect(() => {
    if (open) {
      setDate(currentYmd);
      setError(null);
    }
  }, [open, currentYmd]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("id", logId);
    formData.set("date", date);
    startTransition(async () => {
      try {
        await updateHealthLogDate(formData);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(getFriendlyMessage(err));
      }
    });
  }

  if (!admin) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-[10px] font-medium text-muted-foreground hover:text-foreground hover:underline"
        >
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm p-4">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Ubah tanggal terbaru · {typeLabel} · {catName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          {error && (
            <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Tanggal terbaru (last administered)
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-9"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
