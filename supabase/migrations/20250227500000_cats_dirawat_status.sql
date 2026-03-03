-- Kolom Status Dirawat (multi-select): tidak_ada_perubahan, ada_perubahan, parah, sedang, ringan, mau_makan, tidak_mau_makan, lemes, seger
alter table public.cats
  add column if not exists dirawat_status text[] default '{}';

comment on column public.cats.dirawat_status is 'Status detail saat dirawat (bisa lebih dari satu): tidak_ada_perubahan, ada_perubahan, parah, sedang, ringan, mau_makan, tidak_mau_makan, lemes, seger';

-- Constraint: setiap elemen array harus salah satu nilai yang diizinkan
alter table public.cats
  add constraint cats_dirawat_status_check
  check (
    dirawat_status is null
    or dirawat_status <@ array[
      'tidak_ada_perubahan', 'ada_perubahan', 'parah', 'sedang', 'ringan',
      'mau_makan', 'tidak_mau_makan', 'lemes', 'seger'
    ]::text[]
  );
