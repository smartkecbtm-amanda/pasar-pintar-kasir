# DOKUMEN SUSUNAN PENGEMBANGAN APLIKASI POS WARUNG KELONTONG SEMI-MINIMARKET
**Edisi:** Roadmap Eksekusi Terstruktur (Frontend-First dilanjutkan Backend)  
**Sumber Kebenaran Mutlak:** Blueprint Spesifikasi v3 & Panduan Alur Penggunaan v3  
**Prinsip Desain:** 100% Mengacu Dokumen Resmi Tanpa Merancang Ulang Aturan Bisnis

---

## 1. STRATEGI & PRINSIP PENGEMBANGAN
1. **Frontend-First (Local-First Engine):**  
   Seluruh antarmuka, tata letak ramah lansia, alur transaksi, validasi bisnis, dan simulasi data lokal (IndexedDB / Mock Store) diselesaikan dan diuji 100% tuntas sebelum membangun backend.
2. **Sumber Kebenaran Dokumen:**  
   Setiap butir pekerjaan merujuk langsung ke Pilar 1 s/d 8 di Blueprint dan Bab 1 s/d 18 di Panduan Penggunaan.
3. **Pemisahan Peran Tegas:**  
   Front-office Kasir (Layar Lansia bebas distraksi, tombol jumbo, tanpa data HPP/laba) vs Back-office Pemilik (PIN protected, analitik HPP, restok pintar, prive, kasbon, pegawai).

---

## FASE 1: PENGEMBANGAN FRONTEND (LOKAL-FIRST & PWA ENGINE)

### Sprint 1.1: Fondasi State Lokal, Multi-Role & Manajemen Pegawai
* **Rujukan Dokumen:** Blueprint Pilar 1.4 & Pilar 8.8; Panduan Bab 1 & Bab 17.
* **Fitur & Komponen yang Dibangun:**
  1. **Master Data Pegawai (Tab Pemilik > Pegawai):**
     * Form tambah/edit staf: Nama Lengkap, Nama Panggilan Staf (tercetak di struk), No. WhatsApp, Peran (*Kasir*, *Supervisor*, *Pemilik*), Status (Aktif/Nonaktif).
     * Input & Enkripsi Lokal PIN Kasir (4–6 digit unik per pegawai).
  2. **Mekanisme Role Switching & Gate PIN Mandiri:**
     * Layar pembuka shift: Kasir memilih nama sendiri dari daftar staf aktif + memasukkan PIN pribadi.
     * Modal dialog proteksi PIN Pemilik untuk mengakses seluruh menu manajerial.
  3. **Permission Guard:**
     * Akses Kasir: Meja kasir kilat, hold, cetak struk, scan barcode, pembulatan.
     * Akses Supervisor: Otorisasi void transaksi, retur barang, stock opname fisik.
     * Akses Pemilik: 100% akses penuh (HPP, laba rugi, prive, kelola pegawai).
* **Kriteria Selesai (DoD):** Pemilik dapat menambah kasir baru, kasir dapat buka shift dengan PIN masing-masing, menu pemilik terkunci dari kasir biasa.

---

### Sprint 1.2: Meja Kasir Kilat Ramah Lansia & Front-Office
* **Rujukan Dokumen:** Blueprint Pilar 1.3, Pilar 2.1, Pilar 2.2; Panduan Bab 2 & Bab 3.
* **Fitur & Komponen yang Dibangun:**
  1. **Tata Letak 2 Kolom Bebas Distraksi:**
     * Sisi Kiri: Panel Quick-Pad Foto (12–16 item barang curah/laris) dengan tombol ekstra besar (60x60 s/d 80x80 px), kolom pencarian barcode/nama, dan filter kategori.
     * Sisi Kanan: Panel Keranjang Belanja, rincian kuantitas (+/-), subtotal, diskon item, dan total bayar dengan tipografi angka jumbo (font 28–36px bold).
  2. **Kalkulator Uang Warna Rupiah:**
     * Tombol cepat pecahan uang kertas Indonesia sesuai warna asli: Rp 1.000, Rp 2.000, Rp 5.000, Rp 10.000, Rp 20.000, Rp 50.000, Rp 100.000, dan tombol "Uang Pas".
     * Perhitungan otomatis kembalian secara instan tanpa perlu ketik manual.
  3. **Audio Feedback / Text-to-Speech:**
     * Suara konfirmasi nominal kembalian otomatis dalam Bahasa Indonesia (contoh: *"Kembalian dua puluh ribu rupiah"*).
  4. **Pintasan Keyboard Fisik:**
     * F2: Fokus cari barang, F4: Tahan transaksi, F8: Bayar cepat, Enter: Cetak struk.
