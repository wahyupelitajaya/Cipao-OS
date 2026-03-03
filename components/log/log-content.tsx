"use client";

import type { Tables } from "@/lib/types";

type ActivityLogRow = Tables<"activity_log">;

function formatLogDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface LogContentProps {
  logs: ActivityLogRow[];
  /** Query pencarian yang sedang dipakai (untuk pesan saat kosong). */
  query?: string;
}

export function LogContent({ logs, query }: LogContentProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        {query
          ? `Tidak ada log yang cocok dengan "${query}". Coba kata kunci lain atau hapus filter.`
          : "Belum ada riwayat pembaruan."}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {query ? (
        <p className="text-sm text-muted-foreground no-print">
          Menampilkan {logs.length} hasil untuk &quot;{query}&quot;
        </p>
      ) : null}
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 w-40">Waktu</th>
              <th className="px-4 py-3 w-24">Aksi</th>
              <th className="px-4 py-3 w-28">Entitas</th>
              <th className="px-4 py-3">Ringkasan</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border/60 last:border-b-0 hover:bg-muted/20"
              >
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                  {formatLogDate(row.created_at)}
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-muted px-2 py-0.5 font-medium text-foreground">
                    {row.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {row.entity_type ?? "—"}
                  {row.entity_id ? ` · ${row.entity_id.slice(0, 8)}…` : ""}
                </td>
                <td className="px-4 py-2.5 text-foreground">{row.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
