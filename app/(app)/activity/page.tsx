import { getSessionProfile, isAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getMonthActivitySummary, getDayActivities } from "@/app/actions/activity";
import { todayISO } from "@/lib/dates";
import { ActivityContent } from "@/components/activity/activity-content";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const { profile } = await getSessionProfile();
  const admin = isAdmin(profile);
  const today = todayISO();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [monthSummary, dayData, catsResult] = await Promise.all([
    getMonthActivitySummary(year, month),
    getDayActivities(today),
    profile
      ? createSupabaseServerClient().then((supabase) =>
          supabase.from("cats").select("id, name").eq("is_active", true).order("name"),
        )
      : Promise.resolve({ data: [] }),
  ]);

  const cats = (catsResult.data ?? []) as { id: string; name: string }[];

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Aktivitas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catatan perawatan harian — kunjungan dan aktivitas per hari.
        </p>
      </header>

      <ActivityContent
        initialMonthSummary={monthSummary}
        initialSelectedDate={today}
        initialActivities={dayData.activities}
        initialVisit={dayData.visit}
        initialYear={year}
        initialMonth={month}
        cats={cats}
        admin={admin}
      />
    </div>
  );
}
