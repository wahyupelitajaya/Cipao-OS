import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getSessionProfile, isAdmin } from "@/lib/auth";
import { getHealthScanData, type HealthSortBy, type HealthSortOrder } from "@/lib/data/health";
import { HealthTable } from "@/components/health/health-table";
import { HealthSortSelect } from "@/components/health/health-sort-select";
import { Input } from "@/components/ui/input";
import type { Tables } from "@/lib/types";

type Breed = Tables<"cat_breeds">;

const SORT_BY_OPTIONS = ["name", "cat_id", "dob"] as const;
const ORDER_OPTIONS = ["asc", "desc"] as const;

interface HealthPageProps {
  searchParams?: Promise<{ q?: string; sortBy?: string; order?: string }>;
}

function parseSort(search: { sortBy?: string; order?: string }): { sortBy: HealthSortBy; order: HealthSortOrder } {
  const sortBy = SORT_BY_OPTIONS.includes((search.sortBy as HealthSortBy) ?? "") ? (search.sortBy as HealthSortBy) : "name";
  const order = ORDER_OPTIONS.includes((search.order as HealthSortOrder) ?? "") ? (search.order as HealthSortOrder) : "asc";
  return { sortBy, order };
}

export default async function HealthPage(props: HealthPageProps) {
  const search = (await props.searchParams) ?? {};
  const q = (search.q ?? "").trim();
  const { sortBy, order } = parseSort(search);

  const supabase = await createSupabaseServerClient();
  const { profile } = await getSessionProfile();
  const admin = isAdmin(profile);

  const [rows, { data: breeds = [] }] = await Promise.all([
    getHealthScanData(supabase, { q: q || undefined, sortBy, order }),
    supabase
      .from("cat_breeds")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-12 w-full min-w-0">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Health
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Vaksin, flea, deworm, sakit, dan berat — semua kucing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <form method="get" className="flex items-center gap-2">
            <Input
              name="q"
              placeholder="Cari nama atau ID kucing…"
              defaultValue={q}
              className="w-44"
            />
          </form>
          <Suspense fallback={<span className="text-sm text-muted-foreground">Urutkan: …</span>}>
            <HealthSortSelect />
          </Suspense>
        </div>
      </header>

      <div className="w-full min-w-0">
        <HealthTable rows={rows} breeds={(breeds ?? []) as Breed[]} admin={admin} />
      </div>
    </div>
  );
}
