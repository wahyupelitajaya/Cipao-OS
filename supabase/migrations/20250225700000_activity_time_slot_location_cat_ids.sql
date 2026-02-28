-- Activity: waktu (Pagi/Siang/Sore/Malam), lokasi (Rumah/Toko), satu baris per aktivitas dengan banyak kucing (cat_ids)

-- Tambah kolom baru
alter table public.daily_activities
  add column if not exists time_slot text check (time_slot in ('Pagi', 'Siang', 'Sore', 'Malam')),
  add column if not exists location text check (location in ('Rumah', 'Toko')),
  add column if not exists cat_ids uuid[] not null default '{}';

-- Isi data lama: satu kucing per baris -> cat_ids = [cat_id], time_slot/location default
update public.daily_activities
set
  cat_ids = array[cat_id],
  time_slot = coalesce(time_slot, 'Pagi'),
  location = coalesce(location, 'Rumah')
where cat_id is not null;

-- Jadikan time_slot dan location not null (set default untuk sisa)
update public.daily_activities set time_slot = 'Pagi' where time_slot is null;
update public.daily_activities set location = 'Rumah' where location is null;
alter table public.daily_activities
  alter column time_slot set not null,
  alter column time_slot set default 'Pagi',
  alter column location set not null,
  alter column location set default 'Rumah';

-- Hapus policy yang bergantung pada cat_id dulu, baru hapus kolom
drop policy if exists "daily_activities_owner_select_own_cats" on public.daily_activities;

-- Hapus kolom lama
alter table public.daily_activities drop column if exists cat_id;
alter table public.daily_activities drop column if exists time;

-- Indeks untuk cat_ids (opsional, untuk RLS/query)
create index if not exists idx_daily_activities_cat_ids on public.daily_activities using gin (cat_ids);

-- RLS owner: boleh baca jika salah satu cat_ids punya owner_id = auth.uid()
create policy "daily_activities_owner_select_own_cats"
on public.daily_activities
for select
using (
  exists (
    select 1 from public.cats c
    where c.id = any(daily_activities.cat_ids)
      and c.owner_id = auth.uid()
  )
);
