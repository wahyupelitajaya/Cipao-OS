-- Performance: indexes and views for dashboard, health, grooming, and inventory queries.
-- Reduces full-table scans and enables efficient "latest per entity" queries.

-- =============================================================================
-- INDEXES
-- =============================================================================

-- health_logs: filter by cat + type, sort by next_due_date (dashboard/health)
CREATE INDEX IF NOT EXISTS idx_health_logs_cat_type_next_due
  ON public.health_logs (cat_id, type, next_due_date)
  WHERE next_due_date IS NOT NULL;

-- weight_logs: "latest N per cat" (dashboard/health)
CREATE INDEX IF NOT EXISTS idx_weight_logs_cat_date_desc
  ON public.weight_logs (cat_id, date DESC, id DESC);

-- grooming_logs: "latest per cat" (dashboard/grooming page)
CREATE INDEX IF NOT EXISTS idx_grooming_logs_cat_date_desc
  ON public.grooming_logs (cat_id, date DESC, id DESC);

-- inventory_movements: history per item (reports/audit)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_date_desc
  ON public.inventory_movements (item_id, date DESC);

-- =============================================================================
-- VIEW: Latest grooming log per cat (one row per cat)
-- =============================================================================
CREATE OR REPLACE VIEW public.latest_grooming_per_cat
WITH (security_invoker = true)
AS
  SELECT DISTINCT ON (cat_id)
    id,
    cat_id,
    date,
    created_at
  FROM public.grooming_logs
  ORDER BY cat_id, date DESC, id DESC;

-- Grant for authenticated (RLS on grooming_logs applies via security_invoker)
GRANT SELECT ON public.latest_grooming_per_cat TO authenticated;

-- =============================================================================
-- VIEW: Latest 2 weight logs per cat (up to 2 rows per cat)
-- =============================================================================
CREATE OR REPLACE VIEW public.latest_2_weight_logs_per_cat
WITH (security_invoker = true)
AS
  SELECT id, cat_id, date, weight_kg, created_at
  FROM (
    SELECT
      id,
      cat_id,
      date,
      weight_kg,
      created_at,
      ROW_NUMBER() OVER (PARTITION BY cat_id ORDER BY date DESC, id DESC) AS rn
    FROM public.weight_logs
  ) t
  WHERE rn <= 2;

GRANT SELECT ON public.latest_2_weight_logs_per_cat TO authenticated;

-- =============================================================================
-- VIEW: Latest preventive log per cat per type (VACCINE, FLEA, DEWORM) — 3 rows per cat max
-- =============================================================================
CREATE OR REPLACE VIEW public.latest_preventive_per_cat_type
WITH (security_invoker = true)
AS
  SELECT DISTINCT ON (cat_id, type)
    id,
    cat_id,
    date,
    type,
    title,
    next_due_date,
    is_active_treatment,
    created_at
  FROM public.health_logs
  WHERE type IN ('VACCINE', 'FLEA', 'DEWORM')
  ORDER BY cat_id, type, date DESC, id DESC;

GRANT SELECT ON public.latest_preventive_per_cat_type TO authenticated;
