-- Unique pada name agar seed bisa dijalankan ulang
create unique index if not exists cat_breeds_name_key on public.cat_breeds (name);

-- Seed jenis kucing: Domestic, BSH, Maine Coon, Ragdoll, Bengal, Abyssinian, Persia, Scottish Fold
insert into public.cat_breeds (name, sort_order)
values
  ('Domestic', 1),
  ('BSH', 2),
  ('Maine Coon', 3),
  ('Ragdoll', 4),
  ('Bengal', 5),
  ('Abyssinian', 6),
  ('Persia', 7),
  ('Scottish Fold', 8)
on conflict (name) do update set sort_order = excluded.sort_order;
