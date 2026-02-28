# Prompt Lengkap Proyek: Cat Operational System (Cipao OS)

Gunakan blok di bawah ini sebagai **prompt konteks** saat memakai situs AI (Claude, ChatGPT, dll.) agar AI memahami proyek secara utuh. Copy-paste seluruh isi bagian "PROMPT UNTUK AI" ke kolom chat.

---

## PROMPT UNTUK AI (copy dari sini)

```
Saya punya sebuah proyek web bernama **Cat Operational System** (branding: **Cipao OS**). Ini adalah konsol operasional premium-minimal untuk mengelola kesehatan kucing, grooming, dan inventori dalam lingkungan multi-kucing. Bantu saya dengan konteks berikut.

---

## 1. Tech stack

- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **Tailwind CSS 4** + **PostCSS**
- **Komponen UI**: gaya shadcn (Radix primitives): `components/ui/` — Button, Dialog, Input, Textarea, Command (cmdk), dll. Pakai `class-variance-authority`, `clsx`, `tailwind-merge`; utility `cn()` dari `@/lib/utils`
- **Backend & DB**: **Supabase** — Auth, Postgres, Row Level Security (RLS), Storage (bucket `cat-photos` untuk foto kucing)
- **Auth di Next.js**: `@supabase/ssr`; server client via `createSupabaseServerClient()` di `lib/supabaseClient.ts`; session & role lewat `lib/auth.ts` (`getSessionProfile()`, `isAdmin()`)
- **Font**: Geist (sans), Geist Mono — dari `next/font/google`
- **Icon**: lucide-react

---

## 2. Struktur folder utama

- `app/` — App Router
  - `app/layout.tsx` — root layout (font, metadata "Cipao OS")
  - `app/globals.css` — global styles
  - `app/(auth)/` — layout & halaman untuk area belum login: `login/page.tsx`, `page.tsx` (redirect)
  - `app/(app)/` — layout & halaman setelah login: `layout.tsx` (wrap dengan AppShell), `dashboard/page.tsx`, `cats/page.tsx`, `cats/[catId]/page.tsx`, `health/page.tsx`, `grooming/page.tsx`, `inventory/page.tsx`, `reports/page.tsx`, `reports/[catId]/page.tsx`
- `components/` — komponen React
  - `layout/shell.tsx` — AppShell: sidebar, command palette (GlobalCommand), logout; nav: Dashboard, Cats, Health, Grooming, Inventory, Reports
  - `dashboard/dashboard-content.tsx` — konten dashboard (ringkasan operasional)
  - `cats/` — cats-table, edit-cat-dialog, edit-cat-form
  - `grooming/` — grooming-table, add-grooming-dialog, edit-grooming-dialog
  - `health/` — health-table, set-last-date-dialog, set-next-due-dialog
  - `inventory/` — delete-item-button, dll.
  - `reports/` — reports-search
  - `ui/` — primitif: button, dialog, input, textarea, command
- `lib/` — utilitas & konfigurasi
  - `supabaseClient.ts` — createSupabaseServerClient (SSR)
  - `supabaseBrowserClient.ts` — client untuk use di browser (mis. upload)
  - `auth.ts` — getSessionProfile(), isAdmin(), type Profile & ProfileRole
  - `types.ts` — Database & Tables<T> untuk Supabase (profiles, cats, health_logs, weight_logs, grooming_logs, inventory_categories, inventory_items, inventory_movements)
  - `cat-status.ts` — mesin saran status: buildStatusSuggestion(), SuggestedStatus "Needs Attention" | "Monitor" | "Healthy", alasan (terlambat vaksin/flea/deworm, perawatan aktif, turun berat >10%)
  - `utils.ts` — cn()
- `app/actions/` — Server Actions (use "use server")
  - `cats.ts` — createCat, updateCat, acceptSuggestedStatus (admin only)
  - `logs.ts` — addHealthLog, addWeightLog, addGroomingLog (admin only)
  - `inventory.ts` — adjustInventoryStock (admin only)
- `middleware.ts` — proteksi rute: path publik hanya `/login` dan `/`; selain itu butuh cookie Supabase auth (`sb-*-auth-token`), else redirect ke `/login?redirectTo=...`
- `supabase/` — schema & migrasi
  - `schema.sql` — tabel, enum, trigger, RLS
  - `migrations/` — tambahan (dob, status, location, storage cat-photos, inventory_categories)

---

## 3. Model data (Supabase / Postgres)

- **profiles**: id (uuid, FK auth.users), email, role ('admin' | 'owner'). Helper SQL: is_admin().
- **cats**: id, cat_id (unique, e.g. CAT-001), name, owner_id (FK profiles), dob (date, nullable), status ('baik'|'kurang_baik'|'sakit'), location ('rumah'|'toko'|'klinik'), status_manual, is_active, photo_url, created_at.
- **health_logs**: id, cat_id, date, type (enum: VACCINE, FLEA, DEWORM, ILLNESS, MEDICATION, CLINIC, NOTE), title, details, next_due_date, is_active_treatment, created_at.
- **weight_logs**: id, cat_id, date, weight_kg, created_at.
- **grooming_logs**: id, cat_id, date, created_at.
- **inventory_categories**: id, slug, name, sort_order, created_at (seed: LITTER, FOOD, MED_VIT, GROOMING_TOOL, OTHER).
- **inventory_items**: id, category_id (FK inventory_categories), name, stock_qty, unit, min_stock_qty, created_at.
- **inventory_movements**: id, item_id, date, change_qty, reason (PURCHASE | USAGE | ADJUSTMENT), note, created_at. Trigger: setelah INSERT update inventory_items.stock_qty += change_qty.

RLS singkat: Admin (is_admin()) full CRUD pada cats, health_logs, weight_logs, grooming_logs, inventory_*, categories. Owner hanya SELECT untuk data kucing yang owner_id = auth.uid() (dan log terkait). Inventory: semua authenticated bisa SELECT; hanya admin yang bisa tulis.

---

## 4. Fitur per halaman (ringkas)

- **Dashboard** (`/dashboard`): Ringkasan operasional — kucing dalam perawatan aktif, kartu statistik (total kucing, perlu perhatian, jatuh tempo minggu ini, item stok rendah), jadwal preventive (terlambat & 7 hari), panel grooming (paling lama), panel stok rendah. Judul: "Ringkasan operasional".
- **Cats** (`/cats`): Tabel kucing (aktif), search, admin: tambah/edit kucing, toggle aktif; upload foto dari device atau URL (storage cat-photos).
- **Cat Profile** (`/cats/[catId]`): Header metrik (berat terakhir, next vaccine/flea/deworm, last grooming), banner saran status (Accept/Dismiss), quick add log (admin): Vaccine, Flea, Deworm, Illness, Medication, Weight, Grooming; timeline kesehatan terpadu.
- **Health** (`/health`): Scan semua kucing — next Vaccine/Flea/Deworm, last illness, last weight; klik row ke profil kucing.
- **Grooming** (`/grooming`): Daftar kucing + last grooming date; urut: belum pernah grooming di atas, lalu yang paling lama; admin bisa tambah/edit grooming.
- **Inventory** (`/inventory`): Dikelompokkan per kategori (Litter, Food, Med&Vit, dll.); nama, stok, unit, indikator low-stock (stock_qty <= min_stock_qty); admin: tombol +/- stok yang memicu inventory_movements.
- **Reports** (`/reports`, `/reports/[catId]`): Index daftar kucing; halaman per kucing = Doctor Summary: identitas, status manual + saran + alasan, berat terakhir, next vaccine/flea/deworm, last illness, timeline kesehatan (print-friendly).

---

## 5. Aturan & konvensi

- Bahasa UI: Indonesia (label, pesan, tombol).
- Hanya **admin** yang boleh create/update/delete; **owner** hanya baca. Cek di server (getSessionProfile + isAdmin) dan di RLS; UI sembunyikan kontrol tulis untuk owner.
- Server Components default; form dan interaktivitas pakai Client Components ("use client") bila perlu.
- Data fetching di server (createSupabaseServerClient), revalidate pakai revalidatePath/revalidateTag setelah server actions.
- Typing: gunakan Tables<"table_name"> dari lib/types; untuk payload custom pakai type/interface di file terkait atau di types.ts.
- Styling: Tailwind + cn(); komponen UI mengikuti pola shadcn (composable, variant via cva jika ada).
- Routing: login redirect ke redirectTo atau /dashboard; path publik hanya / dan /login.
```

---

## Cara pakai

1. Buka file ini di proyek.
2. Copy **seluruh teks di dalam blok "PROMPT UNTUK AI"** (dari ``` sampai ```).
3. Paste ke situs AI (Claude, ChatGPT, dll.) di awal percakapan atau saat minta fitur baru / debugging / refactor.
4. Tambahkan instruksi spesifik Anda di bawahnya (misalnya: "Tambahkan fitur export PDF untuk Reports", "Perbaiki error di halaman Cats", "Buat komponen X dengan kriteria Y").

Dengan prompt ini, AI punya konteks: stack, struktur folder, model data, fitur, dan konvensi proyek sehingga output bisa selaras dengan codebase Anda.
