"use client";

import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

const VALID_TABS = ["berat", "obatCacing", "obatKutu", "vaksin", "dirawat"] as const;

export function HealthSearchForm({ defaultValue }: { defaultValue: string }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const sortBy = searchParams.get("sortBy") ?? "name";
  const order = searchParams.get("order") ?? "asc";
  const currentTab = tab && VALID_TABS.includes(tab as (typeof VALID_TABS)[number]) ? tab : "berat";

  return (
    <form method="get" className="flex items-center gap-2">
      <input type="hidden" name="tab" value={currentTab} />
      <input type="hidden" name="sortBy" value={sortBy} />
      <input type="hidden" name="order" value={order} />
      <Input
        name="q"
        placeholder="Cari nama atau ID (pisah dengan & untuk beberapa)"
        defaultValue={defaultValue}
        className="w-44"
      />
    </form>
  );
}
