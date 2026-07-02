-- Tambah status kucing "meninggal" (kucing yang sudah meninggal).
-- Kucing dengan status ini sebaiknya is_active = false (diterapkan di aplikasi saat update).

alter table public.cats
  drop constraint if exists cats_status_check;

alter table public.cats
  add constraint cats_status_check
  check (status is null or status in (
    'sehat', 'membaik', 'memburuk', 'hampir_sembuh', 'observasi', 'sakit', 'meninggal'
  ));
