import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getSessionProfile, isAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCat } from "@/app/actions/cats";
import { CatsTable } from "@/components/cats/cats-table";
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

const NEW_CAT_STATUS_OPTIONS = [
  { value: "baik", label: "Baik" },
  { value: "kurang_baik", label: "Kurang Baik" },
  { value: "sakit", label: "Sakit" },
] as const;

const NEW_CAT_LOCATION_OPTIONS = [
  { value: "rumah", label: "Rumah" },
  { value: "toko", label: "Toko" },
  { value: "klinik", label: "Klinik" },
] as const;

function NewCatDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">New cat</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New cat</DialogTitle>
        </DialogHeader>
        <form action={createCat} className="space-y-3 text-sm">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Cat ID
            </label>
            <Input
              name="cat_id"
              placeholder="CAT-032"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              name="name"
              placeholder="Name"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              DoB (optional)
            </label>
            <Input name="dob" type="date" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <select
              name="status"
              className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {NEW_CAT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Lokasi
            </label>
            <select
              name="location"
              className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {NEW_CAT_LOCATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Owner email
              </label>
              <Input
                name="owner_email"
                type="email"
                placeholder="owner@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Owner ID (optional)
              </label>
              <Input
                name="owner_id"
                placeholder="UUID from profiles"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


