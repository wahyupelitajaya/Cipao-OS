-- Seed data for Cat Operational System
-- IMPORTANT:
-- 1) Create admin, owner, groomer users in Supabase Auth (Authentication → Users).
-- 2) Replace the placeholders below with the actual auth.users IDs (id from auth.users).

-- Replace with real UUIDs from auth.users (select id, email from auth.users;)
--   ADMIN_USER_ID_PLACEHOLDER  → wahyu@admin.sb   (admin)
--   2d64eb80-1497-4ce3-9935-9ef0336de54d  → cc@owner.sb      (owner, all starter cats belong to this owner)
--   GROOMER_USER_ID_PLACEHOLDER → ivan@groomer.sb (groomer)

insert into public.profiles (id, email, role) values
  ('8894f890-be44-4108-adc6-68d3259df35f', 'wahyu@admin.sb', 'admin')
on conflict (id) do update set role = excluded.role, email = excluded.email;

insert into public.profiles (id, email, role) values
  ('2d64eb80-1497-4ce3-9935-9ef0336de54d', 'cc@owner.sb', 'owner')
on conflict (id) do update set role = excluded.role, email = excluded.email;

insert into public.profiles (id, email, role) values
  ('011b4588-eb39-4c09-a6dd-93e864e7a3fb', 'ivan@groomer.sb', 'groomer')
on conflict (id) do update set role = excluded.role, email = excluded.email;

-- Starter cats (31)
-- All assigned to 2d64eb80-1497-4ce3-9935-9ef0336de54d (replace with owner's UUID).
-- NOTE: Seed only inserts cat_id, name, owner_id, is_active. Columns photo_url, dob,
-- status, location, status_manual, breed_id are NOT set. After restore from seed (e.g.
-- after cascade delete), photos and optional fields will be empty — fill via app or restore backup.
insert into public.cats (cat_id, name, owner_id, is_active)
values
  ('CAT-001', 'Array', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-002', 'Bara', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-003', 'Bian', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-004', 'Blacky', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-005', 'Bobi', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-006', 'Boodie', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-007', 'Boone', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-008', 'Cantik', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-009', 'Celi', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-010', 'Celo', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-011', 'Chiko', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-012', 'Cici', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-013', 'Ciko', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-014', 'Cimo', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-015', 'Cipao', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-016', 'Gempi', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-017', 'Gian', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-018', 'Inaya', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-019', 'Izaan', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-020', 'Joko', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-021', 'Kino', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-022', 'Kona', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-023', 'Markonah', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-024', 'Mauza', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-025', 'Miki', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-026', 'Miko', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-027', 'Miu', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-028', 'Mochi', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-029', 'Moli', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-030', 'Oreo', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true),
  ('CAT-031', 'Pusi', '2d64eb80-1497-4ce3-9935-9ef0336de54d', true)
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

-- Sample inventory (butuh inventory_categories dari migration 20250225300000)
insert into public.inventory_items (category_id, name, stock_qty, unit, min_stock_qty)
select c.id, v.name, v.stock_qty, v.unit, v.min_stock_qty
from (values
  ('Clumping litter 10kg', 4::numeric, 'bag', 2::numeric, 'LITTER'),
  ('Silica gel litter 5kg', 1::numeric, 'bag', 2::numeric, 'LITTER'),
  ('Dry food adult 10kg', 3::numeric, 'bag', 2::numeric, 'FOOD'),
  ('Wet food pouch', 24::numeric, 'pcs', 12::numeric, 'FOOD'),
  ('Flea spot-on', 2::numeric, 'pipette', 4::numeric, 'MED_VIT'),
  ('Deworming tablet', 6::numeric, 'tablet', 4::numeric, 'MED_VIT')
) as v(name, stock_qty, unit, min_stock_qty, slug)
join public.inventory_categories c on c.slug = v.slug
where not exists (select 1 from public.inventory_items i where i.name = v.name);

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

