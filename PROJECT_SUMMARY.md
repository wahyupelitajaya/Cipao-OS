# Cat Operational System — Technical Summary

---

## 1. PROJECT OVERVIEW

### What the System Does

Cat Operational System ("Cipao OS") is a web-based management platform for tracking the health, grooming, inventory, and daily care activities of a multi-cat household/cattery. It provides a centralized dashboard, per-cat health records, preventive care scheduling, inventory tracking with low-stock alerts, daily activity logging with a calendar view, and printable per-cat reports.

### Who the Users Are

| Role    | Description                                                                 |
|---------|-----------------------------------------------------------------------------|
| `admin` | Full read-write access. Can create/edit cats, log health/grooming/activities, manage inventory, accept status suggestions. |
| `owner` | Read-only access scoped to their own cats. Can view dashboards, health, grooming, inventory (read), and reports for cats they own. |

There is currently one admin user and one owner user seeded in the database. All 31 starter cats belong to the single owner.

### Core Purpose

Provide a structured operational system to:
1. Track preventive care (vaccines, flea treatment, deworming) with due-date scheduling and overdue alerts.
2. Monitor cat health status with automated suggestions ("Needs Attention", "Monitor", "Healthy").
3. Log daily visit activities (cleaning, grooming, nail trimming, etc.) on a calendar.
4. Manage supply inventory with stock movements and low-stock warnings.
5. Generate printable per-cat health reports.

### Main Workflows

1. **Cat Management** — Admin creates cats with ID, name, owner, DOB, breed, status, location. Cats can be bulk-updated.
2. **Health Logging** — Admin adds health logs (vaccine, flea, deworm, illness, medication, clinic visit, note). Each log can have a `next_due_date` for scheduling. Bulk operations supported.
3. **Weight Tracking** — Admin logs weight; system detects >10% weight drops as critical.
4. **Grooming Tracking** — Admin logs grooming dates; bulk "set date for all" supported.
5. **Preventive Care Monitoring** — Health overview page shows vaccine/flea/deworm status per cat with color-coded overdue/due-soon indicators.
6. **Daily Activity Logging** — Admin marks days as "visited", adds activities with time slots, locations, categories, and optional cat assignments.
7. **Inventory Management** — Admin creates categories and items, adjusts stock via movements (purchase/usage/adjustment). Trigger auto-updates stock quantity.
8. **Status Suggestion** — System computes suggested health status per cat based on overdue items, active treatments, and weight drops. Admin can "accept" the suggestion.
9. **Reports** — Print-friendly per-cat pages showing weight history, preventive care, last grooming, illness history, active treatments, and health timeline.

---

## 2. TECH STACK

| Layer              | Technology                                                   |
|--------------------|--------------------------------------------------------------|
| Frontend Framework | **Next.js 16.1.6** (App Router, React 19.2.3, TypeScript 5) |
| Backend            | **Next.js Server Actions** (no separate API server; all mutations are `"use server"` functions) |
| Database           | **Supabase** (PostgreSQL with Row Level Security)            |
| Authentication     | **Supabase Auth** — email + password login (not magic link)  |
| ORM / Client       | **@supabase/supabase-js 2.49.1** + **@supabase/ssr 0.5.2** for SSR cookie handling |
| Styling            | **Tailwind CSS 4** with CSS variables for design tokens      |
| UI Components      | **shadcn/ui** pattern — hand-rolled components using Radix UI primitives (`@radix-ui/react-dialog`), `class-variance-authority`, `clsx`, `tailwind-merge` |
| Icons              | **lucide-react 0.469.0**                                     |
| Command Palette    | **cmdk 1.0.4**                                               |
| Hosting            | **Vercel** (inferred from `.vercel` in `.gitignore`, standard Next.js deployment) |
| Language           | **TypeScript** (strict mode)                                 |

### Key Libraries

- `@supabase/ssr` — Server-side Supabase client with cookie-based session management
- `@radix-ui/react-dialog` — Accessible dialog primitives
- `cmdk` — Command menu (global search, `Cmd+K`)
- `class-variance-authority` — Component variant management
- `clsx` + `tailwind-merge` — Conditional class merging

---

## 3. FOLDER STRUCTURE

