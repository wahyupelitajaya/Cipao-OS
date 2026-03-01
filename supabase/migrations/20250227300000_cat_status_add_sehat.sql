-- Tambah opsi status "sehat" untuk kucing (kucing tidak di tab Dirawat = otomatis dianggap sehat)

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

alter table public.cats
  add constraint cats_status_check
  check (status is null or status in ('sehat', 'membaik', 'memburuk', 'hampir_sembuh', 'observasi', 'sakit'));
