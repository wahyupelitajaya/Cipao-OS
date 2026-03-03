# Supaya pesan WA masuk ke Kotak masuk (bukan langsung ke Activity)

Webhook di kode **hanya** menulis ke tabel `whatsapp_inbox` (kotak masuk). Tidak ada insert ke `daily_activities` di file `app/api/webhooks/whatsapp/route.ts`.

Jika pesan masih langsung masuk ke Activity, artinya **yang jalan di server masih kode lama**. Lakukan ini:

## 1. Pastikan migration inbox sudah jalan

Di Supabase (project yang dipakai production):

- Buka **SQL Editor**, jalankan isi file:
  `supabase/migrations/20250228000000_whatsapp_inbox.sql`
- Atau pakai: `npx supabase db push` (jika project sudah ter-link).

## 2. Deploy ulang di Vercel

- **Opsi A:** Commit + push semua perubahan ke branch yang dipakai Vercel (biasanya `main`). Vercel akan auto-deploy.
- **Opsi B:** Di Vercel Dashboard → project → **Deployments** → titik tiga pada deployment terbaru → **Redeploy** (centang "Use existing Build Cache" **jangan** dicentang agar build benar-benar baru).

## 3. Cek bahwa kode baru yang jalan

Setelah deploy selesai:

1. Kirim **satu pesan** dari WhatsApp ke nomor Business.
2. Buka **Vercel → project → Logs**.
3. Cari log: `Menyimpan ke kotak masuk (whatsapp_inbox) saja, tidak ke Activity.`

- **Kalau log itu muncul:** kode baru sudah jalan. Pesan seharusnya hanya masuk ke **Koneksi WhatsApp → Kotak masuk WA**, tidak otomatis ke Activity. Kalau tetap masuk Activity, cek apakah ada service/script lain yang baca dari inbox dan menulis ke Activity.
- **Kalau log itu tidak muncul:** yang jalan masih build lama. Coba redeploy lagi tanpa cache, atau pastikan branch yang di-deploy berisi perubahan terbaru.

## 4. Cek Kotak masuk di web

- Login sebagai **admin**.
- Buka **Koneksi WhatsApp**.
- Lihat bagian **Kotak masuk WA (penampungan sementara)**.
- Pesan dari WA seharusnya muncul di sini; pindah ke Activity hanya setelah admin klik **Proses ke Activity**.
