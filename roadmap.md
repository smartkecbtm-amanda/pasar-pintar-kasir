# Status ringkas (rincian di docs/STATUS-PEMBANGUNAN.md)
- [x] Fase 1 Frontend lokal-first: kasir, WMS, kasbon, titipan, kulakan, repacking, opname, audit, laporan, PWA.
- [x] Fase 2 Klien cloud: IndexedDB, outbox offline, sinkronisasi, PIN server, tandem lintas perangkat (kode lengkap; backend di zip terpisah).
- [x] Fase 3 Perangkat: ESC/POS, laci kas, timbangan serial, kamera barcode (kode lengkap; belum diuji dengan perangkat fisik).
- [x] Fase 4 Penasihat: analitik lokal dan AI cloud baca-saja (Edge Function).
- [x] Fase 5 Multi-cabang, QRIS dinamis, PPOB (mock teruji; penyedia nyata belum diuji).
- [ ] Verifikasi nyata: `bun test`, `bun run build`, coba di browser, SQL di Supabase, perangkat keras, sandbox QRIS/PPOB.
- [ ] Belum dibuat: retur dengan barang pengganti berbeda, kanal Realtime (sekarang polling), rate limit Edge Functions.
