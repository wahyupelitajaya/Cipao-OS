"use client";

import { useRouter, useSearchParams } from "next/navigation";

const VALID_TABS = ["berat", "obatCacing", "obatKutu", "vaksin", "dirawat"] as const;
type TabKey = (typeof VALID_TABS)[number];

type SortChoice = { value: string; label: string; sortBy: string; order: string };

const SORT_BERAT: SortChoice[] = [
  { value: "weight_asc", label: "Berat (rendah → tinggi)", sortBy: "weight", order: "asc" },
  { value: "weight_desc", label: "Berat (tinggi → rendah)", sortBy: "weight", order: "desc" },
  { value: "weight_status_asc", label: "Status (turun dulu)", sortBy: "weight_status", order: "asc" },
  { value: "weight_status_desc", label: "Status (naik dulu)", sortBy: "weight_status", order: "desc" },
  { value: "name_asc", label: "Nama A–Z", sortBy: "name", order: "asc" },
  { value: "name_desc", label: "Nama Z–A", sortBy: "name", order: "desc" },
  { value: "cat_id_asc", label: "ID A–Z", sortBy: "cat_id", order: "asc" },
  { value: "cat_id_desc", label: "ID Z–A", sortBy: "cat_id", order: "desc" },
  { value: "dob_asc", label: "Usia (tertua dulu)", sortBy: "dob", order: "asc" },
  { value: "dob_desc", label: "Usia (termuda dulu)", sortBy: "dob", order: "desc" },
];

const SORT_PREVENTIVE: SortChoice[] = [
  { value: "preventive_status_asc", label: "Status (Terlambat dulu)", sortBy: "preventive_status", order: "asc" },
  { value: "preventive_status_desc", label: "Status (Aman dulu)", sortBy: "preventive_status", order: "desc" },
  { value: "next_due_asc", label: "Jatuh tempo (dekat dulu)", sortBy: "next_due", order: "asc" },
  { value: "next_due_desc", label: "Jatuh tempo (jauh dulu)", sortBy: "next_due", order: "desc" },
  { value: "name_asc", label: "Nama A–Z", sortBy: "name", order: "asc" },
  { value: "name_desc", label: "Nama Z–A", sortBy: "name", order: "desc" },
  { value: "cat_id_asc", label: "ID A–Z", sortBy: "cat_id", order: "asc" },
  { value: "cat_id_desc", label: "ID Z–A", sortBy: "cat_id", order: "desc" },
  { value: "dob_asc", label: "Usia (tertua dulu)", sortBy: "dob", order: "asc" },
  { value: "dob_desc", label: "Usia (termuda dulu)", sortBy: "dob", order: "desc" },
];

const SORT_DIRAWAT: SortChoice[] = [
  { value: "cat_status_asc", label: "Status (Sakit / Memburuk dulu)", sortBy: "cat_status", order: "asc" },
  { value: "cat_status_desc", label: "Status (Sehat dulu)", sortBy: "cat_status", order: "desc" },
  { value: "name_asc", label: "Nama A–Z", sortBy: "name", order: "asc" },
  { value: "name_desc", label: "Nama Z–A", sortBy: "name", order: "desc" },
  { value: "cat_id_asc", label: "ID A–Z", sortBy: "cat_id", order: "asc" },
  { value: "cat_id_desc", label: "ID Z–A", sortBy: "cat_id", order: "desc" },
  { value: "dob_asc", label: "Usia (tertua dulu)", sortBy: "dob", order: "asc" },
  { value: "dob_desc", label: "Usia (termuda dulu)", sortBy: "dob", order: "desc" },
];

function getChoicesForTab(tab: TabKey): SortChoice[] {
  if (tab === "berat") return SORT_BERAT;
  if (tab === "obatCacing" || tab === "obatKutu" || tab === "vaksin") return SORT_PREVENTIVE;
  if (tab === "dirawat") return SORT_DIRAWAT;
  return SORT_BERAT;
}

export function HealthSortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const currentTab: TabKey =
    tabParam && VALID_TABS.includes(tabParam as TabKey) ? (tabParam as TabKey) : "berat";
  const sortBy = searchParams.get("sortBy");
  const order = searchParams.get("order");
  const choices = getChoicesForTab(currentTab);
  const value =
    sortBy && order ? `${sortBy}_${order}` : choices[0]!.value;
  const effectiveValue = choices.some((c) => c.value === value) ? value : choices[0]!.value;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    const chosen = choices.find((c) => c.value === v);
    if (!chosen) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", chosen.sortBy);
    params.set("order", chosen.order);
    router.push(`/health?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="health-sort" className="whitespace-nowrap text-sm text-muted-foreground">
        Urutkan:
      </label>
      <select
        id="health-sort"
        value={effectiveValue}
        onChange={handleChange}
        className="flex h-9 rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {choices.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
