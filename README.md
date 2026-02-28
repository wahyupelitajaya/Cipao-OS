## Cat Operational System

Premium-minimal operational console for managing multi-cat health, grooming, and inventory.  
Built with **Next.js App Router**, **TypeScript**, **TailwindCSS + shadcn-style components**, and **Supabase (Postgres + RLS)**.

### Tech stack

- **Next.js 16 App Router** (`app/` directory)
- **TypeScript**
- **TailwindCSS** (custom config + Geist font)
- **shadcn-style primitives** (`components/ui/*`)
- **Supabase** for auth, Postgres, and row level security
- **@supabase/ssr** for server-side auth in Next.js

---

## 1. Getting started

### 1.1. Install dependencies

From the `cat-operational-system` folder:

```bash
npm install
```

### 1.2. Environment variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

You can copy these from your Supabase project Settings → API.

---

## 2. Supabase setup

### 2.1. Create project and run schema

1. Create a new Supabase project.
2. Open the **SQL editor**.
3. Paste and run the contents of:

   - `supabase/schema.sql`

This will create:

- `profiles` (linked to `auth.users`)
- `cats`
- `health_logs`
- `weight_logs`
- `grooming_logs`
- `inventory_items`
- `inventory_movements`
- Enums, trigger for stock updates, and full RLS policies including `is_admin()` helper.

### 2.2. Create admin and owner users

1. In Supabase dashboard → **Authentication → Users**, create:
   - One **admin** user (e.g. `admin@example.com`)
   - One **owner** user (e.g. `owner@example.com`)
2. Copy their UUIDs from the users table.

### 2.3. Wire UUIDs into seed.sql

Open `supabase/seed.sql` and replace the placeholders:

- `ADMIN_USER_ID_PLACEHOLDER` → paste the admin `auth.users.id`
- `OWNER_USER_ID_PLACEHOLDER` → paste the owner `auth.users.id`

Example:

```sql
insert into public.profiles (id, email, role) values
  ('00000000-0000-0000-0000-000000000000', 'admin@example.com', 'admin');

insert into public.profiles (id, email, role) values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com', 'owner');
```

Make sure the emails in `profiles` match the auth users you created.

### 2.4. Apply seed data

In Supabase SQL editor, run the contents of:

- `supabase/seed.sql`

This will:

- Seed **31 cats** with IDs `CAT-001` … `CAT-031` (all assigned to the single owner).
- Add some example health, weight, and grooming logs.
- Seed inventory items and movements.

### 2.5. Storage: foto kucing (upload dari perangkat)

Agar fitur **upload foto kucing** dari device berfungsi:

1. Di Supabase Dashboard → **Storage** → **New bucket**  
   - **Name** (nama bucket): isi persis `cat-photos` (policy RLS memakai id bucket ini)  
   - **Public bucket**: nyalakan (supaya URL foto bisa dipakai di dashboard)  
   - (Opsional) File size limit: 5MB, Allowed MIME types: `image/*`

2. Di SQL editor, jalankan isi file:
   - `supabase/migrations/20250225100000_storage_cat_photos.sql`  
   (Ini membuat policy: user login boleh upload/baca/update, publik boleh baca.)

3. Jika bucket sudah pernah dibuat dengan nama lain atau id berbeda, sesuaikan di migration: ganti `'cat-photos'` di policy dengan id bucket Anda (lihat di Storage → klik bucket → id ada di URL/settings).

Setelah itu, di tab **Cats** → edit kucing → Anda bisa memilih **Upload dari perangkat** (file foto) atau mengisi **URL foto** jika gambar sudah ada di internet.

### 2.6 Agar client tidak perlu login lagi (session lama)

Supaya pengguna tidak diminta login ulang, atur **JWT expiry** di Supabase jadi **30 hari**:

1. Buka **Supabase Dashboard** → pilih project → **Authentication** → **Settings** (atau **Project Settings** → **Auth**).
2. Cari **JWT expiry** / **JWT Expiry limit** (nilai dalam **detik**).
3. Ubah menjadi **`2592000`** (= 30 hari). Simpan.

Setelah itu, session tetap valid sampai 30 hari selama refresh token dipakai. Aplikasi ini juga melakukan **refresh session otomatis setiap 10 menit** di client sehingga token selalu diperbarui dan client praktis tidak perlu login lagi selama tetap memakai app.

Langkah lengkap: lihat **[docs/SESSION_SETUP.md](docs/SESSION_SETUP.md)**.

---

## 3. Running the app locally

From the project root:

```bash
npm run dev
```

Then open `http://localhost:3000`.

You should:

- Sign in via Supabase auth (e.g. email magic link or password, depending on your settings).
- Ensure the logged-in user has a corresponding row in `profiles` with role `admin` or `owner`.

