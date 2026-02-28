"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditGroomingDialog } from "@/components/grooming/edit-grooming-dialog";
import { AddGroomingDialog } from "@/components/grooming/add-grooming-dialog";
import { bulkSetGroomingDate } from "@/app/actions/logs";
import type { Tables } from "@/lib/types";

type Cat = Tables<"cats">;
type Breed = Tables<"cat_breeds">;
type GroomingLog = Tables<"grooming_logs">;

export interface GroomingRow {
  cat: Cat;
  last: GroomingLog | null;
}

interface GroomingTableProps {
  rows: GroomingRow[];
  breeds: Breed[];
  admin: boolean;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function GroomingTable({ rows, breeds, admin }: GroomingTableProps) {
  const router = useRouter();
  const breedsById = new Map(breeds.map((b) => [b.id, b]));
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDate, setBulkDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const allIds = rows.map((r) => r.cat.id);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  function toggleOne(catId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }

  function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    const items = rows
      .filter((r) => selectedIds.has(r.cat.id))
      .map((r) => ({ catId: r.cat.id, logId: r.last?.id ?? null }));
    const formData = new FormData();
    formData.set("date", bulkDate);
    formData.set("payload", JSON.stringify(items));
    startTransition(async () => {
      await bulkSetGroomingDate(formData);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-6">
      {admin && selectedCount > 0 && (
        <form
          onSubmit={handleBulkSubmit}
          className="card flex flex-wrap items-center gap-3 px-5 py-4"
        >
          <span className="text-sm font-medium text-muted-foreground">
            Ubah tanggal grooming untuk {selectedCount} kucing
          </span>
          <Input
            type="date"
            value={bulkDate}
            onChange={(e) => setBulkDate(e.target.value)}
            required
            className="h-9 w-[10.5rem]"
          />
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Menyimpan…" : "Simpan"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Batal
          </Button>
        </form>
      )}

      <div className="table-container overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {admin && (
                <th className="w-10 px-5 py-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="sr-only">Pilih semua</span>
                  </label>
                </th>
              )}
              <th className="px-5 py-3">Cat</th>
              <th className="px-5 py-3">Last grooming</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={admin ? 4 : 3}
                  className="px-5 py-8 text-center text-sm text-muted-foreground"
                >
                  Tidak ada kucing.
                </td>
              </tr>
            )}
            {rows.map(({ cat, last }) => (
              <tr
                key={cat.id}
                className="border-b border-border last:border-b-0 hover:bg-muted/20"
              >
                {admin && (
                  <td className="px-5 py-3 align-middle">
                    <label className="flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(cat.id)}
                        onChange={() => toggleOne(cat.id)}
                        className="h-4 w-4 rounded border-input"
                      />
                    </label>
                  </td>
                )}
                <td className="px-5 py-3 align-middle">
                  <Link
                    href={`/cats/${cat.id}`}
                    className="flex items-center gap-3 font-medium text-foreground hover:text-primary"
                  >
                    {cat.photo_url ? (
                      <img
                        src={cat.photo_url}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-medium text-muted-foreground"
                        aria-hidden
                      >
                        {cat.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="flex flex-col gap-0.5">
                      <span>{cat.name}</span>
                      {cat.breed_id && breedsById.get(cat.breed_id)?.name && (
                        <span className="font-elegant text-[0.7rem] italic text-muted-foreground tracking-wide">
                          {breedsById.get(cat.breed_id)!.name}
                        </span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-3 align-middle text-sm text-muted-foreground">
                  {last ? formatDate(new Date(last.date)) : "Belum pernah"}
                </td>
                <td className="px-5 py-3 align-middle text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/cats/${cat.id}`}>Buka</Link>
                    </Button>
                    {admin &&
                      (last ? (
                        <EditGroomingDialog catName={cat.name} log={last} />
                      ) : (
                        <AddGroomingDialog cat={cat} />
                      ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
