"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SORT_CHOICES: { value: string; label: string }[] = [
  { value: "date_asc", label: "Tanggal grooming (terlama dulu)" },
  { value: "date_desc", label: "Tanggal grooming (terbaru dulu)" },
  { value: "name_asc", label: "Nama A–Z" },
  { value: "name_desc", label: "Nama Z–A" },
];

export function GroomingSortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortBy = searchParams.get("sortBy") ?? "date";
  const order = searchParams.get("order") ?? "asc";
  const value = `${sortBy}_${order}`;

  const effectiveValue = SORT_CHOICES.some((c) => c.value === value) ? value : "date_asc";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    const [newSortBy, newOrder] = v.split("_") as [string, string];
    const params = new URLSearchParams();
    params.set("sortBy", newSortBy);
    params.set("order", newOrder);
    router.push(`/grooming?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="grooming-sort" className="text-sm text-muted-foreground whitespace-nowrap">
        Urutkan:
      </label>
      <select
        id="grooming-sort"
        value={effectiveValue}
        onChange={handleChange}
        className="flex h-9 rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {SORT_CHOICES.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
