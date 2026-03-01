# Panduan Pemula: WhatsApp Cloud API → Activity

Pesan yang dikirim ke nomor WhatsApp Business Anda akan otomatis tersimpan sebagai **Activity** di website (halaman Aktivitas). Panduan ini untuk pemula, langkah demi langkah.

---

## Yang Anda Butuhkan

- Akun **Meta for Developers** (gratis)
- Akun **Supabase** (project yang dipakai website ini)
- Website sudah **deploy di Vercel** (supaya punya URL tetap untuk webhook)

---

## BAGIAN A: Siapkan Environment Variables (Vercel + Supabase)

### Langkah A1: Buat “Verify Token” untuk WhatsApp

Ini seperti kata sandi rahasia yang nanti Anda isikan di Meta dan di Vercel. Harus sama persis di kedua tempat.

1. Buat string acak (boleh pakai [random.org](https://www.random.org/strings/) atau cukup ketik huruf/angka panjang).
   - Contoh: `mySecretVerifyToken2024Webhook`
2. **Simpan** string ini di notepad; Anda akan pakai lagi di **Langkah B3**.

---

### Langkah A2: Ambil “Service Role Key” dari Supabase

Key ini dipakai agar webhook (tanpa login user) bisa menulis data ke database.

1. Buka browser → [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Login → pilih **project** yang dipakai untuk website ini.
3. Di menu kiri bawah, klik **Project Settings** (ikon gerigi).
4. Di menu kiri, pilih **API**.
5. Scroll ke bagian **Project API keys**.
6. Anda akan lihat dua key:
   - **anon / public** — ini yang biasa dipakai website (sudah ada di env).
   - **service_role** — ini yang kita butuhkan.  
     Klik **Reveal** di samping service_role, lalu **Copy** (salin) key-nya.
7. **Simpan** key ini di tempat aman (jangan share atau commit ke GitHub). Anda akan paste di Vercel di Langkah A3.

---

### Langkah A3: Isi Environment Variables di Vercel

1. Buka [https://vercel.com](https://vercel.com) → login → pilih **project** website Anda.
2. Klik tab **Settings**.
3. Di menu kiri, klik **Environment Variables**.
4. Tambah **dua** variable berikut (klik “Add” / “Add New” untuk tiap satu):

   **Variable 1:**
   - **Name:** `WHATSAPP_VERIFY_TOKEN`
   - **Value:** (paste string yang Anda buat di Langkah A1, mis. `mySecretVerifyToken2024Webhook`)
   - **Environment:** centang Production (dan Preview jika mau tes di preview deploy).

   **Variable 2:**
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** (paste Service Role Key dari Langkah A2)
   - **Environment:** centang Production (dan Preview jika perlu).

5. Klik **Save**.
6. **Redeploy** project (Deployments → tiga titik pada deploy terbaru → Redeploy), supaya env baru terbaca.

Setelah ini, website Anda sudah punya dua rahasia: Verify Token untuk Meta, dan Service Role Key untuk tulis data ke Supabase.

---

## BAGIAN B: Setup WhatsApp Cloud API di Meta

### Langkah B1: Buka Meta for Developers dan buat/pilih App

1. Buka [https://developers.facebook.com](https://developers.facebook.com)
2. Login dengan akun Facebook Anda.
3. Klik **My Apps** (pojok kanan atas).
4. **Jika belum punya app:** klik **Create App** → pilih tipe **Business** → isi nama app → Create App.
5. **Jika sudah punya app:** pilih app yang akan dipakai untuk WhatsApp.

---

### Langkah B2: Tambah produk “WhatsApp”

1. Di dashboard app, cari bagian **Products** (atau “Add Products to Your App”).
2. Cari **WhatsApp** → klik **Set up** atau **Add**.
3. Setelah ditambah, Anda akan punya menu **WhatsApp** di sidebar kiri.

---

### Langkah B3: Isi Callback URL dan Verify Token (Webhook)

1. Di sidebar kiri, klik **WhatsApp** → **Configuration** (atau **Webhook**).
2. Anda akan lihat kolom:
   - **Callback URL**
   - **Verify token**

3. **Callback URL** — isi dengan URL webhook website Anda:
   ```
   https://NAMA-PROJECT-ANDA.vercel.app/api/webhooks/whatsapp
   ```
   Ganti `NAMA-PROJECT-ANDA` dengan nama project Vercel Anda.  
   Contoh: jika project Anda `cat-operational-system`, maka:
   ```
   https://cat-operational-system.vercel.app/api/webhooks/whatsapp
   ```

4. **Verify token** — isi dengan **string yang sama persis** dengan nilai `WHATSAPP_VERIFY_TOKEN` di Vercel (Langkah A1).  
   Contoh: `mySecretVerifyToken2024Webhook`

5. Klik **Verify and Save**.  
   - Meta akan mengirim request **GET** ke URL Anda. Backend kita akan memeriksa token dan menjawab dengan “challenge” yang benar.  
   - Jika berhasil, Anda akan lihat tanda/status bahwa webhook **Verified**.  
   - Jika gagal: cek lagi bahwa URL benar, env `WHATSAPP_VERIFY_TOKEN` sudah di-set di Vercel, dan project sudah di-redeploy.

---

### Langkah B4: Subscribe ke “messages”

1. Masih di halaman **WhatsApp → Configuration** (atau Webhook).
2. Cari bagian **Webhook fields** (atau “Subscribe to fields”).
3. Centang **messages** (agar Meta mengirim event setiap ada pesan masuk).
4. Simpan jika ada tombol Save.

Sekarang Meta akan memanggil URL Anda setiap ada pesan masuk ke nomor yang terhubung.

---

### Langkah B5: Hubungkan nomor WhatsApp (API Setup)

1. Di sidebar, buka **WhatsApp** → **API Setup** (atau “Getting Started”).
2. Di bagian **Phone numbers**, pilih atau tambah nomor telepon yang akan dipakai untuk menerima pesan.
3. Ikuti langkah verifikasi nomor sesuai yang diminta Meta (biasanya kode OTP lewat SMS/WhatsApp).
4. Setelah nomor terhubung, setiap **pesan teks yang dikirim ke nomor ini** akan memicu webhook ke website Anda.

---

## Pesan “Apps will only be able to receive test webhooks…” (Bukan Error)

Setelah Anda klik **Verify and Save**, kadang Meta menampilkan kalimat seperti:

> “Apps will only be able to receive test webhooks sent from the app dashboard while the app is unpublished. No production data, including from app admins, developers or testers, will be delivered unless the app has been published.”

**Ini bukan error.** Artinya:

- **Verifikasi webhook Anda biasanya sudah berhasil** (Callback URL dan Verify token sudah benar).
- Selama app masih **Development / Unpublished**:
  - Webhook **hanya** menerima **test event** yang Anda kirim dari dashboard Meta (tombol “Send test message” / test webhook).
  - Pesan WhatsApp **asli dari pengguna** (production) **belum** dikirim ke URL Anda sampai app dipublish atau di-set ke mode production.

**Yang bisa Anda lakukan:**

1. **Untuk tes dulu (tanpa publish):**  
   Di **WhatsApp → Configuration**, cari opsi **“Send to my webhook”** / **“Test”** / **“Send test message”**. Pakai itu untuk mengirim event uji ke URL Anda; cek apakah website Anda menerima dan menyimpan Activity (mis. cek log Vercel atau tabel `daily_activities` di Supabase).

2. **Agar pesan WhatsApp sungguhan masuk ke webhook:**  
   App harus dipindah ke **Live** / **Published** (dan memenuhi syarat Meta, mis. kebijakan privasi, penggunaan bisnis). Setelah app Live, pesan yang dikirim ke nomor WhatsApp Business Anda akan dikirim ke callback URL dan tersimpan sebagai Activity.

Jadi: anggap pesan itu sebagai **informasi**, bukan kegagalan. Jika tidak ada error merah dan status webhook “Verified”, langkah Verify and Save sudah berhasil.

---

## BAGIAN C: Cek Apakah Semuanya Jalan

### C1: Cek verifikasi webhook (GET)

1. Buka browser, buka URL berikut (ganti `DOMAIN_ANDA` dan `TOKEN_ANDA`):
   ```
   https://DOMAIN_ANDA.vercel.app/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=TOKEN_ANDA&hub.challenge=12345
   ```
   Contoh:
   ```
   https://cat-operational-system.vercel.app/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=mySecretVerifyToken2024Webhook&hub.challenge=12345
   ```
2. Halaman harus menampilkan **hanya angka** `12345` (tanpa tanda kutip).  
   Jika muncul angka itu = verifikasi GET jalan dengan benar.

---

### C2: Tes pesan masuk → Activity

1. Dari ponsel (bisa nomor pribadi), kirim **pesan teks** ke nomor WhatsApp Business yang tadi Anda hubungkan di Langkah B5.
2. Buka website Anda → masuk (login) → buka halaman **Aktivitas**.
3. Pilih **tanggal hari ini**.
4. Anda harus melihat **activity baru** dengan deskripsi mirip:  
   `[WhatsApp] 628xxxxxxxxxx: isi pesan Anda`  
   Itu artinya pesan WhatsApp sudah tersimpan otomatis sebagai Activity.

---

## Ringkasan Urutan

| Urutan | Apa yang dilakukan |
|--------|--------------------|
| A1 | Buat Verify Token, simpan |
| A2 | Ambil Service Role Key dari Supabase, simpan |
| A3 | Isi `WHATSAPP_VERIFY_TOKEN` dan `SUPABASE_SERVICE_ROLE_KEY` di Vercel → Save → Redeploy |
| B1 | Login Meta for Developers, buat/pilih App |
| B2 | Tambah produk WhatsApp |
| B3 | Isi Callback URL + Verify Token → Verify and Save |
| B4 | Subscribe field **messages** |
| B5 | Hubungkan nomor WhatsApp di API Setup |
| C1 | Tes URL verifikasi di browser (harus dapat angka challenge) |
| C2 | Kirim pesan ke nomor WA → cek halaman Aktivitas (harus ada activity baru) |

---

## Jika Ada Masalah

- **Webhook “Verify” gagal:** 1) Nama env di Vercel harus persis: `WHATSAPP_VERIFY_TOKEN`. 2) Nilai token di Vercel dan di Meta (Verify token) harus sama persis, tanpa spasi. 3) Setelah ubah env, wajib Redeploy di Vercel. 4) Tes di browser: `https://PROJECT-ANDA.vercel.app/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=TOKEN_ANDA&hub.challenge=12345` — halaman harus menampilkan angka `12345` saja.
- **Pesan tidak jadi Activity:** Cek env `SUPABASE_SERVICE_ROLE_KEY` sudah di-set di Vercel; cek tab Deployments → Function logs / Runtime logs untuk error.
- **Nomor belum bisa dipakai:** Selesaikan verifikasi nomor di Meta (API Setup) dan pastikan pakai nomor yang mendukung WhatsApp Business API.

Dokumen teknis singkat (env, keamanan, struktur payload) tetap ada di **WHATSAPP_WEBHOOK.md**.
