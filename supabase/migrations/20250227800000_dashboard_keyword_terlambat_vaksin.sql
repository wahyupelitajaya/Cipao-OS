-- Ubah keyword suggest dari "belum vaksin" menjadi "terlambat vaksin"
update public.dashboard_search_keywords
set keyword = 'terlambat vaksin'
where keyword = 'belum vaksin';

-- Ubah "belum obat cacing" → "terlambat obat cacing", "belum tetes kutu" → "terlambat tetes kutu"
update public.dashboard_search_keywords
set keyword = 'terlambat obat cacing'
where keyword = 'belum obat cacing';

update public.dashboard_search_keywords
set keyword = 'terlambat tetes kutu'
where keyword = 'belum tetes kutu';
