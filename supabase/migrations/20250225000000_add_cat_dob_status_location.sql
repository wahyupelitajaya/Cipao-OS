-- Migration: Add dob, status, location to cats table
-- Run this in Supabase SQL editor if your cats table already exists without these columns.

-- Add columns if they don't exist (safe for existing deployments)
alter table public.cats add column if not exists dob date;
alter table public.cats add column if not exists status text check (status in ('baik', 'kurang_baik', 'sakit'));
alter table public.cats add column if not exists location text check (location in ('rumah', 'toko', 'klinik'));

-- Backfill: map old "Active" (is_active = true) to status 'baik', else 'kurang_baik'
update public.cats
set status = case when is_active then 'baik' else 'kurang_baik' end
where status is null;

-- Default status for any remaining nulls
update public.cats set status = 'baik' where status is null;

-- Default location to 'rumah' where missing
update public.cats set location = 'rumah' where location is null;
