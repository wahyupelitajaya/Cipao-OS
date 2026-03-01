-- Add optional treatment notes for cats (e.g. jenis penyakit, siapa yang merawat)
-- Used on Health page Dirawat tab for manual keterangan.

alter table public.cats
  add column if not exists treatment_notes text;

comment on column public.cats.treatment_notes is 'Catatan perawatan manual (jenis penyakit, yang merawat, dll) untuk tab Dirawat.';
