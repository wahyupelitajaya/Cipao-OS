-- Add role 'groomer': same read access as owner, can edit grooming (grooming_logs).
-- Groomer sees cats where owner_id = auth.uid() and can INSERT/UPDATE/DELETE grooming_logs for those cats.

-- 1. Allow 'groomer' in profiles.role
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'owner', 'groomer'));

-- 2. Helper: is_groomer()
create or replace function public.is_groomer()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'groomer'
  );
$$;

-- 3. Grooming logs: groomer can insert/update/delete for cats they "own" (owner_id = auth.uid())
drop policy if exists "grooming_groomer_write_own_cats" on public.grooming_logs;
create policy "grooming_groomer_write_own_cats"
on public.grooming_logs
for all
using (
  is_groomer()
  and exists (
    select 1
    from public.cats c
    where c.id = grooming_logs.cat_id
      and c.owner_id = auth.uid()
  )
)
with check (
  is_groomer()
  and exists (
    select 1
    from public.cats c
    where c.id = grooming_logs.cat_id
      and c.owner_id = auth.uid()
  )
);
