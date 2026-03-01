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
import { updateWeightLog } from "@/app/actions/logs";
import { getFriendlyMessage } from "@/lib/errors";

interface EditWeightLogDialogProps {
  logId: string;
  initialDate: string;
  initialWeightKg: number;
  label: string;
  catName: string;
  children: React.ReactNode;
}

function toYmd(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function EditWeightLogDialog({
  logId,
  initialDate,
  initialWeightKg,
  label,
  catName,
  children,
}: EditWeightLogDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(() => toYmd(initialDate));
  const [weightKg, setWeightKg] = useState(() => String(initialWeightKg));

  useEffect(() => {
    if (open) {
      setDate(toYmd(initialDate));
      setWeightKg(String(initialWeightKg));
      setError(null);
    }
  }, [open, initialDate, initialWeightKg]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("id", logId);
    formData.set("date", date);
    formData.set("weight_kg", weightKg.replace(",", "."));
    startTransition(async () => {
      try {
        await updateWeightLog(formData);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(getFriendlyMessage(err));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {label} — {catName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tanggal</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Berat (kg)</label>
            <Input
              type="text"
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="0.00"
              required
              className="w-full"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
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
