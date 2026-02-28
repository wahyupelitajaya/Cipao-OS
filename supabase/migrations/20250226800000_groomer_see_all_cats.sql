-- Groomer melihat semua kucing dan log (read), bisa edit hanya grooming.
-- Sebelumnya groomer hanya lihat kucing yang owner_id = groomer, jadi kalau semua kucing
-- punya owner lain, groomer lihat kosong.

-- 1. Cats: groomer boleh SELECT semua (baca daftar kucing)
drop policy if exists "cats_groomer_select_all" on public.cats;
create policy "cats_groomer_select_all"
on public.cats for select
using (is_groomer());

-- 2. Health logs: groomer boleh SELECT semua (baca data kesehatan)
drop policy if exists "health_groomer_select_all" on public.health_logs;
create policy "health_groomer_select_all"
on public.health_logs for select
using (is_groomer());

-- 3. Weight logs: groomer boleh SELECT semua
drop policy if exists "weight_groomer_select_all" on public.weight_logs;
create policy "weight_groomer_select_all"
on public.weight_logs for select
using (is_groomer());

-- 4. Grooming logs: groomer SELECT semua + INSERT/UPDATE/DELETE semua (boleh edit grooming siapa saja)
drop policy if exists "grooming_groomer_write_own_cats" on public.grooming_logs;
drop policy if exists "grooming_groomer_all" on public.grooming_logs;
create policy "grooming_groomer_all"
on public.grooming_logs for all
using (is_groomer())
with check (is_groomer());