* **Kriteria Selesai (DoD):** Transaksi eceran selesai di bawah 5 detik, tombol mudah disentuh di layar tablet, audio kembalian berbunyi jelas.

---

### Sprint 1.3: Transaksi Kasir Lanjutan (Split Payment, Pembulatan, Retur, Hold, PPOB)
* **Rujukan Dokumen:** Blueprint Pilar 2.3 s/d 2.7; Panduan Bab 4, 5, 6.
* **Fitur & Komponen yang Dibangun:**
  1. **Split Payment (Pembayaran Kombinasi):**
     * Dialog pembayaran mendukung kombinasi metode: Sebagian Tunai + Sebagian QRIS, atau Sebagian Tunai + Sebagian Kasbon.
  2. **Pembulatan Koin Cerdas (Coin Rounding Engine):**
     * Opsi pembulatan ke bawah (diskon koin Rp 1–Rp 99).
     * Opsi kompensasi permen warung (tambah item permen otomatis sesuai nilai selisih koin).
     * Opsi donasi kotak amal kembalian kecil dengan pencatatan ledger terpisah.
  3. **Tahan & Panggil Transaksi (Hold Cart):**
     * Menyimpan transaksi aktif ke slot antrean sementara (maksimal 5 antrean) saat pembeli mengambil barang susulan, tanpa memblokir pembeli berikutnya.
  4. **Retur Cepat & Tukar Barang (Shift Aktif):**
     * Menu retur instan: input barang yang dikembalikan, pilih tukar barang seharga sama atau kembalikan uang tunai dari laci kasir.
  5. **Modul Transaksi PPOB & Jasa Warung:**
     * Form cepat: Pulsa, Token Listrik PLN, Top-Up E-Wallet (Dana/OVO/GoPay), Transfer Uang Tunai.
     * Pemisahan otomatis antara harga modal dasar dengan biaya jasa/komisi warung.
* **Kriteria Selesai (DoD):** Split payment berhasil tervalidasi matematis, pembulatan koin tercatat di struk, hold antrean lancar, retur memotong kas dan mengembalikan stok.

---

### Sprint 1.4: Multi-Satuan, Auto-Grosir, Susut Curah & Koreksi Stok
* **Rujukan Dokumen:** Blueprint Pilar 3.1 s/d 3.5; Panduan Bab 3 & Bab 10.
* **Fitur & Komponen yang Dibangun:**
  1. **Konversi Satuan Hirarkis (Multi-UOM):**
     * Pengaturan satuan bertingkat: Dus/Karton -> Pak/Slop -> Renceng -> Pcs/Eceran (contoh: 1 Dus = 40 Pcs).
     * Pemecahan otomatis: Jika stok eceran 0 dan kasir scan barang, sistem otomatis memotong 1 dus menjadi 40 eceran di latar belakang.
  2. **Harga Grosir Otomatis (Tiered Pricing):**
     * Jika kasir memasukkan kuantitas mencapai ambang grosir (misal: 12 pcs), harga satuan otomatis turun ke harga grosir per pak.
  3. **Koreksi Stok Fisik & Stock Opname Cepat:**
     * Form penyesuaian stok di menu pemilik: masukkan stok fisik hasil hitung, sistem mencatat selisih dengan alasan (rusak, hilang, susut).
  4. **Susut Barang Curah & Repacking:**
     * Pencatatan selisih susut timbangan alami (contoh: karung beras 50kg menyusut jadi 49kg).
     * Modul repacking beras/minyak curah dari karung/jeriken besar menjadi kemasan 1kg.
