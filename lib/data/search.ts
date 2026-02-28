import type { createSupabaseServerClient } from "@/lib/supabaseClient";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export interface SearchData {
  cats: { id: string; name: string; cat_id: string }[];
  inventoryItems: { id: string; name: string; categoryName: string }[];
}

export async function getSearchData(
  supabase: SupabaseClient
): Promise<SearchData> {
  const [
    { data: catsData = [] },
    { data: categoriesData = [] },
    { data: itemsData = [] },
  ] = await Promise.all([
    supabase
      .from("cats")
      .select("id, name, cat_id")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("inventory_categories")
      .select("id, name")
      .order("sort_order", { ascending: true }),
    supabase
      .from("inventory_items")
      .select("id, name, category_id")
      .order("name", { ascending: true }),
  ]);

  const catList = catsData as { id: string; name: string; cat_id: string }[];
  const categories = categoriesData as { id: string; name: string }[];
  const items = itemsData as { id: string; name: string; category_id: string }[];
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  return {
    cats: catList,
    inventoryItems: items.map((i) => ({
      id: i.id,
      name: i.name,
      categoryName: categoryNameById.get(i.category_id) ?? "",
    })),
  };
}
