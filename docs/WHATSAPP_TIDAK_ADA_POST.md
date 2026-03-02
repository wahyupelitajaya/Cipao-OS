# Tidak Ada Request POST ke Webhook — Cara Perbaiki

Jika di Vercel Logs **tidak ada** request POST ke `/api/webhooks/whatsapp` saat Anda kirim pesan WhatsApp, artinya **Meta tidak memanggil** webhook. Penyebab hampir selalu di pengaturan Meta / nomor uji.

---

## 1. Pastikan field "messages" di-subscribe

1. Buka [developers.facebook.com](https://developers.facebook.com) → **My Apps** → pilih app Anda.
2. **WhatsApp** → **Configuration** (atau **Webhook**).
3. Di bagian **Webhook fields**, pastikan **messages** **centang** (subscribed).
4. Jika belum, centang → **Save**.

Tanpa subscribe "messages", Meta tidak akan mengirim event pesan masuk ke URL Anda.

---

## 2. Tambah nomor Anda sebagai nomor uji (wajib di mode Development)

Di mode Development, **hanya pesan yang melibatkan nomor uji** yang memicu webhook.

1. Masih di app Meta → **WhatsApp** → **API Setup** (atau **Getting started**).
2. Cari bagian **"To"** / **"Send and receive messages"** / **"Phone numbers"** atau **"Manage phone number list"**.
3. **Add phone number** / **Add** → masukkan **nomor ponsel Anda** (yang akan dipakai untuk kirim pesan uji).
   - Format: kode negara + nomor, **tanpa + dan tanpa 0 di depan**.
   - Contoh: `6281234567890`.
4. Meta mengirim **kode verifikasi** (WhatsApp atau SMS) ke nomor itu. **Masukkan kode** di dashboard.
5. Setelah sukses, nomor Anda tercatat sebagai **penguji** (tester).

Hanya nomor yang sudah didaftar dan terverifikasi seperti ini yang akan memicu webhook saat mengirim/menerima pesan.

---

## 3. Kirim pesan dari nomor uji → ke nomor WhatsApp Business

1. Dari **ponsel yang tadi didaftar** (nomor uji), buka **WhatsApp**.
2. Kirim pesan **ke nomor WhatsApp Business** yang terhubung ke app (nomor yang muncul di **API Setup** sebagai "From" / nomor bisnis).
3. Pesan harus **teks** (bukan hanya gambar/voice note tanpa teks).
4. Tunggu 10–30 detik.

Lalu cek lagi **Vercel → Logs**: harus ada **request POST** ke `/api/webhooks/whatsapp`. Jika masih tidak ada, lanjut poin 4.

---

## 4. Cek nomor WhatsApp Business yang dipakai

1. Di **WhatsApp** → **API Setup**, lihat **nomor telepon** yang dipakai (biasanya ada "From" atau daftar nomor).
2. Pastikan Anda mengirim **ke nomor itu persis** (format internasional, mis. 62xxx).
3. Pastikan nomor bisnis sudah **verifikasi** (ada centang hijau / status aktif di dashboard).

---

## 5. Tes kirim dari dashboard Meta (opsional)

Beberapa app punya opsi **"Send test message"** atau **"Test"** di halaman Webhook / Configuration. Coba pakai itu; jika berhasil, di Logs akan muncul POST. Itu membuktikan webhook jalan; kalau dari HP tidak, berarti pengirim/sumber pesan belum memenuhi syarat (mis. belum nomor uji).

---

## Ringkasan

| Yang dicek | Tindakan |
|------------|----------|
| Subscribe "messages" | WhatsApp → Configuration → Webhook fields → **messages** centang → Save. |
| Nomor uji | WhatsApp → API Setup → Add phone number → masukkan nomor Anda → verifikasi OTP. |
| Arah pesan | Kirim **dari nomor uji** **ke nomor WhatsApp Business** (teks). |
| Nomor bisnis | Pastikan nomor di API Setup aktif dan Anda mengirim ke nomor itu. |

Setelah semua ini, kirim lagi satu pesan teks dari nomor uji ke nomor bisnis, lalu cek Vercel Logs untuk request POST.
