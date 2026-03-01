-- Schema for Cat Operational System
-- Run this in your Supabase project's SQL editor.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('admin', 'owner', 'groomer')),
  created_at timestamptz not null default now()
);

-- Helper function: is_admin()
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- Helper function: is_groomer() — can edit grooming for own cats (owner_id = auth.uid())
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

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'health_type') then
    create type public.health_type as enum (
      'VACCINE',
      'FLEA',
      'DEWORM',
      'ILLNESS',
      'MEDICATION',
      'CLINIC',
      'NOTE'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'inventory_category') then
    create type public.inventory_category as enum (
      'LITTER',
      'FOOD',
      'MED_VIT',
      'GROOMING_TOOL',
      'OTHER'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'inventory_movement_reason') then
    create type public.inventory_movement_reason as enum (
      'PURCHASE',
      'USAGE',
      'ADJUSTMENT'
    );
  end if;
end;
$$;

-- Cats
create table if not exists public.cats (
  id uuid primary key default gen_random_uuid(),
  cat_id text not null unique,
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  dob date,
  status text check (status in ('sehat', 'membaik', 'memburuk', 'hampir_sembuh', 'observasi', 'sakit')),
  location text check (location in ('rumah', 'toko', 'klinik')),
  status_manual text,
  is_active boolean not null default true,
  photo_url text,
  treatment_notes text,
  is_contagious boolean,
  created_at timestamptz not null default now()
);

-- Health logs
create table if not exists public.health_logs (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  date date not null,
  type public.health_type not null,
  title text not null,
  details text,
  next_due_date date,
  is_active_treatment boolean not null default false,
  created_at timestamptz not null default now()
);

-- Weight logs
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,2) not null,
  created_at timestamptz not null default now()
);

-- Grooming logs
create table if not exists public.grooming_logs (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now()
);

-- Inventory items
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  category public.inventory_category not null,
  name text not null,
  stock_qty numeric(10,2) not null default 0,
  unit text not null,
  min_stock_qty numeric(10,2),
  created_at timestamptz not null default now()
);

-- Inventory movements
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  date date not null,
  change_qty numeric(10,2) not null,
  reason public.inventory_movement_reason not null,
  note text,
  created_at timestamptz not null default now()
);

-- Trigger to keep inventory_items.stock_qty in sync
create or replace function public.handle_inventory_movement()
returns trigger
language plpgsql
as $$
begin
  update public.inventory_items
  set stock_qty = stock_qty + new.change_qty
  where id = new.item_id;
  return new;
end;
$$;

drop trigger if exists inventory_movement_stock on public.inventory_movements;

create trigger inventory_movement_stock
after insert on public.inventory_movements
for each row
execute function public.handle_inventory_movement();

-- RLS
alter table public.profiles enable row level security;
alter table public.cats enable row level security;
alter table public.health_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.grooming_logs enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

-- Profiles RLS: users can read their own profile; admins can read all.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id or is_admin());

-- Cats RLS
drop policy if exists "cats_admin_all" on public.cats;
create policy "cats_admin_all"
on public.cats
for all
using (is_admin())
with check (is_admin());

drop policy if exists "cats_owner_select_own" on public.cats;
create policy "cats_owner_select_own"
on public.cats
for select
using (owner_id = auth.uid());

drop policy if exists "cats_groomer_select_all" on public.cats;
create policy "cats_groomer_select_all"
on public.cats for select
using (is_groomer());

-- Health logs RLS
drop policy if exists "health_admin_all" on public.health_logs;
create policy "health_admin_all"
on public.health_logs
for all
using (is_admin())
with check (is_admin());

drop policy if exists "health_owner_select_own_cats" on public.health_logs;
create policy "health_owner_select_own_cats"
on public.health_logs
for select
using (
  exists (
    select 1
    from public.cats c
    where c.id = health_logs.cat_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "health_groomer_select_all" on public.health_logs;
create policy "health_groomer_select_all"
on public.health_logs for select
using (is_groomer());

-- Weight logs RLS
drop policy if exists "weight_admin_all" on public.weight_logs;
create policy "weight_admin_all"
on public.weight_logs
for all
using (is_admin())
with check (is_admin());

drop policy if exists "weight_owner_select_own_cats" on public.weight_logs;
create policy "weight_owner_select_own_cats"
on public.weight_logs
for select
using (
  exists (
    select 1
    from public.cats c
    where c.id = weight_logs.cat_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "weight_groomer_select_all" on public.weight_logs;
create policy "weight_groomer_select_all"
on public.weight_logs for select
using (is_groomer());

-- Grooming logs RLS
drop policy if exists "grooming_admin_all" on public.grooming_logs;
create policy "grooming_admin_all"
on public.grooming_logs
for all
using (is_admin())
with check (is_admin());

drop policy if exists "grooming_owner_select_own_cats" on public.grooming_logs;
create policy "grooming_owner_select_own_cats"
on public.grooming_logs
for select
using (
  exists (
    select 1
    from public.cats c
    where c.id = grooming_logs.cat_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "grooming_groomer_write_own_cats" on public.grooming_logs;
drop policy if exists "grooming_groomer_all" on public.grooming_logs;
create policy "grooming_groomer_all"
on public.grooming_logs for all
using (is_groomer())
with check (is_groomer());

-- Inventory items RLS
drop policy if exists "inventory_items_select_all_authenticated" on public.inventory_items;
create policy "inventory_items_select_all_authenticated"
on public.inventory_items
for select
to authenticated
using (true);

drop policy if exists "inventory_items_admin_write" on public.inventory_items;
create policy "inventory_items_admin_write"
on public.inventory_items
for all
using (is_admin())
with check (is_admin());

-- Inventory movements RLS
drop policy if exists "inventory_movements_select_all_authenticated" on public.inventory_movements;
create policy "inventory_movements_select_all_authenticated"
on public.inventory_movements
for select
to authenticated
using (true);

drop policy if exists "inventory_movements_admin_write" on public.inventory_movements;
create policy "inventory_movements_admin_write"
on public.inventory_movements
for all
using (is_admin())
with check (is_admin());