---

## 4. Roles & access model

### 4.1. Profiles

- `profiles` table: `id` = `auth.users.id`, `email`, `role` (`'admin' | 'owner'`).
- `is_admin()` SQL helper checks `profiles.role = 'admin'`.

### 4.2. RLS overview

- **Cats**
  - Admin: full CRUD.
  - Owner: `SELECT` only where `owner_id = auth.uid()`.
- **Health / weight / grooming logs**
  - Admin: full CRUD.
  - Owner: `SELECT` only for cats where `cats.owner_id = auth.uid()`.
- **Inventory items / movements**
  - Any authenticated user: `SELECT`.
  - Only admin: `INSERT/UPDATE/DELETE` (for movements, only `INSERT` is needed but admin can manage all).

The UI also hides write controls for owners, but security is enforced by RLS.

---

## 5. App structure

- `app/layout.tsx` – root layout, fonts, premium-minimal shell with sidebar and global search.
- `components/layout/shell.tsx` – sidebar navigation, global command palette, mobile top bar.
- `lib/supabaseClient.ts` – `createSupabaseServerClient()` using `@supabase/ssr`.
- `lib/auth.ts` – load session + profile, role helpers.
- `lib/types.ts` – minimal Supabase table typings.
- `lib/cat-status.ts` – status suggestion engine (Needs Attention / Monitor / Healthy).

### 5.1. Pages

- `/` and `/dashboard` – dashboard overview, high-level cards.
- `/cats` – list of all cats with search and minimal admin CRUD (create / edit / toggle active).
- `/cats/[catId]` – **Cat Profile**:
  - Header metrics (Last weight, Next vaccine/flea/deworm, Last grooming).
  - Status suggestion banner: “System suggests status → X (reason: …) [Accept] [Dismiss]”.
  - Quick Add modals (admin only): Vaccine, Flea, Deworm, Illness, Medication, Weight, Grooming.
  - Unified health timeline (latest first).
- `/health` – Health scan:
  - All cats with: Next Vaccine/Flea/Deworm, Last Illness (title + date), Last Weight + date.
  - Clicking a row opens the cat profile.
- `/grooming` – Grooming scan:
  - Simple vertical list (no cards) with cat name (clickable) + last grooming date.
  - Sorted with never-groomed at top, then oldest grooming first.
- `/inventory` – Inventory:
  - Sections: Litter / Food / Med&Vit.
  - Each: name + stock qty + unit, low-stock indicator when `stock_qty <= min_stock_qty`.
  - Admin-only quick ± stock buttons that create inventory movements and update `stock_qty` via trigger.
- `/reports` – Reports index:
  - List of cats with links to individual summaries.
- `/reports/[catId]` – **Doctor Summary**:
  - Identity, manual + suggested status (with reasons).
  - Last weight/date.
  - Next vaccine/flea/deworm.
  - Last illness.
  - Recent health timeline (print-friendly layout).

### 5.2. Server actions

Located under `app/actions/`:

- `cats.ts`
  - `createCat` – admin-only; create cat with `cat_id`, `name`, owner email/UUID.
  - `updateCat` – admin-only; edit name, manual status, and active flag.
  - `acceptSuggestedStatus` – admin-only; write suggested status into `status_manual`.
- `logs.ts`
  - `addHealthLog` – admin-only; create health log (supports all types).
  - `addWeightLog` – admin-only; create weight log.
  - `addGroomingLog` – admin-only; create grooming log.
- `inventory.ts`
  - `adjustInventoryStock` – admin-only; insert `inventory_movements` row and rely on trigger to update `stock_qty`.

All actions use `createSupabaseServerClient()` and revalidate relevant paths.

---

## 6. Deployment to Vercel

1. Push this project to a Git provider (GitHub, GitLab, etc.).
2. In Vercel, create a new project from the repo.
3. **Set environment variables** (required; build fails without them):
   - In Vercel: Project → **Settings** → **Environment Variables**
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL (e.g. `https://xxxx.supabase.co`)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon/public key
   - Apply to **Production**, **Preview**, and **Development** if you use Vercel previews.
4. Make sure Supabase RLS, `schema.sql`, and `seed.sql` have been applied as described above.
5. Deploy. Vercel will run `npm install` and `npm run build` automatically.

> **Note:** This project uses Next.js 16. Auth redirect logic lives in `proxy.ts` (not `middleware.ts`). Do not add `NEXT_PUBLIC_` to the Supabase service role key; that key must stay server-only.

After deploy, log in with:

- Admin user to manage cats, health, grooming, and inventory.
- Owner user to view read-only dashboards for their cats.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
