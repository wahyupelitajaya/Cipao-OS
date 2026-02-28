-- Tipe aktivitas: ubah nilai dari Inggris ke Indonesia

-- Update baris yang masih pakai nilai Inggris
update public.daily_activities
set activity_type = case activity_type
  when 'Clean Cage' then 'Bersih Kandang'
  when 'Nail Trim' then 'Potong Kuku'
  when 'Brush' then 'Sisir'
  when 'Ear Cleaning' then 'Bersih Telinga'
  when 'Deworming' then 'Obat Cacing'
  when 'Flea Treatment' then 'Obat Kutu'
  when 'Bath' then 'Mandi'
  when 'Medication Given' then 'Pemberian Obat'
  when 'General Check' then 'Pemeriksaan Umum'
  when 'Other' then 'Lainnya'
  else activity_type
end
where activity_type in (
  'Clean Cage', 'Nail Trim', 'Brush', 'Ear Cleaning', 'Deworming',
  'Flea Treatment', 'Bath', 'Medication Given', 'General Check', 'Other'
);

-- Hapus constraint lama (nama default di Postgres)
alter table public.daily_activities
  drop constraint if exists daily_activities_activity_type_check;

-- Constraint baru dengan nilai Indonesia
alter table public.daily_activities
  add constraint daily_activities_activity_type_check check (activity_type in (
    'Bersih Kandang',
    'Potong Kuku',
    'Sisir',
    'Bersih Telinga',
    'Obat Cacing',
    'Obat Kutu',
    'Mandi',
    'Pemberian Obat',
    'Pemeriksaan Umum',
    'Lainnya'
  ));
