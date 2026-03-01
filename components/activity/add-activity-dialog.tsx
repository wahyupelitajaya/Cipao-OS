"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addActivityForm } from "@/app/actions/activity";
import { getFriendlyMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

interface AddActivityDialogProps {
  date: string;
  cats?: { id: string; name: string }[];
  triggerClassName?: string;
  onSuccess?: () => void;
}

const TIME_SLOTS = ["Pagi", "Siang", "Sore", "Malam"] as const;
const LOCATIONS = ["Toko", "Rumah"] as const;

/** Warna capsule soft per opsi — kesan mewah */
const LOCATION_CAPSULE: Record<string, string> = {
  Toko: "bg-sky-50 text-sky-700 border-sky-200/80 hover:bg-sky-100/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60 dark:hover:bg-sky-900/40",
  Rumah: "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 dark:hover:bg-emerald-900/40",
};

const TIME_CAPSULE: Record<string, string> = {
  Pagi: "bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 dark:hover:bg-amber-900/40",
  Siang: "bg-yellow-50 text-yellow-700 border-yellow-200/80 hover:bg-yellow-100/80 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800/60 dark:hover:bg-yellow-900/40",
  Sore: "bg-orange-50 text-orange-700 border-orange-200/80 hover:bg-orange-100/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60 dark:hover:bg-orange-900/40",
  Malam: "bg-indigo-50 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60 dark:hover:bg-indigo-900/40",
};

function defaultTimeSlots(): Set<string> {
  const h = new Date().getHours();
  let slot = "Malam";
  if (h >= 5 && h < 11) slot = "Pagi";
  else if (h >= 11 && h < 15) slot = "Siang";
  else if (h >= 15 && h < 18) slot = "Sore";
  return new Set([slot]);
}

export function AddActivityDialog({
  date,
  triggerClassName,
  onSuccess,
}: AddActivityDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<Set<string>>(defaultTimeSlots);
  const [locations, setLocations] = useState<Set<string>>(new Set(["Rumah"]));

  const toggleTimeSlot = useCallback((t: string) => {
    setTimeSlots((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }, []);

  const toggleLocation = useCallback((l: string) => {
    setLocations((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  }, []);

  const selectAllTimeSlots = useCallback(() => {
    if (timeSlots.size === TIME_SLOTS.length) setTimeSlots(new Set());
    else setTimeSlots(new Set(TIME_SLOTS));
  }, [timeSlots.size]);

  const selectAllLocations = useCallback(() => {
    if (locations.size === LOCATIONS.length) setLocations(new Set());
    else setLocations(new Set(LOCATIONS));
  }, [locations.size]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (timeSlots.size === 0) {
      setError("Pilih minimal satu waktu.");
      return;
    }
    if (locations.size === 0) {
      setError("Pilih minimal satu lokasi.");
      return;
    }
    setPending(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("date", date);
    formData.set("time_slots", JSON.stringify(Array.from(timeSlots)));
    formData.set("locations", JSON.stringify(Array.from(locations)));
    formData.set("categories", JSON.stringify([]));
    try {
      await addActivityForm(formData);
      setOpen(false);
      setTimeSlots(defaultTimeSlots());
      setLocations(new Set(["Rumah"]));
      form.reset();
      onSuccess?.();
      router.refresh();
    } catch (err) {
      setError(getFriendlyMessage(err));
    } finally {
      setPending(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setTimeSlots(defaultTimeSlots());
      setLocations(new Set(["Rumah"]));
      setError(null);
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("w-full sm:w-auto", triggerClassName)}>
          Tambah aktivitas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah aktivitas</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 text-sm">
          <input type="hidden" name="date" value={date} />

          {/* Lokasi — capsule, soft, font elegan */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-elegant text-xs font-medium italic tracking-wide text-muted-foreground">
                Lokasi
              </label>
              <button
                type="button"
                onClick={selectAllLocations}
                className="text-xs font-medium text-muted-foreground underline hover:text-foreground"
              >
                {locations.size === LOCATIONS.length ? "Batal pilih semua" : "Pilih semua"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {LOCATIONS.map((l) => (
                <label
                  key={l}
                  className={cn(
                    "font-elegant cursor-pointer rounded-full border px-4 py-2 text-sm font-medium italic tracking-wide transition-colors",
                    LOCATION_CAPSULE[l] ?? "bg-muted/50 text-muted-foreground border-border",
                    locations.has(l) && "ring-2 ring-offset-2 ring-sky-400/50 dark:ring-sky-500/50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={locations.has(l)}
                    onChange={() => toggleLocation(l)}
                    className="sr-only"
                  />
                  {l}
                </label>
              ))}
            </div>
          </div>

          {/* Waktu — capsule, soft */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-elegant text-xs font-medium italic tracking-wide text-muted-foreground">
                Waktu
              </label>
              <button
                type="button"
                onClick={selectAllTimeSlots}
                className="text-xs font-medium text-muted-foreground underline hover:text-foreground"
              >
                {timeSlots.size === TIME_SLOTS.length ? "Batal pilih semua" : "Pilih semua"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((t) => (
                <label
                  key={t}
                  className={cn(
                    "font-elegant cursor-pointer rounded-full border px-4 py-2 text-sm font-medium italic tracking-wide transition-colors",
                    TIME_CAPSULE[t] ?? "bg-muted/50 text-muted-foreground border-border",
                    timeSlots.has(t) && "ring-2 ring-offset-2 ring-amber-400/50 dark:ring-amber-500/50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={timeSlots.has(t)}
                    onChange={() => toggleTimeSlot(t)}
                    className="sr-only"
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>

          {/* Deskripsi — isi manual, bisa paragraf baru */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-activity-note"
              className="font-elegant text-xs font-medium italic tracking-wide text-muted-foreground"
            >
              Deskripsi
            </label>
            <textarea
              id="add-activity-note"
              name="note"
              placeholder="Tulis deskripsi aktivitas… Bisa beberapa paragraf."
              rows={5}
              className="flex w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus:border-foreground/40 focus:ring-1 focus:ring-foreground/10 min-h-[100px]"
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={pending || timeSlots.size === 0 || locations.size === 0}
            >
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
