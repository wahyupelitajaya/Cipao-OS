-- Hapus profil admin, owner, groomer yang pernah di-insert manual/dari sync.
--
-- PERINGATAN: Menghapus profil OWNER akan memicu CASCADE DELETE:
--   profiles (owner) dihapus → semua baris di cats dengan owner_id = id itu ikut terhapus
--   → health_logs, weight_logs, grooming_logs (referensi ke cats) ikut terhapus.
-- Jadi data kucing dan log akan HILANG. Jangan jalankan ini kalau kamu mau tetap simpan data.
--
-- Setelah ini, user tetap bisa login di Auth, tapi app tidak dapat role.
-- Untuk restore: jalankan ulang seed.sql (dengan UUID yang benar).

delete from public.profiles
where email in (
  'wahyu@admin.sb',
  'cc@owner.sb',
  'ivan@groomer.sb'
);
