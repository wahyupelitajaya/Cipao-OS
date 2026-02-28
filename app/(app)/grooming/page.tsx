import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getSessionProfile, canEditGrooming } from "@/lib/auth";
import type { Tables } from "@/lib/types";
import { GroomingTable } from "@/components/grooming/grooming-table";
import { GroomingSortSelect } from "@/components/grooming/grooming-sort-select";

type Cat = Tables<"cats">;
type Breed = Tables<"cat_breeds">;
type GroomingLog = Tables<"grooming_logs">;

type GroomingSortBy = "date" | "name";
type GroomingSortOrder = "asc" | "desc";

function parseSortParams(search: Record<string, string | undefined>): { sortBy: GroomingSortBy; order: GroomingSortOrder } {
  const sortBy = (search.sortBy === "name" ? "name" : "date") as GroomingSortBy;
  const order = (search.order === "desc" ? "desc" : "asc") as GroomingSortOrder;
  return { sortBy, order };
}

interface GroomingPageProps {
  searchParams?: Promise<{ sortBy?: string; order?: string }>;
}

export default async function GroomingPage(props: GroomingPageProps) {
  const search = (await props.searchParams) ?? {};
  const { sortBy, order } = parseSortParams(search as Record<string, string | undefined>);

  const supabase = await createSupabaseServerClient();
  const { profile } = await getSessionProfile();
  const canEdit = canEditGrooming(profile);

  const [
    { data: cats = [] },
    { data: latestGroomingRows = [] },
    { data: breeds = [] },
  ] = await Promise.all([
    supabase.from("cats").select("*").eq("is_active", true),
    supabase.from("latest_grooming_per_cat").select("id, cat_id, date, created_at"),
    supabase
      .from("cat_breeds")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const lastByCat = new Map<string, GroomingLog | null>();
  (latestGroomingRows as { id: string; cat_id: string; date: string; created_at: string }[]).forEach(
    (row) => {
      lastByCat.set(row.cat_id, {
        id: row.id,
        cat_id: row.cat_id,
        date: row.date,
        created_at: row.created_at,
      } as GroomingLog);
    }
  );

  const rows = (cats as Cat[]).map((cat) => {
    const last = lastByCat.get(cat.id) ?? null;
    return { cat, last };
  });

  rows.sort((a, b) => {
    if (sortBy === "name") {
      const cmp = a.cat.name.localeCompare(b.cat.name, "id");
      return order === "asc" ? cmp : -cmp;
    }
    const aDate = a.last ? new Date(a.last.date).getTime() : 0;
    const bDate = b.last ? new Date(b.last.date).getTime() : 0;
    if (!aDate && !bDate) return a.cat.name.localeCompare(b.cat.name, "id");
    if (!aDate) return order === "asc" ? -1 : 1;
    if (!bDate) return order === "asc" ? 1 : -1;
    return order === "asc" ? aDate - bDate : bDate - aDate;
  });

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Grooming
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sortBy === "date" && order === "asc"
              ? "Urut dari yang paling lama tidak grooming."
              : "Daftar kucing dan tanggal grooming terakhir."}
          </p>
        </div>
        <Suspense fallback={<span className="text-sm text-muted-foreground">Urutkan: …</span>}>
          <GroomingSortSelect />
        </Suspense>
      </header>

      <GroomingTable rows={rows} breeds={(breeds ?? []) as Breed[]} canEdit={canEdit} />
    </div>
  );
}