```
cat-operational-system/
├── app/
│   ├── layout.tsx                    # Root layout (fonts, metadata "Cipao OS", global CSS)
│   ├── globals.css                   # CSS variables, design tokens, print styles
│   ├── (auth)/                       # Public auth routes (no app shell)
│   │   ├── layout.tsx                # Minimal wrapper
│   │   ├── page.tsx                  # Root "/" — redirects to /login or /dashboard
│   │   └── login/
│   │       └── page.tsx              # Client-side login form (email + password)
│   ├── auth/
│   │   └── logout/
│   │       └── route.ts             # GET route handler — signs out, redirects to /login
│   ├── (app)/                        # Protected app routes (wrapped in AppShell)
│   │   ├── layout.tsx                # App layout with sidebar shell
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # Dashboard server component
│   │   │   └── types.ts             # Dashboard data types
│   │   ├── cats/
│   │   │   ├── page.tsx              # Cat list with search, bulk actions
│   │   │   └── [catId]/
│   │   │       └── page.tsx          # Individual cat profile page
│   │   ├── health/
│   │   │   └── page.tsx              # Health overview (preventive care grid)
│   │   ├── grooming/
│   │   │   └── page.tsx              # Grooming overview (sorted by oldest groomed)
│   │   ├── inventory/
│   │   │   └── page.tsx              # Inventory management by category
│   │   ├── activity/
│   │   │   └── page.tsx              # Daily activity calendar + day panel
│   │   └── reports/
│   │       ├── page.tsx              # Reports index (cat list with status)
│   │       └── [catId]/
│   │           └── page.tsx          # Print-friendly per-cat report
│   └── actions/                      # Server Actions (all "use server")
│       ├── cats.ts                   # Cat CRUD, bulk update, status suggestion accept
│       ├── logs.ts                   # Health logs, weight logs, grooming logs, bulk preventive
│       ├── activity.ts               # Activity CRUD, visit day management, month summary
│       ├── inventory.ts              # Inventory items, categories, stock adjustments
│       └── breeds.ts                 # Cat breed CRUD
├── components/
│   ├── layout/
│   │   ├── shell.tsx                 # AppShell: sidebar + header + command palette
│   │   ├── nav-links.tsx             # Sidebar navigation items (7 tabs)
│   │   └── logout-button.tsx         # Logout link component
│   ├── ui/                           # shadcn-style primitives
│   │   ├── button.tsx                # Button with variants (default, ghost, outline, etc.)
│   │   ├── input.tsx                 # Input component
│   │   ├── dialog.tsx                # Dialog (Radix)
│   │   ├── badge.tsx                 # Badge with status/location color variants
│   │   ├── textarea.tsx              # Textarea component
│   │   └── command.tsx               # Command palette (Cmd+K global search)
│   ├── dashboard/
│   │   └── dashboard-content.tsx     # Summary cards, priority alerts, low stock, medical care
│   ├── cats/
│   │   ├── cats-table.tsx            # Cat list table with search/bulk actions
│   │   ├── edit-cat-dialog.tsx       # Dialog for editing cat
│   │   ├── edit-cat-form.tsx         # Edit form (name, DOB, breed, status, location, photo)
│   │   └── breeds-table.tsx          # Breed management table
│   ├── health/
│   │   ├── health-table.tsx          # Health overview grid (vaccine/flea/deworm per cat)
│   │   ├── set-next-due-dialog.tsx   # Set next preventive due date
│   │   └── set-last-date-dialog.tsx  # Set last administered date
│   ├── grooming/
│   │   ├── grooming-table.tsx        # Grooming log table with bulk update
│   │   ├── add-grooming-dialog.tsx   # Add grooming log
│   │   └── edit-grooming-dialog.tsx  # Edit grooming date
│   ├── activity/
│   │   ├── activity-content.tsx      # Activity page container
│   │   ├── activity-calendar.tsx     # Month calendar with day status indicators
│   │   ├── activity-day-panel.tsx    # Day detail: visit toggle, activities list, add/delete
│   │   └── add-activity-dialog.tsx   # Add activity form (time slots, locations, categories)
│   ├── inventory/
│   │   └── delete-item-button.tsx    # Delete confirmation button
│   └── reports/
│       └── reports-search.tsx        # Search form for reports page
├── lib/
│   ├── supabaseClient.ts            # Server Component Supabase client (cookie read-only)
│   ├── supabaseBrowserClient.ts      # Browser Supabase client (for login form)
│   ├── supabaseRouteHandlerClient.ts # Route Handler Supabase client (for logout)
│   ├── auth.ts                       # getSessionProfile(), isAdmin()
│   ├── action-auth.ts                # requireAdmin() for server actions
│   ├── env.ts                        # Validated env vars (SUPABASE_URL, SUPABASE_ANON_KEY)
│   ├── constants.ts                  # All domain constants, enums, labels, business rules
│   ├── types.ts                      # TypeScript Database type (mirrors Supabase schema)
│   ├── validation.ts                 # FormData parsing, type validators, safe redirect check
│   ├── revalidate.ts                 # Path revalidation helpers per domain
│   ├── cat-status.ts                 # Status suggestion engine (Needs Attention / Monitor / Healthy)
│   ├── dates.ts                      # Date parsing, formatting, overdue/due-soon checks
│   ├── utils.ts                      # cn() — Tailwind class merging utility
│   └── data/
│       ├── dashboard.ts              # getDashboardData() — aggregates all dashboard info
│       ├── health.ts                 # getHealthScanData() — health overview per cat
│       └── search.ts                 # Search data for command palette
├── supabase/
│   ├── schema.sql                    # Full database schema (tables, enums, triggers, RLS)
│   ├── seed.sql                      # Seed data (2 users, 31 cats, sample logs, sample inventory)
│   └── migrations/                   # Incremental migrations (14 files)
├── middleware.ts                      # Auth middleware: redirects unauthenticated to /login
├── package.json                      # Dependencies and scripts
├── tailwind.config.ts                # Tailwind config with design tokens
├── tsconfig.json                     # TypeScript strict config with @/* path alias
├── postcss.config.mjs                # PostCSS with Tailwind
└── eslint.config.mjs                 # ESLint config
```

### Component Organization Pattern

- **`components/ui/`** — Generic, reusable primitives (button, input, dialog, badge). Built using shadcn/ui conventions with `class-variance-authority` for variants.
- **`components/{domain}/`** — Feature-specific components grouped by domain (cats, health, grooming, activity, inventory, dashboard, reports). Each folder contains table/list components, dialog forms, and action buttons.
- **`components/layout/`** — App-wide layout (shell, navigation, logout).

---

## 4. DATABASE STRUCTURE

### Enums (PostgreSQL)

| Enum Name                    | Values                                                          |
|------------------------------|-----------------------------------------------------------------|
| `health_type`                | `VACCINE`, `FLEA`, `DEWORM`, `ILLNESS`, `MEDICATION`, `CLINIC`, `NOTE` |
| `inventory_category`         | `LITTER`, `FOOD`, `MED_VIT`, `GROOMING_TOOL`, `OTHER`          |
| `inventory_movement_reason`  | `PURCHASE`, `USAGE`, `ADJUSTMENT`                               |

### Functions

