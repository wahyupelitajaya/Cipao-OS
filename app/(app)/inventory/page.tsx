import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getSessionProfile, isAdmin } from "@/lib/auth";
import type { Tables } from "@/lib/types";
import { InventoryContent } from "@/components/inventory/inventory-content";

type InventoryCategory = Tables<"inventory_categories">;
type InventoryItem = Tables<"inventory_items">;

function getStockStatus(item: InventoryItem): "ok" | "low" | "out" {
  const stock = Number(item.stock_qty);
  const min = item.min_stock_qty != null ? Number(item.min_stock_qty) : null;
  if (min == null) return stock <= 0 ? "out" : "ok";
  if (stock <= 0) return "out";
  if (stock <= min) return "low";
  return "ok";
}

export default async function InventoryPage() {
  const supabase = await createSupabaseServerClient();
  const { profile } = await getSessionProfile();
  const admin = isAdmin(profile);

  const [
    { data: categories = [] },
    { data: items = [] },
  ] = await Promise.all([
    supabase
      .from("inventory_categories")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("inventory_items")
      .select("*")
      .order("name", { ascending: true }),
  ]);

  const catList = categories as InventoryCategory[];
  const itemList = items as InventoryItem[];
  const byCategoryId = new Map<string, InventoryItem[]>();
  for (const item of itemList) {
    const list = byCategoryId.get(item.category_id) ?? [];
    list.push(item);
    byCategoryId.set(item.category_id, list);
  }

  const lowCount = itemList.filter((i) => getStockStatus(i) === "low").length;
  const outCount = itemList.filter((i) => getStockStatus(i) === "out").length;

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Inventory
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stok per kategori. Admin dapat kelola kategori dan item.
        </p>
      </header>

      <InventoryContent
        categories={catList}
        items={itemList}
        admin={admin}
        lowCount={lowCount}
        outCount={outCount}
      />
    </div>
  );
}
