# Architecture & Code Review — Cat Operational System

Tinjauan arsitektur dan kode dengan fokus: anti-patterns, separation of concerns, hard-coded logic, abstraksi yang hilang, keamanan, validasi, dan edge cases. Setiap poin dilengkapi saran perbaikan konkret.

---

## 1. Anti-patterns

### 1.1 Duplikasi validasi dan konstanta

**Temuan:** Nilai yang sama (allowed statuses, locations, health types, date parsing) diulang di banyak file.

- `app/actions/cats.ts`: `allowedStatuses`, `allowedLocations` (beberapa kali), `BUCKET`, `MAX_SIZE`, `ALLOWED_TYPES`
- `app/actions/logs.ts`: `PREVENTIVE_TYPES`, `PREVENTIVE_TITLES`
- `components/cats/edit-cat-form.tsx`: `STATUS_OPTIONS`, `LOCATION_OPTIONS`
- `app/(app)/cats/[catId]/page.tsx`, `app/(app)/reports/[catId]/page.tsx`: `STATUS_LABELS`, `LOCATION_LABELS`, `HEALTH_TYPE_LABELS`
- `lib/cat-status.ts` dan beberapa halaman: `startOfDay`, `isOverdue`, `isDueWithin`, `formatDate` didefinisikan ulang

**Dampak:** Perubahan aturan (mis. tambah status baru) harus di banyak tempat; risiko inkonsistensi.

**Rekomendasi:**

- Pusatkan di modul bersama, mis. `lib/constants.ts` dan `lib/validation.ts` (atau `lib/schemas/`):

```ts
// lib/constants.ts
export const CAT_STATUSES = ["baik", "kurang_baik", "sakit"] as const;
export const CAT_LOCATIONS = ["rumah", "toko", "klinik"] as const;
export const HEALTH_TYPES = ["VACCINE", "FLEA", "DEWORM", "ILLNESS", "MEDICATION", "CLINIC", "NOTE"] as const;
export const PREVENTIVE_TYPES = ["VACCINE", "FLEA", "DEWORM"] as const;
export const INVENTORY_MOVEMENT_REASONS = ["PURCHASE", "USAGE", "ADJUSTMENT"] as const;

// lib/dates.ts (abstraksi tanggal)
export function startOfDay(d: Date): Date { ... }
export function parseDateISO(value: string): Date | null { ... }
export function isValidDateString(s: string): boolean { ... }
```

- Gunakan satu sumber untuk label UI (mis. map status/location/healthType → label) di `lib/constants.ts` atau `lib/i18n-labels.ts`, lalu impor di komponen dan actions.

---

### 1.2 FormData parsing dan validasi ad-hoc di setiap action

**Temuan:** Setiap Server Action mem-parsing `FormData` secara manual (`formData.get(...)`, `String(...).trim()`), tanpa skema atau validasi terpusat.

**Dampak:** Kode berulang, mudah lupa field, tipe tidak terjamin, pesan error tidak seragam.

**Rekomendasi:**

- Abstraksi helper parsing + validasi (bisa tanpa library):

```ts
// lib/form.ts
export function getString(formData: FormData, key: string, required = false): string {
  const v = String(formData.get(key) ?? "").trim();
  if (required && !v) throw new Error(`Field ${key} is required.`);
  return v;
}
export function getDate(formData: FormData, key: string, required = false): string | null { ... }
export function getNumber(formData: FormData, key: string, options?: { min?: number; max?: number }) { ... }
export function getJsonArray<T = string>(formData: FormData, key: string): T[] { ... }
```

- Atau pakai library skema (mis. Zod): definisi skema per action, parse `Object.fromEntries(formData)` lalu `schema.parse(...)`. Satu tempat untuk aturan dan pesan error.

---

### 1.3 Silent failure di action

**Temuan:** `acceptSuggestedStatus` (cats.ts): jika `!catId || !status` hanya `return`, tanpa error atau feedback.

```ts
if (!catId || !status) return;
```

**Dampak:** User mengira status tersimpan, padahal tidak; sulit debug.

**Rekomendasi:** Selalu throw dengan pesan jelas untuk input tidak valid:

```ts
if (!catId || !status) {
  throw new Error("Cat ID dan status wajib diisi.");
}
```

Terapkan prinsip yang sama untuk action lain yang saat ini “return early” tanpa throw.

---

### 1.4 RevalidatePath tersebar dan bisa tidak lengkap

**Temuan:** Setelah mutasi, `revalidatePath` dipanggil di tiap action dengan daftar path yang bisa tidak konsisten (mis. update cat tidak revalidate `/reports` dan `/reports/[catId]`).

**Rekomendasi:**

- Buat helper “revalidate after cat mutation” / “after health mutation” dll. sehingga satu tempat yang memutuskan daftar path:

```ts
// lib/revalidate.ts
export function revalidateCat(catId: string) {
  revalidatePath("/cats");
  revalidatePath(`/cats/${catId}`);
  revalidatePath("/dashboard");
  revalidatePath("/health");
  revalidatePath("/reports");
  revalidatePath(`/reports/${catId}`);
}
```

- Panggil helper ini dari semua actions yang mengubah data kucing/log/reports, agar cache selalu konsisten.

---

## 2. Poor separation of concerns

### 2.1 Halaman menggabungkan fetch, transformasi, dan layout

**Temuan:** Di `app/(app)/dashboard/page.tsx` dan `app/(app)/health/page.tsx`, logika “fetch → group by cat → compute suggestion / latest log” ada di dalam page component.

**Dampak:** Page component jadi panjang dan sulit di-test; logika bisnis terikat ke React/Next.

**Rekomendasi:**

- Pindahkan “data loading + transform” ke layer service/repository, mis.:
  - `lib/data/dashboard.ts`: `getDashboardData(supabase)` → return shape yang dipakai `DashboardContent`.
  - `lib/data/health.ts`: `getHealthScanData(supabase)` → return list kucing + latest preventive per tipe.
- Page hanya: `const data = await getDashboardData(supabase); return <DashboardContent initialData={data} />`. Test bisa fokus ke `getDashboardData` tanpa render.

---

### 2.2 Shell melakukan data fetching untuk command palette

**Temuan:** `components/layout/shell.tsx` memanggil Supabase langsung untuk `cats` + `inventory_categories` + `inventory_items` hanya untuk search.

**Dampak:** Setiap render layout (setiap navigasi) bisa hit DB; concern “layout/navigation” dicampur dengan “search data”.

**Rekomendasi:**

- Pertimbangkan load search data hanya saat command palette dibuka (lazy), atau
- Pindahkan ke layout yang lebih dalam / route yang butuh search, dan pass `searchData` sebagai prop atau via context setelah fetch di satu tempat.
- Jika tetap fetch di shell, setidaknya ekstrak ke fungsi `getSearchData(supabase)` di `lib/data/` agar layout hanya memanggil satu fungsi dan bisa di-cache/di-mock.

---

## 3. Hard-coded logic

### 3.1 Magic numbers dan string

**Temuan:**

- `cats.ts`: `MAX_SIZE = 5 * 1024 * 1024`, `BUCKET = "cat-photos"`, `ALLOWED_TYPES`
- `logs.ts`: `today = new Date().toISOString().slice(0, 10)` di beberapa tempat
- Dashboard/health: “7 hari” untuk “due soon” ada di `lib/cat-status.ts` dan di komponen (duplikasi konsep)

**Rekomendasi:**

- Pindahkan ke config/constants:
  - `lib/constants.ts`: `PHOTO_MAX_BYTES`, `PHOTO_BUCKET`, `PHOTO_ALLOWED_MIME_TYPES`, `DUE_SOON_DAYS = 7`
- Untuk “hari ini” dalam format ISO date, gunakan helper `lib/dates.ts`: `todayISO()` → satu sumber kebenaran dan mudah di-test (mock date).

---

### 3.2 Nama variabel menyesatkan

**Temuan:** Di `shell.tsx`, Map dari `inventory_categories` (id → name) diberi nama `catById`:

```ts
const catById = new Map(categories.map((c) => [c.id, c.name]));
// ...
categoryName: catById.get(i.category_id) ?? "",
```

**Rekomendasi:** Ganti nama agar sesuai domain, mis. `categoryNameById` atau `categoryIdToName`, supaya tidak rancu dengan “cat” (kucing).

---

## 4. Missing abstractions

### 4.1 Tidak ada layer validasi/schema terpusat

**Temuan:** Validasi (required, enum, range, format date) tersebar di actions; tidak ada DTO/schema yang dipakai bersama client dan server.

**Rekomendasi:**

- Definisikan skema (Zod atau manual) untuk payload tiap action, mis. `CreateCatInput`, `AddHealthLogInput`, dll.
- Parse di action; bisa dipakai juga di client untuk validasi form (mis. `zodResolver` dengan React Hook Form) sehingga aturan sama di kedua sisi.

---

### 4.2 Tidak ada error boundary atau handling error UI terpusat

**Temuan:** Jika Server Action throw, error bisa tidak tertangkap dengan baik di UI; beberapa form hanya mengandalkan `useFormState` dan menampilkan `state.message`.

**Rekomendasi:**

- Pastikan semua form yang memanggil action menampilkan error dari state (seperti `updateCatWithState`) atau catch dan set error state.
- Tambah Error Boundary di layout `(app)` agar error server (termasuk data fetching) tidak white-screen; fallback UI + log.

---