* **Kriteria Selesai (DoD):** Pembelian jumlah banyak otomatis menerapkan diskon grosir, pecah satuan berjalan otomatis tanpa error stok minus.

---

### Sprint 1.5: Fitur Pintar Restok & Prediksi Belanja Pasar
* **Rujukan Dokumen:** Blueprint Pilar 3.6; Panduan Bab 18.
* **Fitur & Komponen yang Dibangun:**
  1. **Radar Sisa Hari Habis (Days of Inventory Left):**
     * Perhitungan: $\text{Stok Tersedia} \div \text{Rata-rata Penjualan 7 Hari}$.
     * Badge visual status:
       * 🔴 **Kritis (< 2 hari):** Kehabisan stok dalam 48 jam.
       * 🟡 **Menipis (3–5 hari):** Perlu dijadwalkan belanja.
       * 🟢 **Aman (> 5 hari):** Stok stabil.
       * ⚪ **Barang Mati (Dead Stock > 30 hari):** Rekomendasi cuci gudang / promo bundling.
  2. **Algoritma Titik Pesan Kembali (Reorder Point / ROP):**
     * Notifikasi otomatis saat stok riil $\le (\text{Penjualan Harian} \times \text{Lead Time}) + \text{Safety Stock}$.
  3. **Generator Daftar Belanja Pasar Otomatis (1-Klik):**
     * Tombol "Buat Daftar Kulakan Hari Ini" mengelompokkan barang berdasarkan lokasi kulakan (Pasar Pagi, Agen Sembako, Distributor).
     * Rekomendasi hemat satuan grosir (beli dus/bal bukan eceran).
     * Estimasi total modal kas yang harus dibawa pemilik ke pasar.
  4. **Mode Checklist Belanja di Smartphone:**
     * Tampilan ramah HP dengan centang barang terbeli dan input harga beli riil di pasar jika harga berfluktuasi.
* **Kriteria Selesai (DoD):** Pemilik dapat menekan 1 tombol untuk melihat daftar belanja pasar lengkap dengan estimasi total biaya modal yang dibutuhkan.

---

### Sprint 1.6: Pengadaan Barang, Kulakan Tempo & Konsinyasi Jajanan
* **Rujukan Dokumen:** Blueprint Pilar 4.1 s/d 4.3; Panduan Bab 10 & Bab 11.
* **Fitur & Komponen yang Dibangun:**
  1. **Input Nota Kulakan Cepat:**
     * Form penerimaan barang belanjaan: catat supplier, barang masuk, jumlah satuan besar/kecil, harga beli baru, dan pembaruan HPP WAC (*Weighted Average Cost*).
  2. **Buku Hutang Tempo Supplier (Accounts Payable):**
     * Catat status pembayaran: Tunai atau Tempo (Jatuh tempo tgl X).
     * Pengingat jatuh tempo H-3 di dashboard pemilik.
     * Pencatatan cicilan/pelunasan hutang supplier via kas toko.
  3. **Manajemen Konsinyasi / Titipan Tetangga (Kue & Kerupuk):**
     * Input titipan pagi: Nama penitip, nama kue, jumlah titip, harga jual, harga setor.
     * Rekonsiliasi sore: Hitung sisa kue tidak laku, hitung barang rusak/basi.
     * Cetak bukti bagi hasil: Total omzet kue, komisi toko, dan uang bersih yang diserahkan ke penitip.
* **Kriteria Selesai (DoD):** Transaksi kulakan memperbarui stok dan HPP, jadwal jatuh tempo supplier terpantau, perhitungan bagi hasil konsinyasi otomatis dan akurat.

---