| Function       | Returns   | Description                                                  |
|----------------|-----------|--------------------------------------------------------------|
| `is_admin()`   | `boolean` | Security definer. Returns true if `auth.uid()` has role `admin` in `profiles` table. Used in all RLS policies. |

### Triggers

| Trigger                      | Table                 | Event         | Function                        | Description |
|------------------------------|-----------------------|---------------|---------------------------------|-------------|
| `inventory_movement_stock`   | `inventory_movements` | AFTER INSERT  | `handle_inventory_movement()`   | Adds `change_qty` to the parent `inventory_items.stock_qty`. |

---

### Table: `profiles`

| Column       | Type         | Constraints                        |
|--------------|--------------|------------------------------------|
| `id`         | `uuid`       | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| `email`      | `text`       | NOT NULL, UNIQUE                   |
| `role`       | `text`       | NOT NULL, CHECK (`admin` or `owner`) |
| `created_at` | `timestamptz`| NOT NULL, DEFAULT `now()`          |

**RLS:** Users can SELECT their own row; admins can SELECT all rows.

---

### Table: `cats`

| Column         | Type      | Constraints                                           |
|----------------|-----------|-------------------------------------------------------|
| `id`           | `uuid`    | PK, DEFAULT `gen_random_uuid()`                       |
| `cat_id`       | `text`    | NOT NULL, UNIQUE (human-readable ID like "CAT-001")   |
| `name`         | `text`    | NOT NULL                                              |
| `owner_id`     | `uuid`    | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE       |
| `dob`          | `date`    | Nullable                                              |
| `status`       | `text`    | CHECK (`baik`, `kurang_baik`, `sakit`)                |
| `location`     | `text`    | CHECK (`rumah`, `toko`, `klinik`)                     |
| `status_manual`| `text`    | Nullable (stores accepted suggested status like "Needs Attention") |
| `is_active`    | `boolean` | NOT NULL, DEFAULT `true`                              |
| `photo_url`    | `text`    | Nullable (Supabase Storage public URL)                |
| `breed_id`     | `uuid`    | Nullable, FK → `cat_breeds(id)` ON DELETE SET NULL    |
| `created_at`   | `timestamptz` | NOT NULL, DEFAULT `now()`                         |

**RLS:**
- Admin: full access (all operations)
- Owner: SELECT only where `owner_id = auth.uid()`

---

### Table: `cat_breeds`

| Column       | Type         | Constraints                       |
|--------------|--------------|-----------------------------------|
| `id`         | `uuid`       | PK, DEFAULT `gen_random_uuid()`   |
| `name`       | `text`       | NOT NULL, UNIQUE (index)          |
| `sort_order` | `int`        | NOT NULL, DEFAULT `0`             |
| `created_at` | `timestamptz`| NOT NULL, DEFAULT `now()`         |

**Seeded breeds:** Domestic, BSH, Maine Coon, Ragdoll, Bengal, Abyssinian, Persia, Scottish Fold.

**RLS:** Authenticated users can SELECT; admin can do all operations.

---

### Table: `health_logs`

| Column                | Type               | Constraints                                     |
|-----------------------|--------------------|-------------------------------------------------|
| `id`                  | `uuid`             | PK, DEFAULT `gen_random_uuid()`                 |
| `cat_id`              | `uuid`             | NOT NULL, FK → `cats(id)` ON DELETE CASCADE     |
| `date`                | `date`             | NOT NULL (when the event occurred)              |
| `type`                | `health_type` enum | NOT NULL                                        |
| `title`               | `text`             | NOT NULL                                        |
| `details`             | `text`             | Nullable                                        |
| `next_due_date`       | `date`             | Nullable (scheduling for preventive care)       |
| `is_active_treatment` | `boolean`          | NOT NULL, DEFAULT `false`                       |
| `created_at`          | `timestamptz`      | NOT NULL, DEFAULT `now()`                       |

**RLS:**
- Admin: full access
- Owner: SELECT only for cats they own (via subquery on `cats.owner_id`)

**Key behavior:** The `next_due_date` field is the basis for overdue/due-soon logic. For preventive types (VACCINE, FLEA, DEWORM), the system finds the latest health log of that type and checks its `next_due_date` against today.

---

### Table: `weight_logs`

| Column       | Type            | Constraints                                 |
|--------------|-----------------|---------------------------------------------|
| `id`         | `uuid`          | PK, DEFAULT `gen_random_uuid()`             |
| `cat_id`     | `uuid`          | NOT NULL, FK → `cats(id)` ON DELETE CASCADE |
| `date`       | `date`          | NOT NULL                                    |
| `weight_kg`  | `numeric(5,2)`  | NOT NULL                                    |
| `created_at` | `timestamptz`   | NOT NULL, DEFAULT `now()`                   |

**RLS:** Admin full; owner SELECT own cats.

---

### Table: `grooming_logs`

| Column       | Type         | Constraints                                 |
|--------------|--------------|---------------------------------------------|
| `id`         | `uuid`       | PK, DEFAULT `gen_random_uuid()`             |
| `cat_id`     | `uuid`       | NOT NULL, FK → `cats(id)` ON DELETE CASCADE |
| `date`       | `date`       | NOT NULL                                    |
| `created_at` | `timestamptz`| NOT NULL, DEFAULT `now()`                   |

**RLS:** Admin full; owner SELECT own cats.

---

### Table: `inventory_categories`

| Column       | Type         | Constraints                       |
|--------------|--------------|-----------------------------------|
| `id`         | `uuid`       | PK, DEFAULT `gen_random_uuid()`   |
| `slug`       | `text`       | NOT NULL, UNIQUE                  |
| `name`       | `text`       | NOT NULL                          |
| `sort_order` | `int`        | NOT NULL, DEFAULT `0`             |
| `created_at` | `timestamptz`| NOT NULL, DEFAULT `now()`         |

