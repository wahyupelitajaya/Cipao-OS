# Integrasi WhatsApp Cloud API → Activity

Pesan masuk ke nomor WhatsApp Business (Cloud API) akan otomatis disimpan sebagai **Activity** di halaman Aktivitas (tanggal hari ini, waktu mengikuti jam server).

## 1. Yang sudah ada di project

- **Route webhook:** `POST` dan `GET` di `/api/webhooks/whatsapp`
- **Simpan ke Supabase:** tabel `daily_activities` (date, time_slots, locations, note, dll.)
- **Client admin:** `lib/supabaseAdmin.ts` memakai `SUPABASE_SERVICE_ROLE_KEY` agar bisa insert tanpa user login (bypass RLS).

## 2. Environment variables

Di **Vercel** (dan lokal untuk tes) set:

| Variable | Wajib | Keterangan |
|----------|--------|------------|
| `WHATSAPP_VERIFY_TOKEN` | Ya | String rahasia untuk verifikasi webhook (buat sendiri, mis. string random panjang). |
| `SUPABASE_SERVICE_ROLE_KEY` | Ya (untuk webhook) | Dari Supabase: Project Settings → API → `service_role` (secret). Jangan pakai `NEXT_PUBLIC_`! |

Yang lain (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) sudah dipakai app; webhook butuh **service role** agar bisa insert ke `daily_activities` tanpa auth.

### Ambil Service Role Key di Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → pilih project.
2. **Project Settings** (ikon gear) → **API**.
3. Di bagian **Project API keys** ada **anon** (public) dan **service_role** (secret).
4. Klik **Reveal** pada service_role dan copy.
5. Di Vercel: **Settings → Environment Variables** → tambah:
   - `SUPABASE_SERVICE_ROLE_KEY` = (paste key)
   - `WHATSAPP_VERIFY_TOKEN` = (buat string rahasia, simpan untuk langkah Meta di bawah).

## 3. Setup di Meta (Facebook) Developer

1. Buka [developers.facebook.com](https://developers.facebook.com) → **My Apps** → buat app baru atau pilih app.
2. Tambah produk **WhatsApp** → **WhatsApp** (bawah "Products").
3. Di **WhatsApp → Configuration**:
   - **Callback URL:**  
     `https://<domain-vercel-anda>/api/webhooks/whatsapp`  
     Contoh: `https://cat-operational-system.vercel.app/api/webhooks/whatsapp`
   - **Verify token:** isi dengan **nilai yang sama** dengan env `WHATSAPP_VERIFY_TOKEN`.
4. Klik **Verify and Save**. Meta akan kirim **GET** ke URL di atas dengan query `hub.mode=subscribe`, `hub.verify_token=...`, `hub.challenge=...`. Backend kita akan cek token dan respond dengan `hub.challenge`; kalau cocok, status jadi “Verified”.
5. Di **Webhook fields**, subscribe **messages** (centang).
6. Simpan.

## 4. Hubungkan nomor WhatsApp (Meta)

- Di **WhatsApp → API Setup**: pilih/masukkan nomor telepon yang dipakai untuk Business API, selesaikan verifikasi nomor sesuai instruksi Meta.
- Setelah itu, pesan yang dikirim **ke** nomor tersebut akan memicu webhook **POST** ke callback URL di atas.

## 5. Alur pesan → Activity

1. Seseorang mengirim pesan **teks** ke nomor WhatsApp Business Anda.
2. Meta memanggil `POST /api/webhooks/whatsapp` dengan payload berisi `entry[].changes[].value.messages[]`.
3. Route kita:
   - Hanya memproses `type === "text"` dan `text.body`.
   - Mengisi **date** = hari ini (YYYY-MM-DD), **time_slots** = satu slot menurut jam (Pagi/Siang/Sore/Malam), **locations** = `["Rumah"]`, **activity_type** = `"Lainnya"`, **note** = `[WhatsApp] <nomor_pengirim>: <isi pesan>`.
   - Insert ke Supabase tabel `daily_activities` lewat client service role (bypass RLS).
4. Activity tampil di halaman **Aktivitas** seperti activity yang dibuat manual (tanggal hari ini, dengan note dari WA).

## 6. Testing

- **Verifikasi webhook (GET):**  
  `https://<domain>/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=<WHATSAPP_VERIFY_TOKEN>&hub.challenge=12345`  
  Harus mengembalikan body `12345` (plain text).
- **Pesan masuk:** kirim pesan teks ke nomor WhatsApp yang terhubung; cek di Supabase table `daily_activities` atau di halaman Aktivitas untuk baris dengan note `[WhatsApp] ...`.

## 7. Keamanan

- **WHATSAPP_VERIFY_TOKEN:** jangan commit ke repo; hanya di env (Vercel / .env.local).
- **SUPABASE_SERVICE_ROLE_KEY:** hanya di server (env tanpa `NEXT_PUBLIC_`); jangan dipakai di client.
- Webhook **POST** tidak memvalidasi signature Meta di contoh ini. Untuk production, sebaiknya validasi signature dengan **App Secret** (lihat [Meta webhook docs](https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests)).

## 8. Supabase – tidak perlu migration tambahan

- Tabel `daily_activities` sudah ada; kolom `created_by` boleh `null`, sehingga insert dari webhook (tanpa user login) valid.
- Insert dilakukan dengan **service role**, sehingga RLS tidak menghalangi; tidak perlu policy tambahan untuk webhook.
