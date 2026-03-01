-- Ubah opsi status kucing: Membaik, Memburuk, Hampir Sembuh, Observasi, Sakit

-- Hapus constraint check pada kolom status (nama bisa berbeda per lingkungan)
do $$
declare
  conname text;
begin
  for conname in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'cats' and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%status%'
  loop
    execute format('alter table public.cats drop constraint if exists %I', conname);
  end loop;
end $$;

update public.cats
set status = case
  when status = 'sakit' then 'sakit'
  when status in ('baik', 'kurang_baik') then 'observasi'
  else 'observasi'
end
where status is not null;

alter table public.cats
  add constraint cats_status_check
  check (status is null or status in ('membaik', 'memburuk', 'hampir_sembuh', 'observasi', 'sakit'));
