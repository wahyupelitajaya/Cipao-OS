-- =============================================================================
-- RLS Hardening Audit — Sprint #1 Security Hardening
-- =============================================================================
-- This migration verifies and reinforces RLS policies across all tables.
-- It is idempotent (safe to run multiple times).
--
-- POLICY MODEL:
--   admin  → full access (SELECT/INSERT/UPDATE/DELETE) via is_admin()
--   owner  → SELECT only, scoped to own cats and related logs
--   anon   → no access (RLS blocks all)
--
-- Tables audited:
--   profiles, cats, health_logs, weight_logs, grooming_logs,
--   inventory_items, inventory_movements, inventory_categories,
--   cat_breeds, visit_days, daily_activities
-- =============================================================================

-- Ensure RLS is enabled on every table (no-op if already enabled)
alter table public.profiles enable row level security;
alter table public.cats enable row level security;
alter table public.health_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.grooming_logs enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_categories enable row level security;
alter table public.cat_breeds enable row level security;
alter table public.visit_days enable row level security;
alter table public.daily_activities enable row level security;

-- =============================================================================
-- profiles: users read own row; admins read all. No API-level writes.
-- =============================================================================
-- (Existing policy profiles_select_own is sufficient. INSERT/UPDATE/DELETE
--  are only done via Supabase Auth hooks or service role.)

-- =============================================================================
-- cats: admin full, owner SELECT own only
-- =============================================================================
-- Already defined:
--   cats_admin_all (for all, using is_admin(), with check is_admin())
--   cats_owner_select_own (for select, using owner_id = auth.uid())
-- Owner INSERT/UPDATE/DELETE: denied by absence of permissive policy. ✓

-- =============================================================================
-- health_logs: admin full, owner SELECT own cats only
-- =============================================================================
-- Already defined:
--   health_admin_all (for all, using is_admin(), with check is_admin())
--   health_owner_select_own_cats (for select, using cat ownership subquery)
-- Owner INSERT/UPDATE/DELETE: denied. ✓

-- =============================================================================
-- weight_logs: admin full, owner SELECT own cats only
-- =============================================================================
-- Already defined:
--   weight_admin_all (for all, using is_admin(), with check is_admin())
--   weight_owner_select_own_cats (for select, using cat ownership subquery)
-- Owner INSERT/UPDATE/DELETE: denied. ✓

-- =============================================================================
-- grooming_logs: admin full, owner SELECT own cats only
-- =============================================================================
-- Already defined:
--   grooming_admin_all (for all, using is_admin(), with check is_admin())
--   grooming_owner_select_own_cats (for select, using cat ownership subquery)
-- Owner INSERT/UPDATE/DELETE: denied. ✓

-- =============================================================================
-- inventory_items: all authenticated can SELECT, admin can write
-- =============================================================================
-- Already defined:
--   inventory_items_select_all_authenticated (for select, to authenticated)
--   inventory_items_admin_write (for all, using is_admin(), with check is_admin())
-- Owner INSERT/UPDATE/DELETE: denied (no permissive policy). ✓

-- =============================================================================
-- inventory_movements: all authenticated can SELECT, admin can write
-- =============================================================================
-- Already defined:
--   inventory_movements_select_all_authenticated (for select, to authenticated)
--   inventory_movements_admin_write (for all, using is_admin(), with check is_admin())
-- Owner INSERT/UPDATE/DELETE: denied. ✓

-- =============================================================================
-- inventory_categories: all authenticated can SELECT, admin can write
-- =============================================================================
-- Already defined:
--   inventory_categories_select_authenticated (for select, to authenticated)
--   inventory_categories_admin_all (for all, using is_admin(), with check is_admin())
-- Owner INSERT/UPDATE/DELETE: denied. ✓

-- =============================================================================
-- cat_breeds: all authenticated can SELECT, admin can write
-- =============================================================================
-- Already defined:
--   cat_breeds_select_authenticated (for select, to authenticated)
--   cat_breeds_admin_all (for all, using is_admin(), with check is_admin())
-- Owner INSERT/UPDATE/DELETE: denied. ✓

-- =============================================================================
-- visit_days: admin full, all authenticated can SELECT
-- =============================================================================
-- Already defined:
--   visit_days_admin_all (for all, using is_admin(), with check is_admin())
--   visit_days_owner_select (for select, to authenticated, using true)
-- Owner INSERT/UPDATE/DELETE: denied. ✓

-- =============================================================================
-- daily_activities: admin full, owner SELECT (own cats or general activities)
-- =============================================================================
-- Already defined:
--   daily_activities_admin_all (for all, using is_admin(), with check is_admin())
--   daily_activities_owner_select_own_cats (for select, using cat_ids check)
-- Owner INSERT/UPDATE/DELETE: denied. ✓

-- =============================================================================
-- VERIFICATION QUERIES (run manually in Supabase SQL editor)
-- =============================================================================
-- Check that all public tables have RLS enabled:
--
--   SELECT schemaname, tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
--
-- Check all policies:
--
--   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
