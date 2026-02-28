# Session lama: client tidak perlu login lagi

Agar pengguna **tidak diminta login ulang** (session bertahan lama), atur di **Supabase Dashboard**:

## Langkah

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → pilih **project** Anda.
2. Menu kiri: **Authentication** → **Settings** (atau **Project Settings** → **Auth**).
3. Cari **JWT expiry** / **JWT Expiry limit**.
4. Isi nilai (dalam **detik**):
   - **`2592000`** = **30 hari** (disarankan untuk tool internal)
   - `604800` = 7 hari  
   - `86400` = 1 hari
5. Klik **Save**.

Setelah disimpan, session baru (setelah login berikutnya) akan berlaku sesuai nilai di atas. Aplikasi juga melakukan refresh session otomatis setiap 10 menit di client sehingga token tetap diperbarui.

**Catatan:** Perubahan hanya berlaku untuk session **baru**. User yang sudah login perlu **logout lalu login lagi** sekali agar pakai setting baru.
