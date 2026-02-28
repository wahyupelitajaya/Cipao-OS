-- Tambah kategori inventory: Grooming tool, Other
alter type public.inventory_category add value if not exists 'GROOMING_TOOL';
alter type public.inventory_category add value if not exists 'OTHER';