### Sprint 1.7: CRM Tetangga & Buku Kasbon Digital (Piutang)
* **Rujukan Dokumen:** Blueprint Pilar 5.1 s/d 5.3; Panduan Bab 7.
* **Fitur & Komponen yang Dibangun:**
  1. **Master Pelanggan Kasbon:**
     * Data tetangga: Nama, Alamat/Gang, No. WhatsApp, Foto Wajah/KTP, dan Batas Limit Kasbon (Credit Limit).
  2. **Validasi Kasbon di Meja Kasir:**
     * Kasir memilih nama pelanggan saat checkout kasbon; sistem memblokir atau memberi peringatan jika total hutang melebihi limit.
  3. **Pembayaran Angsuran Kasbon:**
     * Pelanggan bayar cicil atau lunas; sistem menerbitkan struk tanda terima mutasi sisa kasbon terkini.
  4. **Pengingat WhatsApp Ramah (1-Klik):**
     * Tombol kirim pesan WhatsApp otomatis yang merangkum rincian nota belanja yang belum terbayar dengan kalimat santun bertetangga.
* **Kriteria Selesai (DoD):** Transaksi kasbon memotong limit pelanggan, riwayat mutasi hutang transparan, pesan WhatsApp terformat rapi sekali klik.

---

### Sprint 1.8: Laci Uang, Shift Blind Count, Kas Operasional, Prive & Tandem Kasir Keluarga
* **Rujukan Dokumen:** Blueprint Pilar 6.1 s/d 6.4; Panduan Bab 8, 9, 12, 13, 19.
* **Fitur & Komponen yang Dibangun:**
  1. **Buka Shift & Catat Modal Kas Awal:**
     * Input nominal modal kembalian di laci kasir oleh kasir bertugas.
  2. **Tutup Shift & Rekonsiliasi Blind Count:**
     * Kasir menghitung fisik uang kertas & koin di laci tanpa melihat angka ekspektasi sistem (*Blind Count*).
     * Sistem membandingkan: Uang Fisik vs Uang Seharusnya (Modal + Penjualan Tunai + Kas Masuk - Kas Keluar), dan mencatat selisih (*surplus/minus*).
  3. **Pencatatan Kas Masuk / Keluar Kecil (Petty Cash):**
     * Beli es batu, galon air, tukar pecahan kecil, bayar iuran sampah/lingkungan.
  4. **Pemisahan Prive Rumah Tangga:**
     * **Prive Tunai:** Pemilik mengambil uang laci untuk belanja sayur dapur/uang saku anak.
     * **Prive Barang:** Pemilik mengambil sembako (beras/telur/gas LPG) dari rak toko dengan perhitungan harga modal HPP (bukan harga jual).
  5. **Mode Multi-Perangkat Laci Bersama (Tandem Kasir Keluarga):**
     * Fitur **"Gabung ke Shift Aktif"** di perangkat kedua/ketiga (HP suami/istri/anak) tanpa menginput modal awal terpisah.
     * Transaksi mandiri di masing-masing perangkat: scan belanjaan, hitung uang kembalian, terima tunai, dan cetak/struk digital.
     * Konsolidasi otomatis seluruh penerimaan kas tunai ke satu `active_shift_id` laci fisik utama.
     * Rekonsiliasi tutup shift tunggal di akhir hari yang memvalidasi total fisik kas laci terhadap akumulasi seluruh perangkat.
* **Kriteria Selesai (DoD):** Uang laci terhitung seimbang, penarikan keluarga tercatat rapi, dan kasir pembantu dapat bertransaksi langsung menyetor uang ke laci bersama tanpa duplikasi shift.

---