### 4.3 Auth check diulang di setiap action

**Temuan:** Pola yang sama di semua action: `getSessionProfile()` → `isAdmin(profile)` → throw jika bukan admin.

**Rekomendasi:**

- Helper HOF atau wrapper:

```ts
// lib/action-auth.ts
export function requireAdmin<T extends unknown[]>(
  fn: (profile: Profile, ...args: T) => Promise<void>
) {
  return async (...args: T) => {
    const { profile } = await getSessionProfile();
    if (!isAdmin(profile)) throw new Error("Not authorized");
    return fn(profile, ...args);
  };
}
```

- Atau gunakan satu helper di awal: `const profile = await requireAdmin();` yang throw jika bukan admin, lalu panggil `profile` di logic. Dengan begitu authorization tidak tersebar dan mudah diubah (mis. nanti tambah role).

---

## 5. Security

### 5.1 Environment variables tidak divalidasi

**Temuan:** `lib/supabaseClient.ts` dan `lib/supabaseBrowserClient.ts` memakai `process.env.NEXT_PUBLIC_SUPABASE_URL!` dan `...ANON_KEY!` tanpa cek. Jika kosong, runtime error di tempat dalam.

**Rekomendasi:**

- Validasi saat startup (atau di fungsi create client):

```ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}
```

- Lebih baik lagi: modul `lib/env.ts` yang export `env.SUPABASE_URL` dll. dan throw sekali jika env tidak lengkap, lalu seluruh app mengimpor dari sana.

---

### 5.2 Relying only on RLS (defense in depth)

**Temuan:** Authorization hanya dengan `isAdmin(profile)` di action; tidak ada pengecekan eksplisit bahwa resource (mis. `catId`) ada dan milik konteks yang benar. RLS memang membatasi, tapi error dari DB (mis. FK violation) bisa membocorkan info atau pesan raw.

**Rekomendasi:**

- Tetap andalkan RLS sebagai lapisan utama.
- Untuk action yang mengubah resource by id, bisa tambah “exists check” setelah auth: mis. `getCat(supabase, catId)`; jika null, throw “Cat not found” yang ramah. Jangan expose detail DB.
- Validasi UUID untuk id yang dari client (regex atau library) agar tidak kirim string sembarang ke DB; batasi panjang string input (title, details, note) untuk mengurangi risiko.

---

### 5.3 Login tidak menghormati redirectTo

**Temuan:** Middleware set `redirectTo` di URL login, tapi `app/(auth)/login/page.tsx` selalu `router.push("/dashboard")` setelah sukses. Redirect setelah login mengabaikan tujuan asli.

**Rekomendasi:**

- Di halaman login (client), baca `searchParams.redirectTo` (dari props atau `useSearchParams()`).
- Setelah `signInWithPassword` sukses: `router.push(redirectTo && isInternalPath(redirectTo) ? redirectTo : "/dashboard")`, dengan `isInternalPath` yang hanya mengizinkan path internal (mis. dimulai dengan `/`, tidak `//evil.com`), untuk mencegah open redirect.

---

## 6. Missing validation

### 6.1 Health log: type dan date

**Temuan:** `addHealthLog` tidak memvalidasi `type` terhadap enum `health_type`; `date` dan `next_due_date` tidak dicek format/range. DB akan menolak type invalid, tapi pesan error bisa kurang ramah.

**Rekomendasi:**

- Validasi `type` terhadap daftar yang sama dengan enum (dari `lib/constants.ts`); throw pesan jelas jika invalid.
- Validasi date: gunakan `isValidDateString(date)` dan, jika perlu, pastikan `date` tidak di masa depan untuk “last administered” (kebijakan bisnis). Untuk `next_due_date`, terima null atau tanggal valid.

---

### 6.2 Logs: date format

**Temuan:** `addGroomingLog`, `updateGroomingLog`, `bulkSetGroomingDate`, `setNextDueDate`, dll. menerima `date` dari form tanpa validasi format. Nilai invalid bisa menyebabkan error DB atau data aneh.

**Rekomendasi:**

- Gunakan helper `parseDateISO` / `isValidDateString` di `lib/dates.ts`; untuk setiap field date, parse dulu dan throw “Format tanggal tidak valid” jika invalid.

---

### 6.3 acceptSuggestedStatus: status_manual

**Temuan:** `status` ditulis langsung ke `status_manual` tanpa whitelist. Bisa menyimpan string arbitrer (meskipun React melindungi dari XSS saat render).

**Rekomendasi:**

- Batasi nilai yang boleh: mis. hanya `SuggestedStatus` ("Needs Attention" | "Monitor" | "Healthy") atau tambah “Dismissed” jika itu pilihan UI. Validasi di action dan tolak nilai lain.

---

### 6.4 Inventory: reason enum

