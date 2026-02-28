-- Kategori aktivitas: array multi-pilih (Bersih-Bersih, Potong Kuku, Grooming, Ngepel, Ganti Filter Tempat Minum).

alter table public.daily_activities
  add column if not exists categories text[] not null default '{}';
