import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getSessionProfile, isAdmin } from "@/lib/auth";
import { getHealthScanData } from "@/lib/data/health";
import { HealthTable } from "@/components/health/health-table";
import type { Tables } from "@/lib/types";

type Breed = Tables<"cat_breeds">;

export default async function HealthPage() {
  const supabase = await createSupabaseServerClient();
  const { profile } = await getSessionProfile();
  const admin = isAdmin(profile);

  const [rows, { data: breeds = [] }] = await Promise.all([
    getHealthScanData(supabase),
    supabase
      .from("cat_breeds")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-12 w-full min-w-0">
      <header>
        <h1 className="text-2xl font-medium tracking-tight text-foreground">
          Health
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Vaksin, flea, deworm, sakit, dan berat — semua kucing.
        </p>
      </header>

      <div className="w-full min-w-0">
        <HealthTable rows={rows} breeds={(breeds ?? []) as Breed[]} admin={admin} />
      </div>
    </div>
  );
}
