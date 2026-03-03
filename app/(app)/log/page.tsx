import { redirect } from "next/navigation";
import { getSessionProfile, isAdmin } from "@/lib/auth";
import { getActivityLogsForPage } from "@/app/actions/activity-log";
import { LogContent } from "@/components/log/log-content";
import { LogSearchForm } from "@/components/log/log-search-form";

const SORT_COLUMNS = ["created_at", "action", "entity_type", "summary"] as const;
const SORT_ORDERS = ["desc", "asc"] as const;

type PageProps = { searchParams: Promise<{ q?: string; sort?: string; order?: string }> };

export default async function LogPage({ searchParams }: PageProps) {
  const { session, profile } = await getSessionProfile();
  if (!session) redirect("/login");
  if (!isAdmin(profile)) redirect("/dashboard");

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() || undefined : undefined;
  const sort =
    typeof params.sort === "string" && SORT_COLUMNS.includes(params.sort as (typeof SORT_COLUMNS)[number])
      ? (params.sort as (typeof SORT_COLUMNS)[number])
      : "created_at";
  const order =
    typeof params.order === "string" && SORT_ORDERS.includes(params.order as (typeof SORT_ORDERS)[number])
      ? (params.order as (typeof SORT_ORDERS)[number])
      : "desc";
  const logs = await getActivityLogsForPage(300, q, sort, order);

  return (
    <div className="space-y-4">
      <header className="no-print">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Log</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Riwayat pembaruan di website. Hanya admin yang dapat mengakses.
        </p>
      </header>
      <LogSearchForm initialQuery={q} initialSort={sort} initialOrder={order} />
      <LogContent logs={logs} query={q} />
    </div>
  );
}
