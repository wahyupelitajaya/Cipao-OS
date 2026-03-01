-- Menular atau tidak (untuk tab Dirawat): true = menular, false = tidak menular, null = belum ditentukan.

alter table public.cats
  add column if not exists is_contagious boolean;

comment on column public.cats.is_contagious is 'Apakah kondisi perawatan menular: true = menular, false = tidak, null = belum ditentukan.';
