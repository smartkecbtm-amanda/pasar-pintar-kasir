# Status Pembangunan (rilis v2)

Diperbarui 15 November 2026. Acuan: dokumen di `docs/` (lihat `AGENTS.md`). Keputusan atas pertentangan dokumen ada di `KEPUTUSAN-DESAIN.md`.

## Cara membaca status
- **Teruji**: ada tes otomatis yang lulus untuk logikanya.
- **Kode ada, belum teruji nyata**: kode lengkap, tetapi butuh perangkat, akun, atau server sungguhan yang tidak tersedia saat pembangunan. Wajib diuji sebelum dipakai di toko.
- **Belum**: belum dibuat.

## Yang sudah diverifikasi dan yang belum
| Verifikasi | Hasil |
| :--- | :--- |
| Logika `src/lib` (56 tes: aturan kasir, integritas stok, sinkronisasi dengan server tiruan, ESC/POS, timbangan, penasihat) | Lulus lewat pelari uji mini; `tsc` strict lolos |
| Backend (11 tes: MD5, tanda tangan Midtrans, Digiflazz, handler QRIS/PPOB/AI dengan Supabase tiruan) | Lulus; `tsc` strict lolos |
| Berkas `.tsx` | Diperiksa tipe terhadap tipe logika asli dengan React/UI di-stub; tidak ada galat nyata. Belum dikompilasi dengan Vite dan belum dibuka di browser |
| `vitest` asli, `bun run build`, tes routing bawaan | **Belum dijalankan** |
| SQL migrasi | **Belum dijalankan** di PostgreSQL (tidak tersedia). Ditulis hati-hati; jalankan `supabase/tests/smoke.sql` di proyek uji |
| Printer, laci kas, timbangan, kamera barcode | **Belum diuji** dengan perangkat fisik |
| QRIS Midtrans, PPOB Digiflazz, Gemini | **Belum diuji** dengan akun/sandbox (mode `mock` teruji) |

## Fase 1: Frontend lokal-first
| Butir | Status | Catatan |
| :--- | :--- | :--- |
| Pegawai, PIN, cuti, pemulihan PIN pemilik, nonaktif | Teruji | `recoverOwnerPin` memakai PIN utama toko |
| Void nota, retur/tukar dibatasi nota, opname, audit trail | Teruji | |
| Pembatasan peran per aksi | Sebagian | Retur, void, opname, kulakan, hutang, pelanggan, supplier dikunci peran. `addCash` (kas kecil) dan `payDebt` sengaja terbuka untuk kasir |
| Meja kasir: pencarian singkatan, kode cepat, scanner USB tanpa klik, ¼ ½ ¾ 1 kg, ubah harga (supervisor/pemilik), foto produk, stok bertingkat | Teruji (logika); UI belum dicoba di browser | |
| Struk: cetak browser 58/80 mm, Enter untuk cetak, WhatsApp | Teruji (isi struk); cetak belum dicoba | |
| Pembulatan 100/500/1000 + bawah/permen/donasi | Sebagian | "Ganti permen" hanya catatan; donasi belum punya ledger terpisah |
| Kamera barcode (BarcodeDetector) | Kode ada, belum teruji nyata | Hanya Chrome/Edge |
| Split payment, hold 5 keranjang, auto-grosir, kedaluwarsa, ROP, ABC | Teruji | |
| Limit kasbon + persetujuan PIN pemilik, warna jatuh tempo, risiko kasbon | Teruji | |
| Multi-satuan, HPP rata-rata, bundling, stok minus + flag audit | Teruji | |
| Faktur kulakan banyak barang (tunai/bank/tempo/sebagian), saran harga 1 klik | Teruji | |
| Retur ke supplier, repacking + susut, supplier | Teruji | |
| Konsinyasi terhubung stok, bukti setor cetak/WA | Teruji | |
| Hutang tempo + pengingat H-3 | Teruji | |
| Laci: hitung buta, alasan selisih wajib, tukar pecahan | Teruji | |
| Prive tunai/barang (1 klik di kasir untuk pemilik) | Teruji | |
| Dashboard: top 10 untung/laris, jam sibuk, laba memperhitungkan retur/void/PPOB | Teruji | |
| Ekspor CSV/Excel dengan sanitasi per sel | Teruji | |
| PWA offline | Kode ada, belum teruji nyata | Validasi offline hanya bisa pada aplikasi terbit |
| Retur dengan barang pengganti berbeda + selisih harga | Belum | |
| Edit/hapus supplier dan transaksi PPOB nomor tujuan lanjutan | Belum | |

## Fase 2: Backend cloud dan sinkronisasi
| Butir | Status | Catatan |
| :--- | :--- | :--- |
| Skema PostgreSQL + RLS + tampilan laporan | Kode ada, belum teruji nyata | `backend/supabase/migrations` |
| Login pemilik via kode email, buat toko, undang perangkat | Kode ada, belum teruji nyata | |
| Outbox offline, idempotensi, penyelesaian konflik | Teruji dengan server tiruan | Stok sebagai jumlah mutasi; polling 4 detik |
| Tandem multi-perangkat | Teruji (logika) | Lewat sinkronisasi, bukan Realtime |
| PIN server-side bcrypt + kunci 5 menit | Kode ada, belum teruji nyata | |
| Jejak audit berantai hash anti-ubah | Kode ada, belum teruji nyata | |
| Backup/snapshot cloud | Belum | Gunakan backup bawaan Supabase; unduh JSON/Excel dari Laporan |

## Fase 3: Perangkat keras
| Butir | Status | Catatan |
| :--- | :--- | :--- |
| Encoder ESC/POS 58/80 mm, potong kertas, buka laci | Teruji (byte) | |
| Koneksi printer Serial/USB/Bluetooth, cetak otomatis + buka laci tunai | Kode ada, belum teruji nyata | Chrome/Edge + HTTPS |
| Timbangan serial (parser + tombol timbang) | Parser teruji; koneksi belum teruji nyata | |
| Scanner USB mode keyboard | Teruji (logika) | |

## Fase 4: Penasihat AI
| Butir | Status | Catatan |
| :--- | :--- | :--- |
| Ringkasan agregat tanpa data pribadi, hari besar/gajian, risiko kasbon, valuasi barang mati | Teruji | Tanggal hari raya berupa perkiraan |
| Edge Function AI (Gemini), baca-saja | Handler teruji; panggilan Gemini nyata belum | Model bawaan dapat diganti lewat `GEMINI_MODEL` |

## Fase 5: Multi-cabang, PPOB, QRIS
| Butir | Status | Catatan |
| :--- | :--- | :--- |
| Surat jalan antar-cabang, terima/batal, cetak | Teruji (logika + server tiruan); SQL belum teruji | |
| QRIS dinamis (mock teruji, Midtrans) | Mock teruji; Midtrans belum teruji nyata | |
| PPOB: pulsa, data, token, e-wallet, tagihan, transfer tunai, deposit, transaksi tertunda | Mock teruji; Digiflazz belum teruji nyata | |

## Risiko dan batasan yang perlu diketahui
- Saldo/PIN: setelah cloud aktif, simpan ulang PIN tiap pegawai agar tersimpan di server.
- Polling 4 detik: perubahan dari perangkat lain tampil dalam beberapa detik, bukan seketika.
- Belum ada pembatasan laju (rate limit) pada Edge Functions; pasang di tingkat Supabase/WAF bila dipakai publik.
- Tanggal hari raya pada penasihat adalah perkiraan.
- Hak akses perangkat: akun perangkat dapat membaca seluruh data tokonya; PIN pegawai membatasi aksi di aplikasi, bukan akses data langsung.
