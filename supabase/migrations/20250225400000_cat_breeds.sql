-- Tabel jenis kucing (bisa input manual)
create table if not exists public.cat_breeds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Kolom breed_id di cats (opsional)
alter table public.cats
add column if not exists breed_id uuid references public.cat_breeds(id) on delete set null;

-- RLS cat_breeds
alter table public.cat_breeds enable row level security;

drop policy if exists "cat_breeds_select_authenticated" on public.cat_breeds;
create policy "cat_breeds_select_authenticated"
on public.cat_breeds for select to authenticated using (true);

drop policy if exists "cat_breeds_admin_all" on public.cat_breeds;
create policy "cat_breeds_admin_all"
on public.cat_breeds for all using (public.is_admin())
with check (public.is_admin());
