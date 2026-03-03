-- Tabel log aktivitas: catatan pembaruan di website (hanya admin yang bisa baca).
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  summary text not null
);

comment on table public.activity_log is 'Log pembaruan di website; hanya admin yang boleh SELECT.';
comment on column public.activity_log.action is 'Jenis aksi: create, update, delete, dll.';
comment on column public.activity_log.entity_type is 'Entitas terkait: cat, health_log, weight_log, grooming_log, visit_day, inventory, dll.';
comment on column public.activity_log.entity_id is 'ID entitas (opsional).';
comment on column public.activity_log.summary is 'Ringkasan dalam bahasa Indonesia.';

create index if not exists idx_activity_log_created_at on public.activity_log (created_at desc);
create index if not exists idx_activity_log_entity on public.activity_log (entity_type, entity_id);

alter table public.activity_log enable row level security;

-- Hanya admin yang boleh SELECT. Insert dari server (service role atau dengan check is_admin).
create policy "activity_log_admin_select"
  on public.activity_log for select
  using (public.is_admin());

-- Insert: hanya admin (dipanggil dari server action setelah requireAdmin).
create policy "activity_log_admin_insert"
  on public.activity_log for insert
  with check (public.is_admin());
