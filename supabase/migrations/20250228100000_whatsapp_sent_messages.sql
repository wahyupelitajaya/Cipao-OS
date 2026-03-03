-- Riwayat pesan WA yang dikirim dari halaman Koneksi WhatsApp (untuk tampil di chat).
create table if not exists public.whatsapp_sent_messages (
  id uuid primary key default gen_random_uuid(),
  to_number text not null,
  body text not null,
  sent_at timestamptz not null default now()
);

comment on table public.whatsapp_sent_messages is 'Pesan WA yang dikirim dari website; untuk tampilan riwayat chat.';

create index if not exists idx_whatsapp_sent_messages_sent_at on public.whatsapp_sent_messages (sent_at desc);

alter table public.whatsapp_sent_messages enable row level security;

drop policy if exists "whatsapp_sent_messages_admin_all" on public.whatsapp_sent_messages;
create policy "whatsapp_sent_messages_admin_all"
  on public.whatsapp_sent_messages for all
  using (public.is_admin())
  with check (public.is_admin());
