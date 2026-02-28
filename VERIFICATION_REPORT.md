# Full Functional & Technical Verification Report — Cipao OS

**Date:** 2025-02-25  
**Scope:** Authentication, Cat Management, Health Logs, Status Logic, Weight Logs, Grooming, Inventory, Dashboard

---

## 1) Test Summary

| Area | Verification Method | Result |
|------|---------------------|--------|
| **Authentication** | Code review: middleware, login page, auth helpers | Login/logout, redirectTo, requireAdmin verified. No issues. |
| **Cat Management** | Actions + validation + revalidate | createCat/updateCat/acceptSuggestedStatus validated; duplicate cat_id handled; update 0-rows and bulk update feedback added. |
| **Health Logs** | Actions + validation (type, date, next_due) | addHealthLog, setNextDueDate, bulk flows validated; setNextDueDate update-by-logId now checks row affected. |
| **Status Logic** | lib/cat-status.ts + dashboard computeCatStatus | buildStatusSuggestion and dashboard alerts use same constants (DUE_SOON_DAYS); edge cases (no logs, missing next_due_date) handled. |
| **Weight Logs** | getWeightKg (min/max), weight drop >10% | Validation in place; WEIGHT_MAX_KG=50. |
| **Grooming** | bulkSetGroomingDate payload + update by (logId, catId) | Payload validated; update now scoped by cat_id and checks row affected. |
| **Inventory** | adjustInventoryStock reason + date + negative stock | Reason enum validated; optional date validated (invalid throws); negative stock prevented with clear error. |
| **Dashboard** | Alerts, overdue, due-soon, summary counts | Uses DUE_SOON_DAYS and NOTIFICATION_WINDOW_DAYS; Link/div type error fixed. |
| **Revalidation** | revalidateCat / revalidateCats | revalidateCats now includes /health, /grooming, /reports so new cats appear everywhere. |
| **UI / Types** | EditCatDialog breeds prop, dashboard Wrapper | Cat profile & health table pass breeds; dashboard uses explicit Link vs div to satisfy TypeScript. |

---

## 2) Bugs Found

| # | Severity | Description |
|---|----------|-------------|
| 1 | **Major** | `setNextDueDate`: When updating by `logId`, the update was not checked for affected rows. If `logId` was wrong or didn’t match `catId`, the action could “succeed” without updating anything. |
| 2 | **Major** | **Negative inventory stock**: `adjustInventoryStock` allowed negative `change_qty` without checking current stock, so stock could go negative. |
| 3 | **Major** | **Revalidation gap**: `revalidateCats()` only revalidated `/cats` and `/dashboard`. After creating a cat, `/health` and `/grooming` (and reports) could show stale data. |
| 4 | **Major** | **Bulk update feedback**: `bulkUpdateCats` did not verify how many rows were updated. Invalid or RLS-filtered IDs could lead to silent partial success. |
| 5 | **Major** | **Bulk grooming update**: When updating by `logId`, the update was not scoped by `cat_id` and did not check that a row was updated, allowing wrong-log updates or silent no-op. |
| 6 | **Minor** | **Invalid inventory date**: Optional `date` in `adjustInventoryStock` could be invalid; code fell back to today without throwing. Now throws "Format tanggal tidak valid." when a value is provided but invalid. |
| 7 | **Minor** | **Dashboard magic numbers**: "7" and "14" days were hardcoded. Replaced with `DUE_SOON_DAYS` and `NOTIFICATION_WINDOW_DAYS`. |
| 8 | **Critical (build)** | **EditCatDialog missing `breeds`**: Cat profile page and health table used `<EditCatDialog cat={c} />` without `breeds`, causing TypeScript error. |
| 9 | **Critical (build)** | **Dashboard Link/div type**: `Wrapper` was conditionally `Link \| "div"` with spread props; when `Wrapper` was `Link`, `href` could be undefined, causing type error. |

---

## 3) Fixes Applied

