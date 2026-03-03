-- Inbox WA: pesan masuk disimpan dulu di sini (raw), lalu diproses ke Activity dari halaman Koneksi WhatsApp.
create table if not exists public.whatsapp_inbox (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  from_number text not null,
  raw_body text not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.whatsapp_inbox is 'Pesan WA masuk disimpan raw; diproses ke daily_activities dari halaman Koneksi WhatsApp.';
comment on column public.whatsapp_inbox.processed_at is 'Diisi saat pesan sudah diparsing dan masuk ke Activity.';

create index if not exists idx_whatsapp_inbox_processed_at on public.whatsapp_inbox (processed_at);
create index if not exists idx_whatsapp_inbox_received_at on public.whatsapp_inbox (received_at desc);

alter table public.whatsapp_inbox enable row level security;

drop policy if exists "whatsapp_inbox_admin_select" on public.whatsapp_inbox;
create policy "whatsapp_inbox_admin_select"
  on public.whatsapp_inbox for select
  using (public.is_admin());

drop policy if exists "whatsapp_inbox_admin_update" on public.whatsapp_inbox;
create policy "whatsapp_inbox_admin_update"
  on public.whatsapp_inbox for update
  using (public.is_admin())
  with check (public.is_admin());

-- Insert dari webhook (service role).