### Sprint 1.9: Dashboard Pemilik, Analitik Bisnis & Ekspor Laporan
* **Rujukan Dokumen:** Blueprint Pilar 7.1 s/d 7.4; Panduan Bab 14.
* **Fitur & Komponen yang Dibangun:**
  1. **Indikator Detak Harian (Daily Pulse):**
     * Total omzet hari ini (terpilah Tunai, QRIS, Kasbon).
     * Laba kotor & estimasi laba bersih (Omzet dikurangi HPP dan beban operasional).
     * Total piutang kasbon aktif & total hutang supplier jatuh tempo terdekat.
  2. **Analisis Produk Unggulan:**
     * Top 10 barang paling menguntungkan (kontributor margin terbesar).
     * Top 10 barang paling laris (volume perputaran tercepat).
  3. **Audit Kinerja & Rekap Kasir:**
     * Rekapitulasi penjualan per kasir, jam sibuk transaksi, dan riwayat selisih kas per pegawai.
  4. **Ekspor Data Mandiri:**
     * Tombol ekspor laporan penjualan, mutasi stok, dan buku kasbon ke format file CSV / Excel.
  5. **Kartu UI Opsional AI Penasihat Bisnis Warung (Read-Only Advisory):**
     * Komponen kartu `AIBusinessAdvisorCard` dengan penanda jelas *"Fitur Opsional"*.
     * Tombol pemicu *"Minta Analisa & Saran Bisnis"* untuk pemilik toko.
     * Saklar on/off di menu Pengaturan Toko.
     * Tampilan rekomendasi naratif santai mencakup: deteksi modal mati (dead stock), risiko arus kas kasbon berlebih, dan saran alokasi kulakan.
     * Fallback lokal: Jika offline atau API tidak aktif, sistem menyajikan tips otomatis berbasis heuristik aturan lokal.
     * **Batasan Mutlak:** Komponen hanya bersifat penampil rekomendasi teks (*display-only*), tanpa tombol aksi yang dapat mengubah data transaksi, harga barang, stok, atau kasbon.
* **Kriteria Selesai (DoD):** Angka laba bersih tercermin real-time, laporan keuangan terpilah jelas, ekspor CSV berfungsi sempurna, dan kartu AI Penasihat Bisnis tampil elegan sebagai fitur opsional yang aman tanpa mengubah aturan bisnis.

---

### Sprint 1.10: Perangkat Keras Browser, PWA Offline & Polishing UI/UX
* **Rujukan Dokumen:** Blueprint Pilar 1.1, 1.2; Panduan Bab 15 & Bab 16.
* **Fitur & Komponen yang Dibangun:**
  1. **Direct Thermal Printing via Browser:**
     * Web Bluetooth & Web Serial API untuk printer kasir thermal 58mm & 80mm tanpa aplikasi perantara.
  2. **Pemindai Barcode Kamera:**
     * Integrasi kamera bawaan smartphone/tablet via BarcodeDetector API.
  3. **PWA Standalone & Ketahanan Offline Penuh:**
     * Service Worker & Manifest Web: Add to Home Screen (A2HS) bebas address bar browser.
     * Graceful negative stock: Kasir tidak terblokir saat stok sistem 0 namun barang fisik ada di tangan pembeli (diberi flag audit).
  4. **Dark Mode & Tema Kontras Tinggi:**
     * Pilihan tema gelap hemat daya dan tema kontras tinggi untuk kenyamanan mata saat warung beroperasi malam hari.
* **Kriteria Selesai (DoD):** Struk langsung tercetak via bluetooth, app jalan 100% saat mode pesawat/offline diuji, lolos audit kepatuhan frontend.

---

## FASE 2: PENGEMBANGAN BACKEND & SINKRONISASI CLOUD (SETELAH FRONTEND SELESAI)

### Sprint 2.1: Skema Database Relasional Cloud & Ledger Mutasi
* **Rujukan Dokumen:** Blueprint Pilar 8.1 s/d 8.8.
* **Pekerjaan yang Dilakukan:**
  1. Setup database Postgres relasional dengan seluruh tabel:
     * `products`, `product_units`, `inventory_ledger`
     * `sales`, `sale_items`, `split_payments`
     * `customers`, `customer_debts`, `debt_payments`
     * `suppliers`, `purchase_orders`, `purchase_items`, `supplier_debts`
     * `consignments`, `consignment_settlements`
     * `employees`, `shifts`, `cash_ledger`
     * `outbox_sync_queue`
  2. Indeks performa untuk query pencarian barcode, nama barang, dan riwayat kasir.

