-- Waktu dan lokasi: ubah jadi array (bisa pilih lebih dari satu). cat_ids opsional (aktivitas umum).

-- Kolom baru
alter table public.daily_activities
  add column if not exists time_slots text[] not null default '{}',
  add column if not exists locations text[] not null default '{}';

-- Isi dari kolom lama
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'daily_activities' and column_name = 'time_slot') then
    update public.daily_activities set time_slots = array[time_slot] where time_slot is not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'daily_activities' and column_name = 'location') then
    update public.daily_activities set locations = array[location] where location is not null;
  end if;
end $$;

update public.daily_activities set time_slots = array['Pagi']::text[] where array_length(time_slots, 1) is null or time_slots = '{}';
update public.daily_activities set locations = array['Rumah']::text[] where array_length(locations, 1) is null or locations = '{}';

-- Hapus kolom lama
alter table public.daily_activities drop constraint if exists daily_activities_time_slot_check;
alter table public.daily_activities drop column if exists time_slot;
alter table public.daily_activities drop constraint if exists daily_activities_location_check;
alter table public.daily_activities drop column if exists location;

-- Constraint waktu dan lokasi
alter table public.daily_activities drop constraint if exists daily_activities_time_slots_check;
alter table public.daily_activities add constraint daily_activities_time_slots_check check (
  time_slots <@ array['Pagi','Siang','Sore','Malam']::text[] and array_length(time_slots, 1) >= 1
);
alter table public.daily_activities drop constraint if exists daily_activities_locations_check;
alter table public.daily_activities add constraint daily_activities_locations_check check (
  locations <@ array['Rumah','Toko']::text[] and array_length(locations, 1) >= 1
);

-- RLS: owner boleh baca jika cat_ids kosong (umum) ATAU salah satu kucing punya owner_id
drop policy if exists "daily_activities_owner_select_own_cats" on public.daily_activities;
create policy "daily_activities_owner_select_own_cats"
on public.daily_activities for select using (
  coalesce(array_length(cat_ids, 1), 0) = 0
  or exists (
    select 1 from public.cats c
    where c.id = any(daily_activities.cat_ids) and c.owner_id = auth.uid()
  )
);
