-- Tabel untuk menampilkan di halaman WhatsApp: teks terakhir yang diterima webhook + hasil parsing.
-- Hanya diisi saat WHATSAPP_WEBHOOK_DEBUG=true. Hanya admin yang boleh baca.
create table if not exists public.webhook_whatsapp_debug (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  raw_preview text not null,
  parsed_date text,
  parsed_time_slot text,
  parsed_location text
);

comment on table public.webhook_whatsapp_debug is 'Debug: isi pesan WA terakhir + hasil parsing; hanya saat WHATSAPP_WEBHOOK_DEBUG=true.';

alter table public.webhook_whatsapp_debug enable row level security;

drop policy if exists "webhook_whatsapp_debug_admin_select" on public.webhook_whatsapp_debug;
create policy "webhook_whatsapp_debug_admin_select"
  on public.webhook_whatsapp_debug for select
  using (public.is_admin());

-- Insert hanya dari server (service role) saat webhook dipanggil; tidak perlu policy insert untuk user.

create index if not exists idx_webhook_whatsapp_debug_received_at
  on public.webhook_whatsapp_debug (received_at desc);
