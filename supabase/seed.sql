-- Seed data for Cat Operational System
-- IMPORTANT:
-- 1) Create one admin user and one owner user in Supabase Auth.
-- 2) Replace the placeholders below with the actual auth.users IDs.

-- Replace these with real UUIDs from auth.users
-- select id, email from auth.users;
-- Then paste:
--   ADMIN_USER_ID  -> admin
--   OWNER_USER_ID  -> owner (all starter cats belong to this owner)

-- BEGIN PLACEHOLDERS (edit before running)
-- example: '11111111-1111-1111-1111-111111111111'
insert into public.profiles (id, email, role) values
  ('c30eb2f5-7990-46fb-a869-52d1272c1f28', 'admin@example.com', 'admin')
on conflict (id) do update set role = excluded.role, email = excluded.email;

insert into public.profiles (id, email, role) values
  ('303b6caa-fff2-4856-b0dd-44f5fe1011f5', 'owner@example.com', 'owner')
on conflict (id) do update set role = excluded.role, email = excluded.email;
-- END PLACEHOLDERS

-- Starter cats (31)
-- All assigned to 303b6caa-fff2-4856-b0dd-44f5fe1011f5 for MVP.
insert into public.cats (cat_id, name, owner_id, is_active)
values
  ('CAT-001', 'Array', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-002', 'Bara', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-003', 'Bian', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-004', 'Blacky', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-005', 'Bobi', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-006', 'Boodie', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-007', 'Boone', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-008', 'Cantik', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-009', 'Celi', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-010', 'Celo', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-011', 'Chiko', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-012', 'Cici', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-013', 'Ciko', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-014', 'Cimo', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-015', 'Cipao', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-016', 'Gempi', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-017', 'Gian', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-018', 'Inaya', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-019', 'Izaan', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-020', 'Joko', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-021', 'Kino', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-022', 'Kona', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-023', 'Markonah', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-024', 'Mauza', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-025', 'Miki', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-026', 'Miko', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-027', 'Miu', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-028', 'Mochi', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-029', 'Moli', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-030', 'Oreo', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true),
  ('CAT-031', 'Pusi', '303b6caa-fff2-4856-b0dd-44f5fe1011f5', true)
on conflict (cat_id) do nothing;

-- Sample health logs & weight logs for a few cats
-- Use current date context; feel free to adjust.
with cat_ids as (
  select cat_id, id from public.cats where cat_id in ('CAT-001','CAT-002','CAT-003','CAT-004','CAT-005')
)
insert into public.health_logs (cat_id, date, type, title, details, next_due_date, is_active_treatment)
select
  c.id,
  current_date - interval '60 days',
  'VACCINE'::public.health_type,
  'Core vaccine booster',
  'Annual booster',
  current_date + interval '305 days',
  false
from cat_ids c
union all
select
  c.id,
  current_date - interval '20 days',
  'FLEA'::public.health_type,
  'Flea prevention',
  null,
  current_date + interval '10 days',
  false
from cat_ids c
union all
select
  c.id,
  current_date - interval '10 days',
  'DEWORM'::public.health_type,
  'Deworming',
  null,
  current_date + interval '80 days',
  false
from cat_ids c
union all
select
  c.id,
  current_date - interval '5 days',
  'ILLNESS'::public.health_type,
  'Mild diarrhea',
  'Monitoring at home',
  null,
  true
from cat_ids c
limit 12;

-- Example: CAT-001 has a FLEA log due within 7 days (for Health Overview due-soon highlight).
insert into public.health_logs (cat_id, date, type, title, next_due_date, is_active_treatment)
select id, current_date - interval '14 days', 'FLEA'::public.health_type, 'Flea due soon', current_date + interval '5 days', false
from public.cats where cat_id = 'CAT-001'
limit 1;

-- Example: CAT-006 has an overdue VACCINE next_due_date (for Health Overview overdue highlight).
insert into public.health_logs (cat_id, date, type, title, next_due_date, is_active_treatment)
select id, current_date - interval '400 days', 'VACCINE'::public.health_type, 'Annual vaccine (overdue)', current_date - interval '14 days', false
from public.cats where cat_id = 'CAT-006'
limit 1;

with cat_ids as (
  select cat_id, id from public.cats where cat_id in ('CAT-001','CAT-002','CAT-003','CAT-004','CAT-005')
)
insert into public.weight_logs (cat_id, date, weight_kg)
select
  c.id,
  current_date - interval '30 days',
  4.20
from cat_ids c
union all
select
  c.id,
  current_date - interval '3 days',
  3.70
from cat_ids c
limit 8;

with cat_ids as (
  select cat_id, id from public.cats where cat_id in ('CAT-001','CAT-002','CAT-003','CAT-004','CAT-005')
)
insert into public.grooming_logs (cat_id, date)
select
  c.id,
  current_date - interval '14 days'
from cat_ids c
limit 5;

-- Sample inventory
insert into public.inventory_items (category, name, stock_qty, unit, min_stock_qty)
values
  ('LITTER', 'Clumping litter 10kg', 4, 'bag', 2),
  ('LITTER', 'Silica gel litter 5kg', 1, 'bag', 2),
  ('FOOD', 'Dry food adult 10kg', 3, 'bag', 2),
  ('FOOD', 'Wet food pouch', 24, 'pcs', 12),
  ('MED_VIT', 'Flea spot-on', 2, 'pipette', 4),
  ('MED_VIT', 'Deworming tablet', 6, 'tablet', 4)
on conflict (name) do nothing;

with items as (
  select id, name from public.inventory_items
)
insert into public.inventory_movements (item_id, date, change_qty, reason, note)
select id, current_date - interval '5 days', 5, 'PURCHASE'::public.inventory_movement_reason, 'Initial stock'
from items
where name in ('Dry food adult 10kg','Wet food pouch')
union all
select id, current_date - interval '2 days', -2, 'USAGE'::public.inventory_movement_reason, 'Daily feeding'
from items
where name in ('Dry food adult 10kg','Wet food pouch')
limit 4;

