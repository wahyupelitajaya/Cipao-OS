-- Policy untuk bucket foto kucing.
-- Pastikan bucket sudah ada: Supabase Dashboard → Storage → New bucket
--   Name/ID: cat-photos (gunakan nama persis ini agar policy cocok), Public: Yes.

-- Hapus policy lama jika ada (agar bisa jalan ulang)
drop policy if exists "Allow authenticated upload cat-photos" on storage.objects;
drop policy if exists "Allow public read cat-photos" on storage.objects;
drop policy if exists "Allow authenticated update cat-photos" on storage.objects;

-- User yang login boleh upload ke bucket cat-photos
create policy "Allow authenticated upload cat-photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'cat-photos');

-- Baca file (public) agar URL foto bisa dipakai di dashboard
create policy "Allow public read cat-photos"
on storage.objects for select to public
using (bucket_id = 'cat-photos');

-- Update/upsert (ganti foto)
create policy "Allow authenticated update cat-photos"
on storage.objects for update to authenticated
using (bucket_id = 'cat-photos');
