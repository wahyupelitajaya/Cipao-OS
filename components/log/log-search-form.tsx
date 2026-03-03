"use client";

import { useRef } from "react";

type SortColumn = "created_at" | "action" | "entity_type" | "summary";
type SortOrder = "asc" | "desc";

interface LogSearchFormProps {
  initialQuery?: string;
  initialSort?: SortColumn;
  initialOrder?: SortOrder;
}

const SORT_LABELS: Record<SortColumn, string> = {
  created_at: "Waktu",
  action: "Aksi",
  entity_type: "Entitas",
  summary: "Ringkasan",
};

const ORDER_LABELS: Record<SortOrder, string> = {
  desc: "Terbaru / Z→A",
  asc: "Terlama / A→Z",
};

export function LogSearchForm({
  initialQuery,
  initialSort = "created_at",
  initialOrder = "desc",
}: LogSearchFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      method="get"
      action="/log"
      className="no-print flex flex-wrap items-center gap-2"
    >
      <label htmlFor="log-search" className="sr-only">
        Cari di log
      </label>
      <input
        id="log-search"
        type="search"
        name="q"
        defaultValue={initialQuery ?? ""}
        placeholder="Cari aksi, entitas, atau ringkasan..."
        className="h-9 w-full min-w-[200px] max-w-sm rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-describedby="log-search-hint"
      />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
      >
        Cari
      </button>
      <div className="flex items-center gap-2">
        <label htmlFor="log-sort" className="text-sm text-muted-foreground whitespace-nowrap">
          Urutkan:
        </label>
        <select
          id="log-sort"
          name="sort"
          className="h-9 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          defaultValue={initialSort}
          onChange={() => formRef.current?.requestSubmit()}
          aria-label="Kolom sortir"
        >
          {(Object.keys(SORT_LABELS) as SortColumn[]).map((col) => (
            <option key={col} value={col}>
              {SORT_LABELS[col]}
            </option>
          ))}
        </select>
        <select
          id="log-order"
          name="order"
          className="h-9 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          defaultValue={initialOrder}
          onChange={() => formRef.current?.requestSubmit()}
          aria-label="Urutan sortir"
        >
          {(Object.keys(ORDER_LABELS) as SortOrder[]).map((ord) => (
            <option key={ord} value={ord}>
              {ORDER_LABELS[ord]}
            </option>
          ))}
        </select>
      </div>
      {initialQuery || initialSort !== "created_at" || initialOrder !== "desc" ? (
        <a
          href="/log"
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          Hapus filter
        </a>
      ) : null}
      <p id="log-search-hint" className="w-full text-xs text-muted-foreground">
        Pencarian memfilter berdasarkan kolom Aksi, Entitas, dan Ringkasan. Sortir mengurutkan berdasarkan kolom yang dipilih.
      </p>
    </form>
  );
}