---

### Sprint 2.2: Autentikasi, Keamanan Akses & Row-Level Security (RLS)
* **Rujukan Dokumen:** Blueprint Pilar 1.4 & Pilar 8.8.
* **Pekerjaan yang Dilakukan:**
  1. Setup autentikasi cloud untuk akun pemilik warung.
  2. Enkripsi hashing PIN staf kasir (bcrypt/argon2).
  3. Implementasi kebijakan Row-Level Security (RLS):
     * Kasir dilarang membaca kolom HPP modal, harga beli, data laba bersih, dan tabel prive pemilik.
     * Supervisor hanya dapat mengakses tabel koreksi stok dan otorisasi void.
     * Pemilik memiliki akses ke seluruh tabel data warung.

---

### Sprint 2.3: Mesin Sinkronisasi Outbox Pattern & Conflict-Free ID
* **Rujukan Dokumen:** Blueprint Pilar 1.1 & Pilar 8.9.
* **Pekerjaan yang Dilakukan:**
  1. Pembuatan endpoint sinkronisasi batch penerima data offline dari IndexedDB client.
  2. Format Invoice bebas bentrok: `INV-[YYYYMMDD]-[DEVICE_PREFIX]-[LOCAL_SEQ]`.
  3. Mekanisme deduplikasi transaksi jika terjadi koneksi internet putus-nyambung berulang.
  4. Background worker pemroses antrean sinkronisasi bertahap.

---

### Sprint 2.4: Logika Bisnis Server & Ledger Otomatis (Termasuk Endpoint AI Advisor Opsional)
* **Rujukan Dokumen:** Blueprint Pilar 3.3, Pilar 4.1, Pilar 7.4, Pilar 8.7.
* **Pekerjaan yang Dilakukan:**
  1. Trigger kalkulasi otomatis HPP WAC (*Weighted Average Cost*) setiap kali ada mutasi faktur kulakan disetujui.
  2. Trigger pencatatan otomatis ke `inventory_ledger` dan `cash_ledger` untuk menjaga integritas pembukuan ganda (*double-entry balancing*).
  3. Scheduled job malam hari: kalkulasi tren penjualan 7 hari dan penentuan status ROP/Restok Pintar.
  4. **Layanan AI Advisor Opsional (Read-Only Edge Function):**
     * Endpoint agregasi data statistik (ringkasan omzet, daftar dead stock, rasio piutang kasbon) yang secara ketat menyaring dan membuang seluruh PII (nama tetangga, nomor telepon).
     * Integrasi model bahasa dengan kuota gratis / tanpa biaya langganan untuk menyusun narasi saran bisnis bahasa Indonesia.
     * Batasan keamanan: Endpoint hanya memiliki izin baca (*SELECT*) dan tidak memiliki izin modifikasi (*INSERT/UPDATE/DELETE*).

---

### Sprint 2.5: Integrasi Pesan WhatsApp Gateway & Backup Cloud
* **Rujukan Dokumen:** Blueprint Pilar 5.3 & Pilar 1.1.
* **Pekerjaan yang Dilakukan:**
  1. Integrasi API pengiriman tagihan kasbon otomatis via WhatsApp.
  2. Mekanisme auto-backup harian database ke cloud storage terenkripsi untuk proteksi data warung dari kerusakan perangkat kasir fisik.

---

## 3. CHECKLIST KONTROL KUALITAS & DEFENISI SELESAI (DEFINITION OF DONE)
1. **Frontend Mock Fidelity 100%:** Seluruh tombol, modal, kalkulator, rumus, dan validasi visual dapat didemonstrasikan menggunakan data lokal sebelum backend disentuh.
2. **Nol Tabrakan Bisnis:** Seluruh alur kerja (uang kembalian, pembulatan koin, retur, kasbon, prive, konsinyasi, restok, pegawai) teruji sesuai panduan operasional.
3. **Persetujuan Pemilik:** Implementasi kode baru dijalankan per sprint berdasarkan perintah eksplisit pemilik proyek.
