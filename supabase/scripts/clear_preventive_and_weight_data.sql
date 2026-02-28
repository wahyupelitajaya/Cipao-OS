-- Hapus semua data vaksin, flea, deworm (health_logs) dan berat badan (weight_logs)
-- agar bisa input ulang manual dari website.
-- Jalankan di Supabase Dashboard → SQL Editor → New query → Run.

-- 1. Hapus log health tipe VACCINE, FLEA, DEWORM
DELETE FROM public.health_logs
WHERE type IN ('VACCINE', 'FLEA', 'DEWORM');

-- 2. Hapus semua log berat badan
DELETE FROM public.weight_logs;