**Seeded:** LITTER ("Pasir / Litter"), FOOD ("Makanan"), MED_VIT ("Obat & Vitamin"), GROOMING_TOOL ("Grooming tool"), OTHER ("Lainnya").

**RLS:** Authenticated SELECT; admin all.

---

### Table: `inventory_items`

| Column          | Type            | Constraints                                           |
|-----------------|-----------------|-------------------------------------------------------|
| `id`            | `uuid`          | PK, DEFAULT `gen_random_uuid()`                       |
| `category_id`   | `uuid`          | NOT NULL, FK → `inventory_categories(id)`             |
| `name`          | `text`          | NOT NULL                                              |
| `stock_qty`     | `numeric(10,2)` | NOT NULL, DEFAULT `0`                                 |
| `unit`          | `text`          | NOT NULL (e.g., "bag", "pcs", "pipette", "tablet")    |
| `min_stock_qty` | `numeric(10,2)` | Nullable (threshold for low-stock alerts)             |
| `created_at`    | `timestamptz`   | NOT NULL, DEFAULT `now()`                             |

**Note:** `stock_qty` is automatically kept in sync by the `inventory_movement_stock` trigger. The application never directly updates `stock_qty`; it inserts into `inventory_movements` instead.

**RLS:** Authenticated SELECT; admin all.

---

### Table: `inventory_movements`

| Column       | Type                          | Constraints                                     |
|--------------|-------------------------------|-------------------------------------------------|
| `id`         | `uuid`                        | PK, DEFAULT `gen_random_uuid()`                 |
| `item_id`    | `uuid`                        | NOT NULL, FK → `inventory_items(id)` ON DELETE CASCADE |
| `date`       | `date`                        | NOT NULL                                        |
| `change_qty` | `numeric(10,2)`               | NOT NULL (positive = add, negative = subtract)  |
| `reason`     | `inventory_movement_reason`   | NOT NULL (PURCHASE, USAGE, ADJUSTMENT)          |
| `note`       | `text`                        | Nullable                                        |
| `created_at` | `timestamptz`                 | NOT NULL, DEFAULT `now()`                       |

**RLS:** Authenticated SELECT; admin all.

---

### Table: `visit_days`

| Column       | Type         | Constraints                                   |
|--------------|--------------|-----------------------------------------------|
| `id`         | `uuid`       | PK, DEFAULT `gen_random_uuid()`               |
| `date`       | `date`       | NOT NULL, UNIQUE                              |
| `visited`    | `boolean`    | NOT NULL, DEFAULT `true`                      |
| `note`       | `text`       | Nullable                                      |
| `created_at` | `timestamptz`| NOT NULL, DEFAULT `now()`                     |
| `created_by` | `uuid`       | Nullable, FK → `auth.users(id)` ON DELETE SET NULL |

**Indexes:** `idx_visit_days_date` on `date`.

**RLS:** Admin full; all authenticated users can SELECT (for calendar view).

---

### Table: `daily_activities`

| Column         | Type         | Constraints                                                   |
|----------------|--------------|---------------------------------------------------------------|
| `id`           | `uuid`       | PK, DEFAULT `gen_random_uuid()`                               |
| `date`         | `date`       | NOT NULL                                                      |
| `time_slots`   | `text[]`     | NOT NULL, DEFAULT `'{}'`, CHECK subset of `{Pagi,Siang,Sore,Malam}`, min 1 |
| `locations`    | `text[]`     | NOT NULL, DEFAULT `'{}'`, CHECK subset of `{Rumah,Toko}`, min 1 |
| `categories`   | `text[]`     | NOT NULL, DEFAULT `'{}'` (multi-select: Bersih-Bersih, Potong Kuku, Grooming, Ngepel, Ganti Filter Tempat Minum) |
| `cat_ids`      | `uuid[]`     | NOT NULL, DEFAULT `'{}'` (optional; empty = general activity) |
| `activity_type`| `text`       | NOT NULL, CHECK Indonesian values (Bersih Kandang, Potong Kuku, Sisir, etc.) |
| `note`         | `text`       | Nullable                                                      |
| `created_at`   | `timestamptz`| NOT NULL, DEFAULT `now()`                                     |
| `created_by`   | `uuid`       | Nullable, FK → `auth.users(id)` ON DELETE SET NULL            |

**Indexes:**
- `idx_daily_activities_date` on `date`
- `idx_daily_activities_cat_ids` GIN index on `cat_ids`

**Constraints:**
- `daily_activities_activity_type_check`: Values must be one of: Bersih Kandang, Potong Kuku, Sisir, Bersih Telinga, Obat Cacing, Obat Kutu, Mandi, Pemberian Obat, Pemeriksaan Umum, Lainnya
- `daily_activities_time_slots_check`: Must be subset of `{Pagi,Siang,Sore,Malam}` with at least 1
- `daily_activities_locations_check`: Must be subset of `{Rumah,Toko}` with at least 1

**RLS:**
- Admin: full access
- Owner: SELECT where `cat_ids` is empty (general activity) OR any cat in `cat_ids` has `owner_id = auth.uid()`

---

### Table: `profiles` ← User/Role Table

There is no separate `users` table. The `profiles` table links to `auth.users` (Supabase Auth) and stores the `role` field. Only two roles exist: `admin` and `owner`.

### No `activity_logs` Table

There is no separate audit/activity_logs table. The `daily_activities` table serves as the activity log. All records have `created_at` and `created_by` for basic audit trail.

---

## 5. BUSINESS LOGIC

### Suggested Status Calculation (`lib/cat-status.ts`)

The system computes a `SuggestedStatus` for each cat based on their health and weight data:

