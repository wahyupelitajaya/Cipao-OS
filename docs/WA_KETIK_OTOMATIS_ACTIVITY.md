# Agar Ketik di WA di HP → Activity Terisi Otomatis

Alur: **Anda ketik pesan di WhatsApp (HP) → kirim ke nomor bisnis → Meta memanggil webhook → activity tersimpan.**

Kode webhook sudah siap. Yang perlu dipastikan: **Meta mengirim POST ke webhook** setiap ada pesan masuk. Ikuti ini:

---

## 1. Di Meta: Callback URL & Verify token

- Buka [developers.facebook.com](https://developers.facebook.com) → **My Apps** → pilih app.
- **WhatsApp** → **Configuration**.
- **Callback URL:** `https://cipao-os.vercel.app/api/webhooks/whatsapp`
- **Verify token:** isi dengan nilai **sama persis** dengan env **WHATSAPP_VERIFY_TOKEN** di Vercel (mis. `Cipaoos-wh-verify-123`).
- Klik **Verify and Save** (harus sukses).

---

## 2. Subscribe field "messages"

- Di halaman yang sama (**WhatsApp** → **Configuration**).
- **Webhook fields** → centang **messages** → **Save**.

Tanpa ini Meta tidak mengirim event pesan ke URL Anda.

---

## 3. Daftarkan nomor HP Anda sebagai nomor uji

Di mode Development, **hanya nomor uji** yang memicu webhook.

- **WhatsApp** → **API Setup** (atau Getting started).
- Cari **"Add phone number"** / **"To"** / **"Manage phone number list"**.
- Tambah **nomor WhatsApp Anda** (format: `62xxxxxxxxxx`, tanpa + dan tanpa 0 di depan).
- Masukkan **kode OTP** yang dikirim Meta ke HP Anda.
- Pastikan nomor itu berstatus terverifikasi / tercantum sebagai tester.

---

## 4. Pastikan nomor WhatsApp Business aktif

- Di **API Setup** ada **nomor telepon** yang dipakai sebagai "From" (nomor bisnis).
- Itulah nomor yang **menerima** pesan. Pastikan nomor ini sudah verifikasi dan aktif.

---

## 5. Cara pakai (ketik di WA → activity terisi)

1. Buka **WhatsApp di HP** (pakai nomor yang sudah didaftar sebagai **nomor uji** di langkah 3).
2. Kirim **chat ke nomor WhatsApp Business** Anda (nomor di langkah 4).
3. Ketik **pesan teks** apa saja → kirim.
4. Dalam beberapa detik, **buka website** → **Aktivitas** → pilih **tanggal hari ini**.
5. Activity baru akan muncul dengan format: `[WhatsApp] 62xxxxxxxxxx: isi pesan Anda`.

---

## Ringkasan

| Yang | Keterangan |
|------|------------|
| Callback URL | `https://cipao-os.vercel.app/api/webhooks/whatsapp` (sudah benar di kode) |
| Verify token | Sama dengan WHATSAPP_VERIFY_TOKEN di Vercel |
| Subscribe | Field **messages** harus centang |
| Pengirim | Harus **nomor uji** yang sudah didaftar + verifikasi OTP di Meta |
| Penerima | **Nomor WhatsApp Business** yang dipakai di app |

Jika semua ini sudah benar, **tinggal ketik di WA di HP** (dari nomor uji ke nomor bisnis) → activity terisi otomatis.

---

## Kalau pesan tidak jadi activity

- Cek **Vercel → Logs**: apakah ada **POST** ke `/api/webhooks/whatsapp` saat Anda kirim pesan?
  - **Tidak ada POST** → Meta tidak memanggil webhook. Cek lagi langkah 1–4 (terutama nomor uji + subscribe messages).
  - **Ada POST, status 200** → Cek **Supabase** tabel `daily_activities` apakah ada baris baru dengan `note` berisi `[WhatsApp]`. Kalau ada, cek di halaman Aktivitas pilih **tanggal hari ini (WITA)**.
