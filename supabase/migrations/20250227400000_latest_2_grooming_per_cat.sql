-- View: Latest 2 grooming logs per cat (up to 2 rows per cat, date DESC)
CREATE OR REPLACE VIEW public.latest_2_grooming_per_cat
WITH (security_invoker = true)
AS
  SELECT id, cat_id, date, created_at
  FROM (
    SELECT
      id,
      cat_id,
      date,
      created_at,
      ROW_NUMBER() OVER (PARTITION BY cat_id ORDER BY date DESC, id DESC) AS rn
    FROM public.grooming_logs
  ) t
  WHERE rn <= 2;

GRANT SELECT ON public.latest_2_grooming_per_cat TO authenticated;