**Algorithm:**
1. Find the earliest `next_due_date` for each preventive type (VACCINE, FLEA, DEWORM) from `health_logs`.
2. Check if any are **overdue** (next_due_date < today).
3. Check if any are **due soon** (next_due_date is within `DUE_SOON_DAYS` = 7 days from today, but not yet overdue).
4. Check if any health log has `is_active_treatment = true`.
5. Check if weight dropped >10% between the two most recent weight logs.

**Status determination:**
- `"Needs Attention"` if ANY of: overdue preventive, active treatment, critical weight drop (>10%)
- `"Monitor"` if ANY preventive is due soon (but no overdue/treatment/weight issues)
- `"Healthy"` otherwise

**Reasons array** is populated with human-readable Indonesian strings explaining why the status was assigned (e.g., "Vaksin, Flea terlambat", "Sedang dalam perawatan aktif", "Berat badan turun >10% dari log sebelumnya").

### Overdue Logic

A preventive item is **overdue** when:
```
next_due_date < startOfDay(today)
```
Where `startOfDay` strips time to midnight. The `isOverdue()` function in `lib/dates.ts` performs this comparison.

### Due Soon Logic

A preventive item is **due soon** when:
```
startOfDay(today) <= next_due_date <= startOfDay(today) + DUE_SOON_DAYS * 86400000ms
```
`DUE_SOON_DAYS` = 7. The `isDueWithin()` function checks if a date falls within this window.

### Vaccine Types (F3, F4, Rabies)

Vaccine types are NOT explicitly differentiated in the database schema. All vaccines are stored as `type = 'VACCINE'` in `health_logs` with a `title` field that describes the specific vaccine (e.g., "Core vaccine booster", "Annual vaccine"). The system treats all VACCINE entries the same for scheduling — it finds the one with the earliest `next_due_date` and uses that for the vaccine status column.

The three tracked preventive types are:
- **VACCINE** — title "Vaccine" (label "Vaksin")
- **FLEA** — title "Flea prevention" (label "Flea")
- **DEWORM** — title "Deworming" (label "Deworm")

### Visit Day Logic

The Activity page uses a dual-layer system:

1. **`visit_days` table** — Explicitly marks a date as "visited" (`visited = true`) or not.
2. **`daily_activities` table** — Holds individual activity records for a date.

**Calendar status per day:**
- `"visited"` — `visit_days` row exists with `visited = true`
- `"partial"` — No visit row (or `visited = false`), but activities exist for that date
- `"none"` — Neither visit row nor activities exist

`getMonthActivitySummary()` fetches both tables for a month range and computes the status for each day.

### Activity Log Works

Activities are added via `addActivityForm()`:
1. Admin selects a date, one or more time slots (Pagi/Siang/Sore/Malam), one or more locations (Rumah/Toko), zero or more categories (Bersih-Bersih, Potong Kuku, Grooming, Ngepel, Ganti Filter Tempat Minum), and optionally a note.
2. `activity_type` defaults to "Lainnya" for all new entries.
3. If the DB constraint rejects the Indonesian activity_type, a fallback English mapping is attempted.
4. `cat_ids` is currently always empty (general activities, not cat-specific).

### Permissions Enforcement

**Server-side (Server Actions):**
- Every mutation action calls `requireAdmin()` at the top.
- `requireAdmin()` calls `getSessionProfile()` which reads the Supabase session from cookies, then queries the `profiles` table for the user's role.
- If not authenticated → throws "Not authenticated."
- If not admin → throws "Not authorized."

**Database-level (RLS):**
- All tables have RLS enabled.
- Admin policies use `is_admin()` function (checks `profiles.role = 'admin'` for `auth.uid()`).
- Owner policies restrict SELECT to own data (via `owner_id = auth.uid()` or subqueries on `cats.owner_id`).

**Middleware-level:**
- `middleware.ts` checks for the presence of a Supabase auth cookie (`sb-*-auth-token`).
- If no cookie found on protected routes, redirects to `/login?redirectTo=<path>`.
- Public paths: `/login` and `/`.

### Owner vs Admin Roles

| Capability              | Admin | Owner |
|-------------------------|-------|-------|
| View dashboard          | Yes   | Yes (own cats only via RLS) |
| View/search cats        | Yes (all) | Yes (own cats) |
| Create/edit/delete cats | Yes   | No    |
| Add health/weight/grooming logs | Yes | No |
| Bulk operations         | Yes   | No    |
| Manage inventory        | Yes   | No (read-only) |
| Add/delete activities   | Yes   | No    |
| Toggle visit status     | Yes   | No    |
| Accept status suggestion| Yes   | No    |
| View reports            | Yes   | Yes (own cats) |
| Manage breeds/categories| Yes   | No    |

---

## 6. API / SERVER ACTIONS

There are **no API routes** (`app/api/`) except for the logout handler. All data mutations use Next.js Server Actions (`"use server"` functions).

### Logout Route Handler

| Route | Method | Description |
|-------|--------|-------------|
| `/auth/logout` | GET | Signs out via Supabase, clears auth cookies, redirects to `/login` |

### Server Actions — `app/actions/cats.ts`

| Action                  | Description                                          | Validation                          |
|-------------------------|------------------------------------------------------|-------------------------------------|
| `createCat(formData)`   | Creates a new cat with cat_id, name, owner, dob, status, location | `getString`, `getOptionalString`, `getDate`, `validateCatStatus`, `validateCatLocation` |
| `updateCat(formData)`   | Updates cat details including photo upload to Supabase Storage | Photo size ≤ 5MB, MIME check, HTTPS URL check |
| `bulkUpdateCats(formData)` | Bulk update status/location/breed for multiple cats | `getJsonStringArray` for cat_ids, validates status/location |
| `updateCatWithState(prevState, formData)` | Wrapper for `updateCat` that returns state (for `useActionState`) | Same as `updateCat` |
| `acceptSuggestedStatus(formData)` | Sets `status_manual` on a cat to the suggested value | `validateSuggestedStatus` |

