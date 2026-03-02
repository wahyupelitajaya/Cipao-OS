# Agar Pesan WhatsApp Muncul di Halaman Aktivitas

Ikuti langkah berikut **berurutan** untuk memastikan pesan WA masuk dan tampil di Aktivitas.

---

## 1. Pastikan webhook dipanggil Meta

Saat Anda mengirim pesan ke nomor WhatsApp Business dari **nomor uji**:

- Meta mengirim **POST** ke: `https://NAMA-PROJECT-ANDA.vercel.app/api/webhooks/whatsapp`
- Jika webhook tidak dipanggil, activity tidak akan pernah terbentuk.

**Cek:**

1. Buka **Vercel** → project Anda → **Logs** (atau **Deployments** → klik deploy terbaru → **Functions** / **Runtime Logs**).
2. Dari HP (nomor uji), kirim **satu pesan teks** ke nomor WhatsApp Business.
3. Dalam 1–2 menit, lihat apakah ada **request ke `/api/webhooks/whatsapp`** (method POST) di log.
   - **Ada request** → lanjut ke langkah 2.
   - **Tidak ada request** → webhook tidak dipanggil. Pastikan:
     - Nomor pengirim sudah didaftar sebagai **nomor uji** di Meta (WhatsApp → API Setup).
     - Field **messages** sudah di-subscribe di WhatsApp → Configuration.
     - App masih Development: hanya nomor uji yang memicu webhook.

---

## 2. Pastikan env `SUPABASE_SERVICE_ROLE_KEY` ada di Vercel

Tanpa ini, insert ke database gagal (dan activity tidak muncul).

**Cek:**

1. Vercel → **Settings** → **Environment Variables**.
2. Pastikan ada variable **`SUPABASE_SERVICE_ROLE_KEY`** (nama persis, tanpa typo).
3. Value = **service_role** key dari Supabase (Project Settings → API → service_role → Reveal → Copy).
4. Setelah ubah, **Redeploy** (Deployments → ⋮ → Redeploy).

Jika key salah/tidak ada, di Vercel Logs bisa muncul error seperti `SUPABASE_SERVICE_ROLE_KEY is not set` atau error insert dari Supabase.

---

## 3. Cek apakah data masuk ke Supabase

**Cek:**

1. Buka **Supabase Dashboard** → project Anda → **Table Editor**.
2. Buka tabel **`daily_activities`**.
3. Urutkan / filter berdasarkan **`created_at`** (terbaru di atas).
4. Cari baris yang kolom **`note`**-nya berisi **`[WhatsApp]`**.

- **Ada baris dengan `[WhatsApp]`** → data tersimpan. Lanjut ke langkah 4 (tampilan di website).
- **Tidak ada** → insert gagal. Buka **Vercel → Logs** setelah kirim pesan, cek ada error `[WhatsApp webhook] insert error:` atau error dari Supabase. Pastikan RLS tidak memblok service role (service role bypass RLS). Pastikan kolom `date`, `time_slots`, `locations`, `cat_ids`, `activity_type`, `note` sesuai skema.

---

## 4. Pastikan tanggal yang dipilih di halaman Aktivitas

Activity dari WhatsApp disimpan dengan **tanggal hari ini (WITA, UTC+8)**. Jika Anda buka Aktivitas dan pilih tanggal kemarin/besok, activity hari ini tidak akan terlihat.

**Cek:**

1. Buka website → login → **Aktivitas**.
2. Di kalender, pilih **tanggal hari ini** (hari di mana Anda mengirim pesan uji).
3. Panel kanan menampilkan aktivitas **untuk tanggal itu**. Cari item yang note-nya **`[WhatsApp] 62xxx: ...`**.

- **Muncul** → integrasi jalan.
- **Tidak muncul** padahal di Supabase ada baris `[WhatsApp]` untuk hari ini:
  - **Refresh** halaman (F5 atau reload).
  - Pastikan Anda memilih **tanggal yang sama** dengan kolom **`date`** di baris tersebut di Supabase (format YYYY-MM-DD).

---

## 5. Ringkasan checklist

| No | Cek | Yang dilakukan |
|----|-----|----------------|
| 1 | Webhook dipanggil | Kirim pesan dari nomor uji → cek Vercel Logs ada POST ke `/api/webhooks/whatsapp`. |
| 2 | Env Supabase | `SUPABASE_SERVICE_ROLE_KEY` ada di Vercel, lalu Redeploy. |
| 3 | Data di DB | Supabase → `daily_activities` → ada baris dengan `note` berisi `[WhatsApp]`. |
| 4 | Tanggal di halaman | Buka Aktivitas → pilih **tanggal hari ini** (WITA) → refresh jika perlu. |

---

## Perubahan teknis: tanggal WITA

Agar activity WhatsApp tampil di **hari yang sama** dengan yang Anda lihat, webhook menyimpan **tanggal hari ini dalam WITA (UTC+8)**. Jadi ketika Anda buka Aktivitas dan pilih “hari ini”, activity dari WA akan muncul di tanggal yang benar.
