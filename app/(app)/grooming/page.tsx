import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getSessionProfile, isAdmin } from "@/lib/auth";
import type { Tables } from "@/lib/types";
import { GroomingTable } from "@/components/grooming/grooming-table";

type Cat = Tables<"cats">;
type Breed = Tables<"cat_breeds">;
type GroomingLog = Tables<"grooming_logs">;

export default async function GroomingPage() {
  const supabase = await createSupabaseServerClient();
  const { profile } = await getSessionProfile();
  const admin = isAdmin(profile);

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
    const aDate = a.last ? new Date(a.last.date).getTime() : 0;
    const bDate = b.last ? new Date(b.last.date).getTime() : 0;
    if (!aDate && !bDate) return a.cat.name.localeCompare(b.cat.name);
    if (!aDate) return -1;
    if (!bDate) return 1;
    return aDate - bDate; // oldest first
  });

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Grooming
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Urut dari yang paling lama tidak grooming.
        </p>
      </header>

      <GroomingTable rows={rows} breeds={(breeds ?? []) as Breed[]} admin={admin} />
    </div>
  );
}