### Server Actions — `app/actions/logs.ts`

| Action                          | Description                                              |
|---------------------------------|----------------------------------------------------------|
| `addHealthLog(formData)`        | Adds a single health log for one cat                     |
| `bulkAddHealthLog(formData)`    | Adds the same health log for multiple cats               |
| `addWeightLog(formData)`        | Adds a weight log (validates 0.01–50 kg)                 |
| `addGroomingLog(formData)`      | Adds a grooming log for one cat                          |
| `updateGroomingLog(formData)`   | Updates an existing grooming log date                    |
| `bulkSetGroomingDate(formData)` | Sets grooming date for multiple cats (insert or update)  |
| `updateHealthLogDate(formData)` | Updates the date of an existing health log               |
| `setNextDueDate(formData)`      | Sets/updates next_due_date for a preventive log          |
| `bulkSetNextDueDate(formData)`  | Bulk sets next_due_date for a preventive type across cats|
| `bulkSetLastPreventiveDate(formData)` | Bulk sets the last administered date for preventive |

### Server Actions — `app/actions/activity.ts`

| Action                              | Description                                              |
|-------------------------------------|----------------------------------------------------------|
| `getMonthActivitySummary(year, month)` | Returns day-by-day status (visited/partial/none) for a month |
| `getDayActivities(date)`            | Returns activities and visit status for a single day     |
| `setVisitStatus(date, visited)`     | Upserts visit_days row for a date (admin only)           |
| `addActivityForm(formData)`         | Adds a daily activity (admin only)                       |
| `deleteActivity(id)`               | Deletes a single activity (admin only)                   |
| `deleteActivities(ids)`            | Deletes multiple activities (admin only)                 |

### Server Actions — `app/actions/inventory.ts`

| Action                              | Description                                              |
|-------------------------------------|----------------------------------------------------------|
| `adjustInventoryStock(formData)`    | Creates a movement record (purchase/usage/adjustment). Validates stock won't go negative. |
| `createInventoryCategory(formData)` | Creates a new inventory category with auto-generated slug |
| `deleteInventoryCategory(formData)` | Deletes category (only if no items remain)               |
| `createInventoryItem(formData)`     | Creates item with optional initial stock (via ADJUSTMENT movement) |
| `deleteInventoryItem(formData)`     | Deletes an inventory item                                |

### Server Actions — `app/actions/breeds.ts`

| Action                   | Description                      |
|--------------------------|----------------------------------|
| `createBreed(formData)`  | Creates a new cat breed          |
| `updateBreed(formData)`  | Updates breed name               |
| `deleteBreed(formData)`  | Deletes a breed                  |

### Input Validation Method

All server actions use helpers from `lib/validation.ts`:
- `getString(formData, key, options)` — Extracts and trims string, validates required/maxLength
- `getOptionalString(formData, key)` — Extracts string, returns empty string if missing
- `getDate(formData, key)` — Parses to YYYY-MM-DD or null
- `requireDate(formData, key, label)` — Like getDate but throws if missing/invalid
- `getNumber(formData, key, options)` — Parses number with min/max validation
- `getWeightKg(formData, key)` — Weight-specific: required, 0.01–50 kg
- `getInventoryDelta(formData)` — Required non-zero number
- `getJsonStringArray(formData, key)` — Parses JSON array of strings, max 100 items
- `getJson(formData, key)` — Generic JSON parser
- Type validators: `validateCatStatus`, `validateCatLocation`, `validateHealthType`, `validatePreventiveType`, `validateMovementReason`, `validateSuggestedStatus`

### Error Handling

- Server actions throw `Error` with Indonesian messages on validation failure.
- Supabase errors are re-thrown (the error object from `@supabase/supabase-js`).
- Duplicate key errors (code `23505`) are caught and given user-friendly messages.
- Constraint violations (code `23514`) trigger fallback logic (e.g., activity_type English fallback).
- Client components catch errors and display them in the UI.

### Revalidation Logic (`lib/revalidate.ts`)

After each mutation, specific paths are revalidated using Next.js `revalidatePath()`:

| Function               | Paths Revalidated                                           |
|------------------------|-------------------------------------------------------------|
| `revalidateCat(catId)` | `/cats`, `/cats/{catId}`, `/dashboard`, `/health`, `/grooming`, `/reports`, `/reports/{catId}` |
| `revalidateCats()`     | `/cats`, `/dashboard`, `/health`, `/grooming`, `/reports`   |
| `revalidateHealth()`   | `/health`, `/reports`                                       |
| `revalidateGrooming()` | `/grooming`                                                 |
| `revalidateInventory()`| `/inventory`, `/dashboard`                                  |
| `revalidateActivity()` | `/activity`, `/dashboard`                                   |

---

## 7. AUTHENTICATION FLOW

### Login Method

**Email + Password** authentication via Supabase Auth. No magic link, no OAuth, no SSO.

### Login Flow

1. User navigates to any protected route.
2. `middleware.ts` checks for `sb-*-auth-token` cookie.
3. If no cookie → redirects to `/login?redirectTo=<original-path>`.
4. Login page (`app/(auth)/login/page.tsx`) is a client component.
5. User enters email and password.
6. Client calls `supabase.auth.signInWithPassword({ email, password })` using the browser Supabase client.
7. On success: Supabase sets auth cookies automatically.
8. Client reads `redirectTo` search param; if valid (passes `isSafeRedirectPath` — must start with `/`, no protocol), navigates there. Otherwise navigates to `/dashboard`.
9. `router.refresh()` is called to re-render server components with the new session.

