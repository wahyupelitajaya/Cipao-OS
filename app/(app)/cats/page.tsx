import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getSessionProfile, isAdmin } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { CatsTable } from "@/components/cats/cats-table";
import { NewCatDialog } from "@/components/cats/new-cat-dialog";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Tables } from "@/lib/types";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

type Cat = Tables<"cats">;
type Breed = Tables<"cat_breeds">;

interface CatsPageProps {
  searchParams?: Promise<{ q?: string; page?: string; pageSize?: string }>;
}

export default async function CatsPage(props: CatsPageProps) {
  const search = (await props.searchParams) ?? {};
  const q = (search.q ?? "").trim();
  const page = Math.max(1, parseInt(search.page ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(search.pageSize ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();
  const { profile } = await getSessionProfile();

  let query = supabase
    .from("cats")
    .select("*", { count: "exact" })
    .order("cat_id", { ascending: true })
    .range(from, to);
  if (q) {
    query = query.or(`name.ilike.%${q}%,cat_id.ilike.%${q}%`) as typeof query;
  }
  const { data: cats = [], count: totalCount = 0 } = await query;

  const { data: breeds = [] } = await supabase
    .from("cat_breeds")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const admin = isAdmin(profile);

  const paginationSearchParams: Record<string, string> = {};
  if (q) paginationSearchParams.q = q;
  if (pageSize !== DEFAULT_PAGE_SIZE) paginationSearchParams.pageSize = String(pageSize);

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Cats
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Cari dan kelola kucing. Klik untuk buka profil.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <form method="get" className="flex items-center gap-2">
            <input type="hidden" name="page" value="1" />
            <Input
              name="q"
              placeholder="Cari nama atau ID…"
              defaultValue={q}
              className="w-44"
            />
          </form>
          {admin && <NewCatDialog />}
        </div>
      </header>

      <CatsTable cats={(cats ?? []) as Cat[]} breeds={(breeds ?? []) as Breed[]} admin={admin} />

      <PaginationBar
        totalCount={totalCount ?? 0}
        page={page}
        pageSize={pageSize}
        basePath="/cats"
        searchParams={paginationSearchParams}
      />
    </div>
  );
}


