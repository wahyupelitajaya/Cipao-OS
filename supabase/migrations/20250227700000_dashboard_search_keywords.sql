-- Tabel keyword pencarian cerdas dashboard. Urutan tampilan mengikuti sort_order.
create table if not exists public.dashboard_search_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique,
  sort_order int not null default 0
);

comment on table public.dashboard_search_keywords is 'Keyword yang ditampilkan sebagai suggest di pencarian cerdas dashboard.';

-- Seed keyword yang didukung parser (harus cocok dengan parseSmartSearch di dashboard-content).
insert into public.dashboard_search_keywords (keyword, sort_order) values
  ('sakit', 1),
  ('berat naik', 2),
  ('berat turun', 3),
  ('belum grooming', 4),
  ('terlambat vaksin', 5),
  ('terlambat obat cacing', 6),
  ('terlambat tetes kutu', 7),
  ('stok habis', 8),
  ('stok rendah', 9),
  ('butuh di beli', 10),
  ('sehat', 11),
  ('dirawat', 12)
on conflict (keyword) do update set sort_order = excluded.sort_order;

-- Baca keyword untuk semua pengguna terautentikasi (pencarian cerdas dashboard).
alter table public.dashboard_search_keywords enable row level security;

create policy "Allow read dashboard_search_keywords for authenticated"
  on public.dashboard_search_keywords for select
  to authenticated
  using (true);
