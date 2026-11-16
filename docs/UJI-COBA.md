# Panduan Uji Coba

Urutkan dari yang paling mudah. Centang hasilnya dan laporkan yang gagal.

## 0. Persiapan
```bash
bun install          # atau npm install
bun test             # tes bawaan + tes logika baru (harus hijau)
bun run build        # pastikan tidak ada galat kompilasi
bun dev              # http://localhost:5173
```
Jika `bun test` atau `build` gagal, kirimkan pesan galatnya apa adanya.

## 1. Mode lokal (tanpa cloud)
1. Buka `/` → pilih pegawai, masuk dengan PIN bawaan, buka laci.
2. Ketik "ind" di kolom cari; ketik kode cepat `01` lalu Enter; scan barcode (atau ketik cepat lalu Enter).
3. Jual barang kiloan (tombol ¼ ½ ¾ 1 kg). Bayar tunai, coba pembulatan.
4. Setelah bayar: tekan Enter (dialog cetak 58 mm), tombol WhatsApp.
5. Riwayat Nota → batalkan nota sebagai Supervisor/Pemilik; cek stok dan laci kembali.
6. Retur/Tukar dari nota terakhir; ulangi sampai jumlah habis (harus ditolak).
7. `/pemilik` → Gudang: faktur banyak barang (tempo + bayar sebagian), retur supplier, repacking.
8. Titipan: terima, jual di kasir, selesaikan, cetak bukti.
9. Layanan: isi deposit, jual pulsa manual, tandai tertunda gagal.
10. Opname, Audit, Dashboard (top 10, jam sibuk), Laporan (CSV dibuka di Excel: angka negatif tetap angka).
11. Tutup shift: hitung per pecahan, coba selisih tanpa alasan (harus ditolak).
12. Matikan jaringan (atau tombol offline) dan ulangi transaksi; muat ulang halaman, data harus tetap ada.

## 2. Mode cloud (butuh backend, lihat README backend)
1. Isi `.env`, bangun ulang, buka Pemilik → Cloud & Perangkat → masuk dengan email → buat toko → Mulai Sinkronisasi.
2. Buka aplikasi di perangkat kedua dengan akun yang diundang; pilih ID toko yang sama. Lakukan penjualan di kedua perangkat bersamaan; stok harus konsisten.
3. Putuskan jaringan, jual beberapa barang, sambungkan lagi: antrean harus kosong.
4. QRIS (mode mock): bayar QRIS di kasir, otomatis lunas beberapa detik.
5. PPOB (mode mock): target berakhiran 13 gagal, 99 tertunda, lainnya sukses.
6. Penasihat → Tanya AI (butuh `GEMINI_API_KEY`).
7. Buat cabang kedua, kirim surat jalan, terima di cabang tujuan.

## 3. Perangkat keras (Chrome/Edge, HTTPS)
Printer thermal (Bluetooth/USB/Serial) → Tes Cetak → Buka Laci → transaksi tunai (laci terbuka otomatis). Timbangan serial → tombol ⚖️ pada barang kiloan. Kamera barcode → tombol Kamera.
