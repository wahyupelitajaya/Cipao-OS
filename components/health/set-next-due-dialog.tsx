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
import { setNextDueDate } from "@/app/actions/logs";
import { getFriendlyMessage } from "@/lib/errors";

export type PreventiveType = "VACCINE" | "FLEA" | "DEWORM";

const TYPE_LABELS: Record<PreventiveType, string> = {
  VACCINE: "Vaccine",
  FLEA: "Flea",
  DEWORM: "Deworm",
};

export interface PreventiveLog {
  id: string;
  date: string;
  next_due_date: string | null;
}

interface SetNextDueDialogProps {
  catId: string;
  catName: string;
  type: PreventiveType;
  log: PreventiveLog | null;
  admin: boolean;
  triggerLabel?: string;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function SetNextDueDialog({
  catId,
  catName,
  type,
  log,
  admin,
  triggerLabel = "Set",
}: SetNextDueDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nextDue, setNextDue] = useState(
    () => log?.next_due_date ?? toYmd(addYears(new Date(), 1)),
  );

  const typeLabel = TYPE_LABELS[type];

  useEffect(() => {
    if (open) {
      setNextDue(
        log?.next_due_date ?? toYmd(addYears(new Date(), 1)),
      );
    }
  }, [open, log?.next_due_date]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    setError(null);
    if (!next) setNextDue(log?.next_due_date ?? toYmd(addYears(new Date(), 1)));
  }

  function applyQuick(months: number) {
    const base = nextDue ? new Date(nextDue) : new Date();
    setNextDue(toYmd(addMonths(base, months)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    if (log) formData.set("log_id", log.id);
    formData.set("cat_id", catId);
    formData.set("type", type);
    formData.set("next_due_date", nextDue);
    startTransition(async () => {
      try {
        await setNextDueDate(formData);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(getFriendlyMessage(err));
      }
    });
  }

  if (!admin) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            Set next due · {typeLabel} · {catName}
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
              Next due date
            </label>
            <Input
              type="date"
              value={nextDue}
              onChange={(e) => setNextDue(e.target.value)}
              required
              className="h-9"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => applyQuick(1)}
            >
              +1 month
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => applyQuick(3)}
            >
              +3 months
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => setNextDue(toYmd(addYears(new Date(nextDue || new Date().toISOString().slice(0, 10)), 1)))}
            >
              +1 year
            </Button>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
