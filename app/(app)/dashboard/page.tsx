import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getDashboardData } from "@/lib/data/dashboard";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const data = await getDashboardData(supabase);
  return <DashboardContent initialData={data} />;
}
