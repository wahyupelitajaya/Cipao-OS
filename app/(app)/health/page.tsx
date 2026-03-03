import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getSessionProfile, isAdmin } from "@/lib/auth";
import { getHealthScanData, type HealthSortBy, type HealthSortOrder, type HealthTab } from "@/lib/data/health";
import { HealthTable } from "@/components/health/health-table";
import { HealthSortSelect } from "@/components/health/health-sort-select";
import { HealthSearchForm } from "@/components/health/health-search-form";
import type { Tables } from "@/lib/types";

type Breed = Tables<"cat_breeds">;

const SORT_BY_OPTIONS: HealthSortBy[] = ["name", "cat_id", "dob", "weight", "weight_status", "preventive_status", "next_due", "cat_status"];
const ORDER_OPTIONS = ["asc", "desc"] as const;

const VALID_TABS = ["berat", "obatCacing", "obatKutu", "vaksin", "dirawat"] as const;

interface HealthPageProps {
  searchParams?: Promise<{ q?: string; sortBy?: string; order?: string; tab?: string }>;
}

const DEFAULT_SORT_BY_TAB: Record<HealthTab, { sortBy: HealthSortBy; order: HealthSortOrder }> = {
  berat: { sortBy: "weight", order: "asc" },
  obatCacing: { sortBy: "preventive_status", order: "asc" },
  obatKutu: { sortBy: "preventive_status", order: "asc" },
  vaksin: { sortBy: "preventive_status", order: "asc" },
  dirawat: { sortBy: "cat_status", order: "asc" },
};

const SORT_BY_VALID_PER_TAB: Record<HealthTab, HealthSortBy[]> = {
  berat: ["name", "cat_id", "dob", "weight", "weight_status"],
  obatCacing: ["name", "cat_id", "dob", "preventive_status", "next_due"],
  obatKutu: ["name", "cat_id", "dob", "preventive_status", "next_due"],
  vaksin: ["name", "cat_id", "dob", "preventive_status", "next_due"],
  dirawat: ["name", "cat_id", "dob", "cat_status"],
};

function parseSort(search: { sortBy?: string; order?: string }, tab: HealthTab): { sortBy: HealthSortBy; order: HealthSortOrder } {
  const allowed = SORT_BY_VALID_PER_TAB[tab];
  const sortBy = search.sortBy && allowed.includes(search.sortBy as HealthSortBy) ? (search.sortBy as HealthSortBy) : DEFAULT_SORT_BY_TAB[tab].sortBy;
  const order = ORDER_OPTIONS.includes((search.order as HealthSortOrder) ?? "") ? (search.order as HealthSortOrder) : DEFAULT_SORT_BY_TAB[tab].order;
  return { sortBy, order };
}

export default async function HealthPage(props: HealthPageProps) {
  const search = (await props.searchParams) ?? {};
  const q = (search.q ?? "").trim();
  const tabParam = search.tab;
  const initialTab: HealthTab =
    tabParam && VALID_TABS.includes(tabParam as (typeof VALID_TABS)[number])
      ? (tabParam as HealthTab)
      : "berat";
  const { sortBy, order } = parseSort(search, initialTab);

  const supabase = await createSupabaseServerClient();
  const { profile } = await getSessionProfile();
  const admin = isAdmin(profile);

  const [rows, { data: breeds = [] }] = await Promise.all([
    getHealthScanData(supabase, { q: q || undefined, sortBy, order, tab: initialTab }),
    supabase
      .from("cat_breeds")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-12 w-full min-w-0">
      <header className="no-print flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Health
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Vaksin, flea, deworm, sakit, dan berat — semua kucing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <HealthSearchForm defaultValue={q} />
          <Suspense fallback={<span className="text-sm text-muted-foreground">Urutkan: …</span>}>
            <HealthSortSelect />
          </Suspense>
        </div>
      </header>

      <div className="w-full min-w-0">
        <HealthTable
          rows={rows}
          breeds={(breeds ?? []) as Breed[]}
          admin={admin}
          initialTab={initialTab}
          sortBy={sortBy}
          order={order}
        />
      </div>
    </div>
  );
}
