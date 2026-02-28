# Session lama: client tidak perlu login lagi

Agar pengguna **tidak diminta login ulang** (session bertahan lama), atur **Access token expiry** di **Supabase Dashboard**:

## Langkah

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → pilih **project** Anda.
2. Klik **ikon gear (⚙️)** di menu kiri bawah → **Project Settings**.
3. Di menu kiri **Project Settings**, pilih **JWT** (bukan Authentication → Settings).
4. Cari **"Access token expiry time"** / **"JWT expiry"** (nilai dalam **detik**).
5. Isi nilai, misalnya:
   - **`604800`** = **7 hari** (maksimal yang umum tersedia)
   - `86400` = 1 hari
   - (Default sering 3600 = 1 jam)
6. Klik **Save**.

Setelah disimpan, session baru (setelah login berikutnya) akan berlaku sesuai nilai di atas. Aplikasi juga melakukan refresh session otomatis setiap 10 menit di client sehingga token tetap diperbarui.

**Catatan:** Perubahan hanya berlaku untuk session **baru**. User yang sudah login perlu **logout lalu login lagi** sekali agar pakai setting baru.

---

**Jika tidak ada opsi JWT / Access token expiry:** Beberapa project Supabase menampilkan JWT di **Project Settings → JWT**. Jika di sana hanya ada rate limit (token refreshes, sign-ins, dll.), kemungkinan JWT expiry di project Anda tidak bisa diubah (default 1 jam) atau ada di halaman lain. Pastikan Anda membuka **Project Settings** (ikon gear) → **JWT**, bukan **Authentication → Settings**.
