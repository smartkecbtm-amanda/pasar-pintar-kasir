# Keputusan Desain

Dicatat 15 November 2026. Pemilik proyek meminta pertentangan antar-dokumen diselesaikan dengan pilihan terbaik. Keputusan di bawah berlaku sampai pemilik mengubahnya; dokumen sumber tidak diubah.

## A. Delapan pertentangan antar-dokumen
| # | Pertentangan | Keputusan | Alasan |
| :-: | :--- | :--- | :--- |
| 1 | Ambang status stok (`susunan` vs `wms-build-spec` 3.4) | Ikut `susunan`: Kritis < 2 hari, Menipis 2–5, Aman > 5, Mati > 30 hari. "Perlu restok ≤ ROP" tetap ada sebagai penanda terpisah (`reorder`) | Susunan adalah sumber kebenaran mutlak menurut dokumennya sendiri; kedua aturan dapat berjalan berdampingan |
| 2 | Batas barang mati 30 / 60 / 45–60 hari | 30 hari | Cocok dengan `susunan` dan `wms-build-spec`; dua dokumen melawan satu |
| 3 | Stok pengaman bawaan | max(stok minimum, penjualan harian × 2) | `wms-build-spec` 3.3 lebih rinci dan lebih aman bagi barang laris |
| 4 | Nama tabel dan single/multi-tenant | Penamaan `wms-build-spec` (`stock_moves`, `cash_moves`, dst.) dengan `store_id` di semua data dan RLS per toko | Multi-cabang (Fase 5) butuh `store_id`. Data tersimpan sebagai entitas per toko (`sync_entities`) dengan tampilan SQL berbentuk tabel (`v_products`, `v_sales`, `v_stock_moves`, dst.) |
| 5 | Printer/kamera di Fase 1 atau Fase 3 | Cetak browser 58/80 mm dan kamera barcode ada sejak Fase 1; cetak langsung ESC/POS, laci kas, dan timbangan di Fase 3. Keduanya sudah ditulis | Pengguna meminta semua fase; pemisahan hanya soal urutan |
| 6 | Pembulatan | Kelipatan dapat diatur (100/500/1000, bawaan 500) dengan tiga cara: bawah, ganti permen, donasi | Contoh Blueprint (Rp14.800 → Rp15.000) terpenuhi lewat donasi |
| 7 | Penomoran sprint/versi | Nomor sprint mengikuti `susunan`; butir tambahan `roadmap` dipetakan ke sprint yang sama. Rilis ini bernama v2 | Satu penomoran |
| 8 | Penyimpanan lokal | IndexedDB sebagai snapshot utama dan antrean (outbox); localStorage tetap sebagai salinan cepat dan penyangga tandem antar-tab | Memenuhi Blueprint tanpa mengubah seluruh alur sinkron |

## B. Keputusan teknis baru
- **Stok adalah jumlah mutasi.** `product.stock` selalu sama dengan jumlah `stockMoves` (ditambah "Saldo awal sinkronisasi" saat toko pertama tersambung). Karena itu dua perangkat yang menjual barang sama secara bersamaan tidak saling menimpa. Paket dicatat per komponen.
- **Data tambahan-saja** (mutasi stok, kas, kasbon, retur, audit, prive, deposit) bersifat idempoten menurut ID. **Dokumen** (produk, pelanggan, shift, nota, dst.) memakai "yang terbaru menang"; shift menggabungkan peserta dan nota void tidak bisa dibatalkan.
- **Sinkronisasi memakai polling 4 detik**, bukan kanal Realtime. Tidak perlu pustaka tambahan dan tahan putus-nyambung; dapat ditingkatkan ke Realtime nanti.
- **Akun perangkat.** Pemilik masuk dengan email (kode OTP). Perangkat kasir lain memakai akun email yang diundang pemilik (`add_device_member`). Pegawai masuk dengan PIN: server memeriksa bcrypt dan mengunci 5 menit setelah 5 kali salah; jika server belum menyimpan PIN pegawai atau sedang offline, perangkat memakai hash lokal. Setelah cloud aktif, pemilik sebaiknya menyimpan ulang PIN tiap pegawai agar tersimpan di server.
- **Jejak audit** di server berantai hash dan tidak dapat diubah/dihapus (pemicu basis data).
- **Surat jalan antar-cabang** memakai tabel lintas toko dengan syarat pemilik yang sama. Mutasi stok masing-masing cabang memakai ID deterministik sehingga penerimaan ganda tidak menggandakan stok.
- **QRIS dan PPOB** memakai adapter penyedia: `mock` (bawaan, untuk uji alur), Midtrans (QRIS), Digiflazz (PPOB). Adapter nyata ditulis dari dokumentasi publik dan harus diuji di sandbox penyedia.
- **Konsinyasi** kini terhubung stok: barang titipan masuk stok dengan HPP = harga setor, dijual di kasir, dan disetor berdasarkan rumus terjual = masuk − sisa − basi.
