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
import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AddActivityDialogProps {
  date: string;
  cats?: { id: string; name: string }[];
  triggerClassName?: string;
  onSuccess?: () => void;
}

const TIME_SLOTS = ["Pagi", "Siang", "Sore", "Malam"] as const;
const LOCATIONS = ["Rumah", "Toko"] as const;
const CATEGORIES = [...ACTIVITY_CATEGORIES];

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
  const [categories, setCategories] = useState<Set<string>>(new Set());

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

  const toggleCategory = useCallback((c: string) => {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }, []);

  const selectAllCategories = useCallback(() => {
    if (categories.size === CATEGORIES.length) setCategories(new Set());
    else setCategories(new Set(CATEGORIES));
  }, [categories.size]);

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
    formData.set("categories", JSON.stringify(Array.from(categories)));
    try {
      await addActivityForm(formData);
      setOpen(false);
      setTimeSlots(defaultTimeSlots());
      setLocations(new Set(["Rumah"]));
      setCategories(new Set());
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
      setCategories(new Set());
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah aktivitas</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <input type="hidden" name="date" value={date} />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Waktu (bisa pilih lebih dari satu)</label>
              <button type="button" onClick={selectAllTimeSlots} className="text-xs font-medium text-muted-foreground underline hover:text-foreground">
                {timeSlots.size === TIME_SLOTS.length ? "Batal pilih semua" : "Pilih semua"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 hover:bg-muted">
                  <input type="checkbox" checked={timeSlots.has(t)} onChange={() => toggleTimeSlot(t)} className="h-4 w-4 rounded border-border" />
                  <span className="text-foreground">{t}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Lokasi (bisa pilih lebih dari satu)</label>
              <button type="button" onClick={selectAllLocations} className="text-xs font-medium text-muted-foreground underline hover:text-foreground">
                {locations.size === LOCATIONS.length ? "Batal pilih semua" : "Pilih semua"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {LOCATIONS.map((l) => (
                <label key={l} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 hover:bg-muted">
                  <input type="checkbox" checked={locations.has(l)} onChange={() => toggleLocation(l)} className="h-4 w-4 rounded border-border" />
                  <span className="text-foreground">{l}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Kategori (bisa pilih lebih dari satu)</label>
              <button type="button" onClick={selectAllCategories} className="text-xs font-medium text-muted-foreground underline hover:text-foreground">
                {categories.size === CATEGORIES.length ? "Batal pilih semua" : "Pilih semua"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 hover:bg-muted">
                  <input type="checkbox" checked={categories.has(c)} onChange={() => toggleCategory(c)} className="h-4 w-4 rounded border-border" />
                  <span className="text-foreground">{c}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Catatan (opsional, bisa banyak paragraf)</label>
            <textarea
              name="note"
              placeholder="Tulis catatan, bisa beberapa paragraf..."
              rows={5}
              className="flex w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-soft outline-none placeholder:text-muted-foreground focus:border-foreground/40 focus:ring-1 focus:ring-foreground/10 min-h-[100px]"
            />
          </div>
          {error && <p className="text-xs text-[hsl(var(--status-overdue))]">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" size="sm" disabled={pending || timeSlots.size === 0 || locations.size === 0}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
