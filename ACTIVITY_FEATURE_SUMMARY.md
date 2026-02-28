# Activity (Daily Care Log) – Summary

## Files changed / added

### Database
- **`supabase/migrations/20250225600000_activity_visit_days_daily_activities.sql`** (new)  
  - `visit_days`: `id`, `date` (unique), `visited`, `note`, `created_at`, `created_by`  
  - `daily_activities`: `id`, `date`, `time` (optional), `cat_id` (FK cats), `activity_type`, `note`, `created_at`, `created_by`  
  - Activity type check: Clean Cage, Nail Trim, Brush, Ear Cleaning, Deworming, Flea Treatment, Bath, Medication Given, General Check, Other  
  - RLS: admin full; owner read-only (visit_days: all rows; daily_activities: only cats they own)

### Lib
- **`lib/types.ts`** – Added `visit_days` and `daily_activities` table row types  
- **`lib/constants.ts`** – Added `ACTIVITY_TYPES` and `ActivityType`  
- **`lib/revalidate.ts`** – Added `revalidateActivity()`

### Server actions
- **`app/actions/activity.ts`** (new)  
  - `getMonthActivitySummary(year, month)` – calendar dots (visited / partial / none)  
  - `getDayActivities(date)` – activities + visit status for one day  
  - `setVisitStatus(date, visited)` – upsert visit_days (admin only)  
  - `addActivity` / `addActivityForm` – insert daily_activities (admin only)

### Navigation
- **`components/layout/nav-links.tsx`** – Added "Activity" link (between Grooming and Inventory)

### Page & components
- **`app/(app)/activity/page.tsx`** (new) – Activity page: header, loads month summary + today’s data + cats, passes to client  
- **`components/activity/activity-content.tsx`** (new) – Client: selected date, month navigation, fetches month/day via actions  
- **`components/activity/activity-calendar.tsx`** (new) – Month grid, green/amber/gray dots, prev/next month, click day to select  
- **`components/activity/activity-day-panel.tsx`** (new) – Selected date label, Visited / Not visited toggle (admin), activity list, "Tambah aktivitas" (admin)  
- **`components/activity/add-activity-dialog.tsx`** (new) – Modal: cat, activity type, time (default now), note; submits via `addActivityForm`

## How to test

1. **Apply migration**  
   In Supabase: run `supabase/migrations/20250225600000_activity_visit_days_daily_activities.sql` (or use `supabase db push` if configured).

2. **Login**  
   Use an **admin** account to test write actions.

3. **Activity page**  
   - Open **Activity** in the sidebar.  
   - Calendar shows current month; today has a selection.  
   - Click a day → right panel shows that day (visit status + activities).  
   - As **admin**: use "Dikunjungi" / "Tidak dikunjungi", then "Tambah aktivitas" (pick cat, type, optional time/note, Simpan).  
   - As **owner**: same page but no toggle and no "Tambah aktivitas" (read-only).

4. **Calendar dots**  
   - **Green** = day marked visited in `visit_days`.  
   - **Amber** = has at least one `daily_activities` row but not marked visited.  
   - **Gray** = no visit and no activities.

5. **Other month**  
   Use ← / → on the calendar to change month; summary and day selection work as above.

## Access control

- **Admin**: full read/write on visit_days and daily_activities.  
- **Owner**: can only read; visit toggle and add-activity are hidden. RLS enforces: owner sees only daily_activities for cats they own.

## UI

- Layout: calendar left (or top on mobile), day panel right (or below).  
- Styling: same as rest of app (Tailwind, calm, minimal).  
- No extra chart libs; calendar is a simple grid + dots.
