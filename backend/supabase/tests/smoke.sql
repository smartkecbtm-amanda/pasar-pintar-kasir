-- UJI MANUAL di proyek uji (BUKAN produksi). Jalankan blok demi blok di SQL Editor / psql.
-- 1) Buat dua pengguna lewat Dashboard > Authentication > Users, catat UUID-nya:
--    OWNER = '<uuid-pemilik>'   STRANGER = '<uuid-orang-lain>'
-- Ganti placeholder di bawah. Setiap "set role" berlaku untuk sesi; akhiri dengan "reset role;".

-- A. Sebagai pemilik: buat toko dan sinkronkan data
select set_config('request.jwt.claims', '{"sub":"<OWNER>","role":"authenticated"}', false);
set role authenticated;
select public.create_store('Toko Uji');                         -- harapan: mengembalikan UUID toko; catat sebagai STORE
select public.sync_status('<STORE>');                            -- harapan: {"count": 0}
select public.sync_push('<STORE>', '[
  {"id":"e1","entity":"products","entity_id":"p1","op":"upsert","data":{"name":"Kopi","hpp":1000},"ts":1000},
  {"id":"e2","entity":"stock_moves","entity_id":"m1","op":"upsert","data":{"productId":"p1","qty":10,"reason":"Saldo awal"},"ts":1001},
  {"id":"e3","entity":"audit","entity_id":"a1","op":"upsert","data":{"action":"uji"},"ts":1002}
]'::jsonb);                                                      -- harapan: {"accepted": 3}
select public.sync_push('<STORE>', '[{"id":"e1","entity":"products","entity_id":"p1","op":"upsert","data":{"name":"X"},"ts":9999}]'::jsonb);
                                                                 -- harapan: {"accepted": 0} (peristiwa sama tidak diproses ulang)
select public.sync_pull('<STORE>', 0, 500);                      -- harapan: 3 baris, cursor > 0
select * from public.v_products;                                 -- harapan: Kopi dengan stock = 10
select * from public.audit_chain;                                -- harapan: 1 baris dengan hash 64 karakter

-- B. Audit tidak boleh diubah/dihapus (jalankan sebagai postgres/service role untuk memicu pemicu)
reset role;
update public.sync_entities set data = '{}'::jsonb where entity = 'audit';   -- harapan: GALAT "jejak audit tidak boleh diubah"
delete from public.sync_entities where entity = 'audit';                       -- harapan: GALAT

-- C. Orang lain tidak boleh mengakses toko
select set_config('request.jwt.claims', '{"sub":"<STRANGER>","role":"authenticated"}', false);
set role authenticated;
select public.sync_pull('<STORE>', 0, 500);                      -- harapan: GALAT "akses ditolak"
select count(*) from public.sync_entities;                       -- harapan: 0 (RLS)
select * from public.sync_events;                                -- harapan: GALAT izin ditolak

-- D. PIN pegawai
select set_config('request.jwt.claims', '{"sub":"<OWNER>","role":"authenticated"}', false);
select public.set_employee_pin('<STORE>', 'e2', '4321');
select public.verify_employee_pin('<STORE>', 'e2', '4321');      -- harapan: true
select public.verify_employee_pin('<STORE>', 'e2', '0000');      -- harapan: false (lima kali salah berturut-turut -> terkunci)
select public.verify_employee_pin('<STORE>', 'e9', '1111');      -- harapan: null (PIN belum ada)
reset role;
