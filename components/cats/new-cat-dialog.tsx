"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCatWithState } from "@/app/actions/cats";

const NEW_CAT_STATUS_OPTIONS = [
  { value: "baik", label: "Baik" },
  { value: "kurang_baik", label: "Kurang Baik" },
  { value: "sakit", label: "Sakit" },
] as const;

const NEW_CAT_LOCATION_OPTIONS = [
  { value: "rumah", label: "Rumah" },
  { value: "toko", label: "Toko" },
  { value: "klinik", label: "Klinik" },
] as const;

const initialState = { status: "idle" as const };

export function NewCatDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createCatWithState, initialState);

  useEffect(() => {
    if (state.status === "success") {
      const t = setTimeout(() => {
        setOpen(false);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [state.status]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">New cat</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New cat</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3 text-sm">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Cat ID
            </label>
            <Input
              name="cat_id"
              placeholder="CAT-032"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              name="name"
              placeholder="Name"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              DoB (optional)
            </label>
            <Input name="dob" type="date" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <select
              name="status"
              className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {NEW_CAT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Lokasi
            </label>
            <select
              name="location"
              className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {NEW_CAT_LOCATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {state.status === "success" && (
            <p className="text-xs text-green-600">
              Kucing berhasil ditambahkan.
            </p>
          )}
          {state.status === "error" && (
            <p className="text-xs text-red-600">
              Gagal: {state.message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Menyimpan..." : "Save"}
    </Button>
  );
}