1. **setNextDueDate** (`app/actions/logs.ts`): After update by `logId`, use `.select("id").maybeSingle()` and throw "Log kesehatan tidak ditemukan." if no row updated.
2. **adjustInventoryStock** (`app/actions/inventory.ts`): For negative `delta`, fetch current `stock_qty`; if `currentStock + delta < 0`, throw a clear error. Validate optional `date`: if provided and invalid, throw "Format tanggal tidak valid."; use `dateFinal` (valid date or today) for insert.
3. **revalidateCats** (`lib/revalidate.ts`): Add `revalidatePath("/health")`, `revalidatePath("/grooming")`, `revalidatePath("/reports")`.
4. **bulkUpdateCats** (`app/actions/cats.ts`): Use `.select("id")` after update; if `updatedCount === 0` throw "Tidak ada kucing yang diubah..."; if `updatedCount < catIds.length` throw "Hanya X dari Y kucing yang diubah...".
5. **bulkSetGroomingDate** (`app/actions/logs.ts`): When updating by `logId`, add `.eq("cat_id", catId)` and `.select("id").maybeSingle()`; throw "Log grooming tidak ditemukan." if no row updated.
6. **Dashboard constants** (`lib/constants.ts`, `components/dashboard/dashboard-content.tsx`): Add `NOTIFICATION_WINDOW_DAYS = 14`; use `DUE_SOON_DAYS` and `NOTIFICATION_WINDOW_DAYS` in dashboard logic and reason text.
7. **Cat profile page** (`app/(app)/cats/[catId]/page.tsx`): Fetch `cat_breeds` and pass `breeds` to `<EditCatDialog cat={c} breeds={...} />`.
8. **Health table** (`components/health/health-table.tsx`): Pass `breeds` to `<EditCatDialog cat={cat} breeds={breeds} />`.
9. **Dashboard alerts/notifications** (`components/dashboard/dashboard-content.tsx`): Replace dynamic `Wrapper` + spread with explicit `alert.href ? <Link href={...}>...</Link> : <div>...</div>` (and same for notifications) to fix Link `href` type.

---

## 4) Code Changes (Files Modified)

| File | Changes |
|------|---------|
| `app/actions/logs.ts` | setNextDueDate: verify updated row when updating by logId. bulkSetGroomingDate: scope update by cat_id, select and throw if no row. |
| `app/actions/inventory.ts` | Negative stock check before insert; optional date validation (throw if invalid); use `dateFinal` in insert. |
| `app/actions/cats.ts` | bulkUpdateCats: select("id") after update; throw if 0 or partial updates. |
| `lib/revalidate.ts` | revalidateCats: add /health, /grooming, /reports. |
| `lib/constants.ts` | Add NOTIFICATION_WINDOW_DAYS = 14. |
| `components/dashboard/dashboard-content.tsx` | Import DUE_SOON_DAYS, NOTIFICATION_WINDOW_DAYS; replace magic 7/14; fix priority alerts and recent notifications to use explicit Link vs div. |
| `app/(app)/cats/[catId]/page.tsx` | Fetch cat_breeds; pass breeds to EditCatDialog. |
| `components/health/health-table.tsx` | Pass breeds to EditCatDialog. |

---

## 5) Remaining Risks (if any)

- **Bulk grooming partial failure**: If one item in `bulkSetGroomingDate` fails mid-loop, earlier items are already persisted (no transaction). Consider documenting as best-effort or implementing a Postgres transaction/RPC to roll back on failure.
- **Inventory race**: The negative-stock check is a read then insert; under high concurrency, two requests could both pass the check and then both insert, leading to negative stock. A DB constraint (e.g. `CHECK (stock_qty >= 0)`) or serializable transaction would eliminate this; currently mitigated by app-level check and clear error message.
- **Dashboard “today”**: `today` in the dashboard is memoized with `[]`, so it is fixed at mount time; if the user leaves the tab open across midnight, “today” is stale until refresh. Low impact; optional fix: don’t memoize `today` or use a short TTL.

---

## 6) Final Stability Assessment (0–100)

**Score: 88/100**

- **Correctness**: Critical and major bugs (silent no-op updates, negative stock, revalidation gaps, missing props, type errors) are fixed. Validation (enum, dates, weight range) and feedback (0 rows, partial bulk) are in place.
- **Reliability**: Auth, redirectTo, and admin checks are consistent; server actions throw with clear messages instead of silent returns.
- **Deductions**: No automated E2E tests run in this verification (-5); bulk grooming remains best-effort (-4); inventory race window remains (-3).

---

**Build:** `npm run build` completes successfully (Next.js 16.1.6, TypeScript clean).
