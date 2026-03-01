"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EditCatDialog } from "@/components/cats/edit-cat-dialog";
import { Badge } from "@/components/ui/badge";
import { bulkUpdateCats, deleteCat } from "@/app/actions/cats";
import { getFriendlyMessage } from "@/lib/errors";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Tables } from "@/lib/types";
import { CAT_STATUSES, CAT_STATUS_LABELS } from "@/lib/constants";

type Cat = Tables<"cats">;
type Breed = Tables<"cat_breeds">;

const STATUS_OPTIONS = [
  { value: "", label: "—" },
  ...CAT_STATUSES.map((value) => ({ value, label: CAT_STATUS_LABELS[value] })),
];

const LOCATION_OPTIONS = [
  { value: "", label: "—" },
  { value: "rumah", label: "Rumah" },
  { value: "toko", label: "Toko" },
  { value: "klinik", label: "Klinik" },
] as const;

interface CatsTableProps {
  cats: Cat[];
  breeds: Breed[];
  admin: boolean;
  /** Id kucing yang punya perawatan aktif (muncul di tab Dirawat). Jika tidak di list ini = dianggap sehat. */
  activeTreatmentCatIds?: string[];
}

function formatDob(dob: string | null | undefined): string {
  if (!dob) return "-";
  try {
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function formatAge(dob: string | null | undefined): string {
  if (!dob) return "—";
  try {
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return "—";
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years > 0 && months > 0) return `${years} tahun ${months} bulan`;
    if (years > 0) return `${years} tahun`;
    if (months > 0) return `${months} bulan`;
    return "< 1 bulan";
  } catch {
    return "—";
  }
}

function statusLabel(status: Cat["status"]): string {
  if (!status) return "-";
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function locationLabel(location: Cat["location"]): string {
  if (!location) return "-";
  return LOCATION_OPTIONS.find((o) => o.value === location)?.label ?? location;
}

function locationBadgeVariant(
  location: Cat["location"],
): "location_rumah" | "location_toko" | "location_klinik" | "outline" {
  if (location === "rumah") return "location_rumah";
  if (location === "toko") return "location_toko";
  if (location === "klinik") return "location_klinik";
  return "outline";
}

function LocationBadge({ location }: { location: Cat["location"] }) {
  if (!location) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge variant={locationBadgeVariant(location)} className="font-medium">
      {locationLabel(location)}
    </Badge>
  );
}

function StatusBadge({
  cat,
  activeTreatmentCatIds,
}: {
  cat: { id: string; status: Cat["status"] };
  activeTreatmentCatIds?: Set<string>;
}) {
  const inDirawat =
    activeTreatmentCatIds?.has(cat.id) ||
    cat.status === "sakit" ||
    cat.status === "memburuk";
  const displayStatus = inDirawat ? (cat.status ?? "sehat") : "sehat";
  const label = statusLabel(displayStatus);
  const variant =
    ["sehat", "membaik", "memburuk", "hampir_sembuh", "observasi", "sakit"].includes(displayStatus)
      ? displayStatus
      : "sehat";
  return <Badge variant={variant as "sehat" | "membaik" | "memburuk" | "hampir_sembuh" | "observasi" | "sakit"}>{label}</Badge>;
}

function BreedCountSummary({
  cats,
  breeds,
}: {
  cats: Cat[];
  breeds: Breed[];
}) {
  const counts = breeds
    .map((b) => ({
      name: b.name,
      count: cats.filter((c) => c.breed_id === b.id).length,
    }))
    .filter(({ count }) => count > 0);
  const noBreedCount = cats.filter((c) => !c.breed_id).length;

  if (counts.length === 0 && noBreedCount === 0) return null;

  return (
    <div className="font-elegant flex flex-wrap items-baseline gap-x-4 gap-y-1 px-1 py-2 text-sm italic text-foreground">
      {noBreedCount > 0 && (
        <span>
          <span className="text-muted-foreground">Tanpa jenis</span>{" "}
          <span className="font-semibold tabular-nums">{noBreedCount}</span>
        </span>
      )}
      {counts.map(({ name, count }) => (
        <span key={name}>
          <span className="text-muted-foreground">{name}</span>{" "}
          <span className="font-semibold tabular-nums">{count}</span>
        </span>
      ))}
    </div>
  );
}

export function CatsTable({ cats, breeds, admin, activeTreatmentCatIds = [] }: CatsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkLocation, setBulkLocation] = useState("");
  const [bulkBreedId, setBulkBreedId] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const breedsById = new Map(breeds.map((b) => [b.id, b]));
  const activeTreatmentSet = new Set(activeTreatmentCatIds);
  const catToDelete = confirmDeleteId ? cats.find((c) => c.id === confirmDeleteId) : null;

  const allIds = cats.map((c) => c.id);
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
    if (!bulkStatus && !bulkLocation && !bulkBreedId) return;
    setBulkError(null);
    const formData = new FormData();
    formData.set("cat_ids", JSON.stringify(Array.from(selectedIds)));
    if (bulkStatus) formData.set("status", bulkStatus);
    if (bulkLocation) formData.set("location", bulkLocation);
    if (bulkBreedId) formData.set("breed_id", bulkBreedId);
    startTransition(async () => {
      try {
        await bulkUpdateCats(formData);
        setSelectedIds(new Set());
        setBulkBreedId("");
        setBulkStatus("");
        setBulkLocation("");
        router.refresh();
      } catch (err) {
        setBulkError(getFriendlyMessage(err));
      }
    });
  }

  const selectedCount = selectedIds.size;
  const canBulkSubmit =
    selectedCount > 0 && (bulkStatus || bulkLocation || bulkBreedId);

  async function handleConfirmDelete() {
    if (!confirmDeleteId) return;
    setDeleteError(null);
    try {
      const formData = new FormData();
      formData.set("id", confirmDeleteId);
      await deleteCat(formData);
      setConfirmDeleteId(null);
      router.refresh();
    } catch (err) {
      setDeleteError(getFriendlyMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <BreedCountSummary cats={cats} breeds={breeds} />

      {admin && selectedCount > 0 && (
        <form
          onSubmit={handleBulkSubmit}
          className="flex flex-wrap items-center gap-3 rounded-2xl border bg-muted/50 px-4 py-3 text-sm"
        >
          {bulkError && (
            <p className="w-full text-sm text-destructive" role="alert">
              {bulkError}
            </p>
          )}
          <span className="font-medium text-muted-foreground">
            Ubah status / lokasi / jenis untuk {selectedCount} kucing
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="flex h-9 rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "_"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={bulkLocation}
            onChange={(e) => setBulkLocation(e.target.value)}
            className="flex h-9 rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {LOCATION_OPTIONS.map((o) => (
              <option key={o.value || "_"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={bulkBreedId}
            onChange={(e) => setBulkBreedId(e.target.value)}
            className="flex h-9 rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Jenis —</option>
            {breeds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            size="sm"
            disabled={isPending || !canBulkSubmit}
          >
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

      <div className="w-full min-w-0 overflow-auto max-h-[75vh]" style={{ WebkitOverflowScrolling: "touch" }}>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {admin && (
                <th className="w-10 px-2 py-3 text-left">
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
              <th className="px-4 py-3 text-left">Cat</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">
                DoB
              </th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">
                Status
              </th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">
                Lokasi
              </th>
              <th className="px-4 py-3 text-right">Detail</th>
            </tr>
          </thead>
          <tbody>
            {cats.length === 0 && (
              <tr>
                <td
                  colSpan={admin ? 6 : 5}
                  className="px-4 py-6 text-center text-xs text-muted-foreground"
                >
                  No cats found. Adjust your search or add a new cat.
                </td>
              </tr>
            )}
            {cats.map((cat) => (
              <tr
                key={cat.id}
                className="border-b last:border-b-0 hover:bg-muted/40"
              >
                {admin && (
                  <td className="px-2 py-3 align-middle">
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
                <td className="px-4 py-3 align-middle">
                  <Link
                    href={`/cats/${cat.id}?returnTo=/cats`}
                    className="flex items-center gap-3"
                  >
                    {cat.photo_url ? (
                      <img
                        src={cat.photo_url}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-border/60"
                      />
                    ) : (
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/80 text-sm font-medium text-muted-foreground ring-1 ring-border/60"
                        aria-hidden
                      >
                        {cat.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">{cat.name}</span>
                      <span className="font-elegant text-[0.7rem] italic text-muted-foreground tracking-wide">
                        {cat.breed_id && breedsById.get(cat.breed_id)?.name
                          ? breedsById.get(cat.breed_id)!.name
                          : "—"}
                        {" | "}
                        {formatAge(cat.dob)}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 align-middle text-xs text-muted-foreground hidden sm:table-cell">
                  {formatDob(cat.dob)}
                </td>
                <td className="px-4 py-3 align-middle hidden sm:table-cell">
                  <StatusBadge cat={cat} activeTreatmentCatIds={activeTreatmentSet} />
                </td>
                <td className="px-4 py-3 align-middle hidden sm:table-cell">
                  <LocationBadge location={cat.location} />
                </td>
                <td className="px-4 py-3 align-middle text-right text-xs">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/cats/${cat.id}?returnTo=/cats`}
                      className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                    >
                      Open
                    </Link>
                    {admin && (
                      <>
                        <EditCatDialog cat={cat} breeds={breeds} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmDeleteId(cat.id)}
                        >
                          Hapus
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {admin && (
        <ConfirmDialog
          open={confirmDeleteId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmDeleteId(null);
              setDeleteError(null);
            }
          }}
          title="Hapus kucing"
          description={
            catToDelete
              ? `${deleteError ? `${deleteError}\n\n` : ""}Yakin ingin menghapus "${catToDelete.name}"? Semua data health, weight, dan grooming kucing ini akan ikut terhapus.`
              : ""
          }
          confirmLabel="Hapus"
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