### Logout Flow

1. User clicks logout button (link to `/auth/logout`).
2. Route handler at `app/auth/logout/route.ts` creates a Supabase client with cookie read/write access.
3. Calls `supabase.auth.signOut()` which clears auth cookies.
4. Redirects to `/login` with 302.

### Role Assignment

Roles are stored in the `profiles` table (not in Supabase Auth metadata). When a user is created in Supabase Auth, a corresponding `profiles` row must be manually inserted with the desired role. The seed file shows this pattern. There is no self-registration; users are provisioned by the database administrator.

### Access Restrictions

| Layer       | Mechanism                                                        |
|-------------|------------------------------------------------------------------|
| Middleware  | Cookie presence check → redirect to login                        |
| Server Components | `getSessionProfile()` reads session → returns profile or null |
| Server Actions | `requireAdmin()` checks session + profile.role === "admin"    |
| Database    | RLS policies enforce row-level access per user role              |

### Root Page Behavior

The root page (`/`) is a server component that:
1. Calls `getSessionProfile()`.
2. If no session → redirects to `/login`.
3. If session exists → redirects to `/dashboard`.

---

## 8. UI STRUCTURE

All pages use an `AppShell` layout with:
- **Desktop sidebar** (left): Logo ("Cipao OS"), navigation links, user email + role badge, logout button
- **Desktop header** (top): Global search command palette (Cmd+K)
- **Mobile**: Condensed header with logo + search

### Navigation Tabs

Dashboard, Cats (Kucing), Health (Kesehatan), Grooming, Aktivitas, Inventory, Reports (Laporan)

---

### Dashboard (`/dashboard`)

**Data source:** `getDashboardData()` fetches all active cats, health logs, weight logs, grooming logs, and inventory items in a single parallel query.

**Displays:**
1. **Summary cards:** Total cats, Priority alerts count (overdue + active treatment), Low stock count, Medical care count (cats with status ≠ "Healthy")
2. **Priority alerts:** Lists specific overdue items, active treatments, low stock items
3. **Recent notifications:** Upcoming due dates, recent grooming entries
4. **Medical care cats:** Shows cats with active treatment or status "kurang_baik"/"sakit"
5. **Low stock panel:** Top 5 lowest-stock items (sorted by stock/min ratio)
6. **Grooming panel:** 5 cats with oldest last grooming dates

---

### Cats (`/cats`)

**Data source:** Server component queries `cats` table (filtered by search param `?q=`), joins `cat_breeds`, and fetches breed list.

**Displays:**
1. **Search bar** — Filters by name or cat_id
2. **Cat table** — Columns: Photo, Name (with cat_id badge), Breed, Status badge, Location badge, Actions
3. **Bulk actions** (admin) — Multi-select cats → bulk update status, location, or breed
4. **Create cat dialog** (admin) — Form with cat_id, name, owner email, DOB, status, location
5. **Edit cat dialog** (admin) — Full edit form with photo upload
6. **Breeds section** — Table to manage breed list (admin only)

### Cat Detail (`/cats/[catId]`)

**Data source:** Fetches cat record, all health logs, weight logs, grooming logs for that cat.

**Displays:**
1. **Cat header** — Photo, name, cat_id, status/location badges, breed, DOB
2. **Metric cards** — Last weight (with change indicator), next vaccine/flea/deworm dates (color-coded: green=ok, amber=due soon, red=overdue), last grooming date
3. **Status suggestion banner** (admin) — Shows suggested status with reasons; "Accept" button
4. **Quick add buttons** (admin) — Add health log, weight log, grooming log dialogs
5. **Health log timeline** — Chronological list of all health events with type badges
6. **Weight history** — Last 5 weight entries

---

### Health (`/health`)

**Data source:** `getHealthScanData()` fetches all active cats with their health logs and weight logs, computes status suggestions.

**Displays:**
1. **Health table** — One row per cat with columns:
   - Cat name + cat_id
   - Status suggestion badge (Needs Attention / Monitor / Healthy)
   - Last weight
   - Vaccine column: last date + next due date (color-coded)
   - Flea column: last date + next due date (color-coded)
   - Deworm column: last date + next due date (color-coded)
   - Actions (set dates)
2. **Bulk actions** — Select multiple cats → set last date or next due date for a preventive type
3. **Date dialogs** — Quick-set buttons: +1 month, +3 months, +1 year for due dates; "Today" for last dates

---

### Grooming (`/grooming`)

**Data source:** Fetches all active cats joined with their latest grooming log, sorted by last grooming date ascending (cats groomed longest ago appear first).

**Displays:**
1. **Grooming table** — Cat name, last grooming date, days since last grooming, actions
2. **Add grooming dialog** (admin) — Pick date for a single cat
3. **Edit grooming dialog** (admin) — Change date of existing log
4. **Bulk set date** (admin) — Select multiple cats → set grooming date for all

---

### Inventory (`/inventory`)

**Data source:** Fetches inventory categories (ordered by sort_order) with their items.

**Displays:**
1. **Summary cards** — Total items count, low stock count, out of stock count
2. **Category sections** — Each category shows its items in a table
3. **Item rows** — Name, stock quantity, unit, min stock, status badge (OK/Low/Out)
4. **Quick adjust** (admin) — +1 / -1 buttons for stock
5. **Adjust stock dialog** (admin) — Custom amount with reason (purchase/usage/adjustment)
6. **Create category** (admin) — Name → auto-generates slug
7. **Create item** (admin) — Category, name, unit, min stock, initial stock
8. **Delete** (admin) — Categories (only if empty) and items

---

### Activity (`/activity`)

**Data source:** `getMonthActivitySummary()` for calendar data, `getDayActivities()` for selected day details.

