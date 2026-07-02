-- Optional profile description for each cat (personality, notes, background, etc.)

alter table public.cats
  add column if not exists description text;

comment on column public.cats.description is 'Deskripsi profil kucing (karakter, catatan, latar belakang, dll).';