**Temuan:** `adjustInventoryStock` menerima `reason` dari form tanpa validasi terhadap enum `PURCHASE | USAGE | ADJUSTMENT`. DB akan error jika nilai salah.

**Rekomendasi:**

- Validasi `reason` terhadap `INVENTORY_MOVEMENT_REASONS` (dari constants); throw pesan yang jelas.

---

### 6.5 Bulk actions: JSON payload dan struktur

**Temuan:** `bulkUpdateCats`, `bulkAddHealthLog`, `bulkSetGroomingDate`, dll. memakai `JSON.parse(catIdsRaw)` atau `JSON.parse(payloadRaw)` tanpa try/catch. Input tidak valid (bukan JSON) akan throw dan error tidak ramah.

**Rekomendasi:**

- Wrap dalam try/catch; throw “Data tidak valid” atau “Format daftar kucing tidak valid”.
- Validasi hasil parse: array of strings (untuk cat_ids), array of `{ catId, logId }` untuk grooming, dll. Batasi panjang array (mis. max 100 id) untuk mencegah abuse.

---

## 7. Edge cases

### 7.1 updateCat: id bukan UUID / cat tidak ada

**Temuan:** Jika client mengirim `id` yang bukan UUID atau UUID yang tidak ada, `supabase.from("cats").update(...).eq("id", id)` bisa mengupdate 0 baris. Kode tidak cek `error` atau jumlah row; hanya `if (error) throw error`. User bisa dapat “sukses” tanpa perubahan.

**Rekomendasi:**

- Setelah update, cek `data`/count jika Supabase mengembalikan; atau lakukan select-by-id dulu, jika null throw “Kucing tidak ditemukan”. Beri feedback jelas ke user.

---

### 7.2 createCat: konflik cat_id unique

**Temuan:** Jika `cat_id` sudah ada, insert akan error. Pesan error dari Supabase bisa teknis.

**Rekomendasi:**

- Tangkap error; jika code/constraint unique violation, throw “Cat ID sudah dipakai. Pilih ID lain.” (atau pesan serupa). Jangan expose raw DB message ke client.

---

### 7.3 Photo URL: SSRF / content security

**Temuan:** `updateCat` menerima `photo_url` dari form; hanya dicek “harus dimulai dengan http:// atau https://”. URL bisa mengarah ke resource internal atau skema lain (file:, dll.) tergantung di mana URL ini dipakai.

**Rekomendasi:**

- Whitelist skema: hanya `https:` (dan mungkin `http:` di dev). Validasi host jika perlu (mis. hanya domain yang diizinkan). Untuk `<img src={photo_url}>`, CSP dan kebijakan referrer bisa membatasi; tetap batasi input.

---

### 7.4 bulkSetGroomingDate: partial failure

**Temuan:** Loop `for (const { catId, logId } of items)` insert/update per item; jika salah satu gagal, ada yang sudah terpersisten dan ada yang tidak, tanpa transaksi atau rollback.

**Rekomendasi:**

- Ideal: gunakan transaksi (Supabase/Postgres transaction) atau RPC yang melakukan semua insert/update dalam satu transaksi. Jika tidak bisa, minimal dokumentasikan “best effort” dan pertimbangkan mengembalikan daftar yang gagal agar UI bisa menampilkan “sebagian berhasil, id berikut gagal”.

---

### 7.5 Weight bounds

**Temuan:** `addWeightLog` memvalidasi “positive number” tapi tidak batas atas (mis. 999 kg). Secara teknis bisa input ekstrem.

**Rekomendasi:** Tambah validasi range (mis. 0 < weight_kg <= 50 atau sesuai kebijakan) dan pesan error yang jelas.

---

## 8. Ringkasan prioritas perbaikan

| Prioritas | Area              | Tindakan singkat |
|----------|-------------------|-------------------|
| Tinggi   | Security          | Validasi env; gunakan redirectTo di login dengan aman; batasi status_manual dan photo URL. |
| Tinggi   | Validation        | Validasi type/date/reason di logs & inventory; validasi JSON + ukuran array di bulk actions. |
| Tinggi   | UX / correctness  | acceptSuggestedStatus throw jika input kosong; updateCat/reports revalidate; feedback jika update 0 rows. |
| Sedang   | Separation        | Pindah fetch/transform ke lib/data; helper revalidate; requireAdmin wrapper. |
| Sedang   | Duplikasi         | Constants + lib/dates; satu sumber label; form parsing/schema. |
| Rendah   | Naming / minor    | Ganti `catById` → `categoryIdToName` di shell; batasi weight range; dokumentasi partial failure bulk. |

Dokumen ini bisa dipakai sebagai backlog refactor dan hardening; disarankan mulai dari security dan validation, lalu separation of concerns dan abstraksi.
