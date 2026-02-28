-- Tabel kategori inventory (bisa tambah/hapus kategori)
create table if not exists public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Seed 5 kategori (sesuai enum lama)
insert into public.inventory_categories (slug, name, sort_order)
values
  ('LITTER', 'Pasir / Litter', 1),
  ('FOOD', 'Makanan', 2),
  ('MED_VIT', 'Obat & Vitamin', 3),
  ('GROOMING_TOOL', 'Grooming tool', 4),
  ('OTHER', 'Lainnya', 5)
on conflict (slug) do nothing;

-- Kolom category_id di inventory_items (untuk yang sudah pakai enum)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items' and column_name = 'category'
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'inventory_items' and column_name = 'category_id'
    ) then
      alter table public.inventory_items add column category_id uuid references public.inventory_categories(id);
      update public.inventory_items i
      set category_id = (select c.id from public.inventory_categories c where c.slug = i.category::text limit 1);
      alter table public.inventory_items alter column category_id set not null;
      alter table public.inventory_items drop column category;
    end if;
  end if;
end;
$$;

-- RLS inventory_categories
alter table public.inventory_categories enable row level security;

drop policy if exists "inventory_categories_select_authenticated" on public.inventory_categories;
create policy "inventory_categories_select_authenticated"
on public.inventory_categories for select to authenticated using (true);

drop policy if exists "inventory_categories_admin_all" on public.inventory_categories;
create policy "inventory_categories_admin_all"
on public.inventory_categories for all using (public.is_admin())
with check (public.is_admin());