**Displays:**
1. **Month calendar** — Grid showing each day with color indicator:
   - Green = visited
   - Yellow = partial (has activities but not marked visited)
   - Gray = none
   - Navigation: previous/next month
2. **Day panel** (when a day is selected):
   - Visit toggle switch (admin) — Mark day as visited/not visited
   - Activity list — Each entry shows time slots, locations, categories, activity type, cat names, note
   - Add activity button (admin) — Opens dialog
   - Delete activity buttons (admin)
3. **Add activity dialog** — Multi-select: time slots (Pagi/Siang/Sore/Malam), locations (Rumah/Toko), categories (5 options), optional note

---

### Reports (`/reports`)

**Data source:** Fetches all active cats with search filtering (name, cat_id, location).

**Displays:**
1. **Search bar** — Filter by name, ID, or location
2. **Cat cards** — Photo, name, cat_id, location badge, status suggestion badge
3. **Links** — Each card links to individual report page

### Report Detail (`/reports/[catId]`)

**Data source:** Fetches cat, health logs, weight logs, grooming logs.

**Displays (print-friendly):**
1. **Cat header** — Name, cat_id, breed, status, location
2. **Weight history** — Table of all weight logs
3. **Preventive care** — Separate sections for Vaccine, Flea, Deworm showing last date + next due
4. **Last grooming** — Date of most recent grooming
5. **Last illness** — Most recent ILLNESS-type health log
6. **Active treatments** — All logs with `is_active_treatment = true`
7. **Health timeline** — Last 20 health logs in chronological order
8. **Print styles** — Hides sidebar, removes shadows, optimized for paper

---

## 9. KNOWN LIMITATIONS

### Technical Debt

1. **No automated tests** — No test files, no test framework configured. All testing is manual.
2. **No Supabase type generation** — Types in `lib/types.ts` are hand-written and may drift from actual database schema. The comment says "Adjust to match your generated types if you use supabase-codegen" but codegen is not set up.
3. **activity_type constraint mismatch** — The DB constraint uses Indonesian values, but there's a fallback to English values in the server action. This dual-language approach is fragile.
4. **`categories` column on daily_activities** has no DB constraint — Unlike `time_slots` and `locations` which have CHECK constraints, `categories` only validates in application code.
5. **No pagination** — All queries fetch all records. Dashboard fetches ALL health logs, weight logs, grooming logs, and inventory items. This will not scale beyond a few hundred cats.
6. **Session refresh not implemented in middleware** — The Supabase server client in middleware only checks cookie presence, not validity. Session refresh relies on Supabase's built-in token refresh.
7. **No optimistic updates** — All mutations wait for server response before updating UI.
8. **No image optimization config** — `next.config.ts` is empty; no `images.domains` configured for Supabase Storage URLs.
9. **`cat_ids` always empty for activities** — The `addActivityForm()` action hardcodes `catIds: string[] = []`, so activities are never cat-specific despite the schema supporting it.

### Known Risks

1. **No rate limiting** — Server actions have no rate limiting. A malicious admin could flood the database.
2. **No input sanitization beyond type validation** — While validation prevents wrong types, there's no XSS sanitization (mitigated by React's auto-escaping).
3. **Single-tenant** — The system assumes a single cattery. Multiple organizations would require schema changes.
4. **Photo uploads go to public bucket** — The `cat-photos` bucket has public read access. Anyone with the URL can see photos.
5. **No backup strategy documented** — Relies on Supabase's built-in backups.
6. **Cookie-based auth check in middleware is presence-only** — Checks if `sb-*-auth-token` cookie exists, not if it's valid. An expired cookie would pass middleware but fail at the Supabase client level.

### Areas That Need Improvement

1. **Pagination and virtual scrolling** for large datasets
2. **Supabase type generation** via `supabase gen types`
3. **Automated testing** (at minimum, server action integration tests)
4. **Image optimization** configuration in next.config
5. **Cat-specific activity logging** (the schema supports it but the UI doesn't)
6. **Audit trail** — Currently only `created_at`/`created_by`; no update tracking
7. **Soft delete** — No soft delete pattern; all deletes are permanent (CASCADE)
8. **Internationalization** — Mix of Indonesian and English in the codebase; no i18n framework

---

## 10. DEPLOYMENT

### Environment Variables Required

| Variable                          | Required | Description                              |
|-----------------------------------|----------|------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | Yes      | Supabase project URL (e.g., `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Yes      | Supabase anonymous/public API key        |

Both are prefixed with `NEXT_PUBLIC_` so they're available in both server and client bundles. Validated at module load by `lib/env.ts`.

### How It Is Deployed

- **Platform:** Vercel (inferred from `.vercel` in `.gitignore` and standard Next.js setup)
- **Build command:** `next build` (from `package.json` scripts)
- **Start command:** `next start`
- **Framework preset:** Next.js (auto-detected by Vercel)

### Production-Specific Config

1. **Supabase project** must be created with:
   - `schema.sql` executed to create all tables, enums, functions, triggers, and RLS policies
   - All migration files executed in order for incremental schema changes
   - `seed.sql` executed for initial data (or profiles manually created)
   - Storage bucket `cat-photos` created (public, via Supabase Dashboard → Storage)
   - Two auth users created in Supabase Auth (admin + owner) with matching `profiles` rows

2. **No `vercel.json`** — Uses defaults. No custom headers, rewrites, or redirects configured.

3. **No custom `next.config.ts`** — Config object is empty. For production, consider adding:
   - `images.remotePatterns` for Supabase Storage URLs
   - Security headers

4. **Database migrations** must be applied manually via Supabase SQL editor or CLI. There is no automated migration runner configured.

5. **No CI/CD pipeline** — No GitHub Actions, no automated deployment hooks beyond Vercel's git integration.
