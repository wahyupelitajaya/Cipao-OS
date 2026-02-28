# Performance & Query Efficiency (Sprint #3)

Summary of optimizations applied without changing business logic or UI behavior.

---

## 1. Dashboard optimization

**Before**
- Fetched all rows from `health_logs`, `weight_logs`, `grooming_logs`.
- Selected limited columns from `health_logs` and `inventory_items`, but still full tables for weight and grooming.
- In-memory sort/filter to get “latest per cat” for grooming and “last 2” for weight.

**After**
- **Cats**: `select("id, name, cat_id, status, location, photo_url")` — only columns needed for cards.
- **Health**: Uses view `latest_preventive_per_cat_type` (max 3 rows per cat: VACCINE, FLEA, DEWORM) plus a small query `health_logs` with `select("cat_id")` and `is_active_treatment = true` for the active-treatment flag.
- **Weight**: Uses view `latest_2_weight_logs_per_cat` (max 2 rows per cat).
- **Grooming**: Uses view `latest_grooming_per_cat` (1 row per cat).
- **Inventory**: Unchanged; already limited to `id, name, stock_qty, min_stock_qty, unit`.

**Query count**
- Before: 5 parallel queries (cats, health_logs, weight_logs, grooming_logs, inventory_items), with full tables for health/weight/grooming.
- After: 6 parallel queries (cats, latest_preventive_per_cat_type, health_logs for active treatment only, latest_2_weight_logs_per_cat, latest_grooming_per_cat, inventory_items), with bounded row counts per cat.

**Data volume**
- Health: from “all health_logs” to “at most 3 preventive rows per cat” + one `cat_id` per cat with active treatment.
- Weight: from “all weight_logs” to “at most 2 rows per cat”.
- Grooming: from “all grooming_logs” to “1 row per cat”.

---

## 2. Health overview optimization

**Before**
- Loaded all `health_logs` and all `weight_logs`, then in JS picked latest preventive per type and last 2 weights per cat.

**After**
- **Preventive**: Uses view `latest_preventive_per_cat_type` (latest log per cat per type VACCINE/FLEA/DEWORM).
- **Active treatment**: Single query `health_logs` with `select("cat_id")` and `is_active_treatment = true`.
- **Weight**: Uses view `latest_2_weight_logs_per_cat`.

Same UI and `buildStatusSuggestion` behavior; only the data source and row counts change.

---

## 3. Grooming page optimization

**Before**
- Fetched all `grooming_logs`, sorted by date desc in JS, then took first log per `cat_id`.

**After**
- Single query to view `latest_grooming_per_cat` (DISTINCT ON per cat, 1 row per cat). No full-table fetch, no in-memory sort.

---

## 4. Pagination

**Cats page**
- Optional `page` and `pageSize` (default 20) in URL.
- Query uses `select("*", { count: "exact" }).range(from, to)` so one request returns the page and total count.
- Search `q` is applied in the same query; pagination links preserve `q` and `pageSize`.

**Reports page**
- Same `page` / `pageSize` (default 20).
- New `getReportsPageData()` in `lib/data/reports.ts`: fetches only the current page of cats (with optional `q`), then fetches health/weight only for those cat IDs via views and filtered `health_logs` (active treatment).
- No full-table load of health_logs or weight_logs for the index page.

---

## 5. Index audit and new indexes

Migration: `supabase/migrations/20250226400000_performance_indexes_and_views.sql`

**Indexes added**
- `idx_health_logs_cat_type_next_due` on `health_logs (cat_id, type, next_due_date)` WHERE `next_due_date IS NOT NULL` — for preventive and due-date filters.
- `idx_weight_logs_cat_date_desc` on `weight_logs (cat_id, date DESC, id DESC)` — for “latest N per cat”.
- `idx_grooming_logs_cat_date_desc` on `grooming_logs (cat_id, date DESC, id DESC)` — for “latest per cat”.
- `idx_inventory_movements_item_date_desc` on `inventory_movements (item_id, date DESC)` — for per-item history.

---

## 6. N+1 audit

**Result**: No N+1 patterns found.

- Dashboard, health, and reports use `Promise.all` (or equivalent) of a fixed set of queries; no `supabase.from(...)` inside loops over cats.
- Loops are only used to aggregate already-fetched data in memory (e.g. building maps by `cat_id`).
- Reports page fetches one page of cats, then one batched set of health/weight for those cat IDs (`.in("cat_id", catIds)`).

---

## 7. Views added (same migration)

- **latest_grooming_per_cat**: `DISTINCT ON (cat_id)` on `grooming_logs`, ordered by `date DESC` — one row per cat.
- **latest_2_weight_logs_per_cat**: `ROW_NUMBER() OVER (PARTITION BY cat_id ORDER BY date DESC, id DESC)`, filter `rn <= 2` — up to 2 rows per cat.
- **latest_preventive_per_cat_type**: `DISTINCT ON (cat_id, type)` on `health_logs` where `type IN ('VACCINE','FLEA','DEWORM')`, ordered by `date DESC` — up to 3 rows per cat.

All views use `security_invoker = true` so RLS on the underlying tables still applies.

---

## Remaining scaling considerations

1. **Dashboard / health**  
   Still load one row per active cat from cats and from the views. For very large numbers of cats (e.g. hundreds), consider:
   - Caching dashboard payload per user/role.
   - Or limiting to “recent” or “favorite” cats and loading the rest on demand.

2. **Reports index**  
   Pagination and per-page health/weight fetch make the reports index scale with page size, not total cats. Remaining cost is the initial cats count query with optional `q` filter; indexes on `cats` for that filter (e.g. name, cat_id, location) could help if the table grows.

3. **Single-cat report**  
   `/reports/[catId]` was not changed; it still loads that cat’s data only. No change needed for this sprint.

4. **Activity / visit_days / daily_activities**  
   Not modified in this sprint; any future scaling work (e.g. by date range or limit) can follow the same pattern: targeted columns, views or indexed filters, and pagination where appropriate.

---

## Quick verification (behavior unchanged)

1. **Dashboard**: Open `/dashboard` — cat cards show correct preventive due dates, weight, last grooming, low-stock panel; no missing or wrong data.
2. **Health**: Open `/health` — table matches previous “latest vaccine/flea/deworm and last 2 weights” and status suggestions.
3. **Grooming**: Open `/grooming` — each cat shows correct “last grooming” date; order (oldest first) unchanged.
4. **Cats**: Open `/cats`, then `/cats?page=2` (if you have >20 cats) — list and search work; “Sebelumnya”/“Selanjutnya” and “Menampilkan X–Y dari Z” are correct.
5. **Reports**: Open `/reports`, then `/reports?page=2` — list and search work; pagination and status badges match previous behavior.

Apply the migration (`20250226400000_performance_indexes_and_views.sql`) before testing so views and indexes exist.
