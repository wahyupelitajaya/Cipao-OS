-- Activity: visit_days and daily_activities for Daily Care Log

-- visit_days: one row per date (YYYY-MM-DD), explicit visited flag
create table if not exists public.visit_days (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  visited boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index if not exists idx_visit_days_date on public.visit_days (date);

-- daily_activities: activity log per date/cat
create table if not exists public.daily_activities (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time time,
  cat_id uuid not null references public.cats (id) on delete cascade,
  activity_type text not null check (activity_type in (
    'Clean Cage',
    'Nail Trim',
    'Brush',
    'Ear Cleaning',
    'Deworming',
    'Flea Treatment',
    'Bath',
    'Medication Given',
    'General Check',
    'Other'
  )),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index if not exists idx_daily_activities_date on public.daily_activities (date);
create index if not exists idx_daily_activities_cat_id on public.daily_activities (cat_id);

-- RLS
alter table public.visit_days enable row level security;
alter table public.daily_activities enable row level security;

-- visit_days: admin full access; owner read-only (all rows, for calendar view)
drop policy if exists "visit_days_admin_all" on public.visit_days;
create policy "visit_days_admin_all"
on public.visit_days
for all
using (is_admin())
with check (is_admin());

drop policy if exists "visit_days_owner_select" on public.visit_days;
create policy "visit_days_owner_select"
on public.visit_days
for select
to authenticated
using (true);

-- daily_activities: admin full; owner can only select (via cats they own)
drop policy if exists "daily_activities_admin_all" on public.daily_activities;
create policy "daily_activities_admin_all"
on public.daily_activities
for all
using (is_admin())
with check (is_admin());

drop policy if exists "daily_activities_owner_select_own_cats" on public.daily_activities;
create policy "daily_activities_owner_select_own_cats"
on public.daily_activities
for select
using (
  exists (
    select 1
    from public.cats c
    where c.id = daily_activities.cat_id
      and c.owner_id = auth.uid()
  )
);
