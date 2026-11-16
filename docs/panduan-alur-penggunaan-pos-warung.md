# PANDUAN PENGGUNAAN APLIKASI POS WARUNG KELONTONG (EDISI PENYEMPURNAAN)

**Panduan Operasional Harian Praktis untuk Pemilik dan Penjaga Warung Lansia**  
**Platform:** Web App / Progressive Web App (PWA)  
**Tujuan:** Panduan langkah demi langkah menjalankan kasir kilat, menangani pembulatan koin, retur barang, kasbon tetangga, barang titipan (konsinyasi), PPOB, kas laci, hingga tutup shift harian.

---

## DAFTAR ISI
1. [Peran Pengguna dan Persiapan Kasir](#1-peran-pengguna-dan-persiapan-kasir)
2. [Membuka Kasir & Memulai Shift](#2-membuka-kasir--memulai-shift)
3. [Mencatat Penjualan Kilat (Barcode, Foto Curah & Tombol Warna Uang)](#3-mencatat-penjualan-kilat-barcode-foto-curah--tombol-warna-uang)
4. [Menangani Pembulatan Koin, Uang Permen, dan Donasi](#4-menangani-pembulatan-koin-uang-permen-dan-donasi)
5. [Menangani Retur Cepat & Tukar Barang (Salah Beli)](#5-menangani-retur-cepat--tukar-barang-salah-beli)
6. [Mencatat Produk Digital & Jasa Warung (Pulsa, Token Listrik, Top-Up)](#6-mencatat-produk-digital--jasa-warung-pulsa-token-listrik-top-up)
7. [Mencatat Kasbon & Pembayaran Angsuran Tetangga](#7-mencatat-kasbon--pembayaran-angsuran-tetangga)
8. [Mengelola Uang Angsulan, Tambah Kas, dan Tukar Pecahan](#8-mengelola-uang-angsulan-tambah-kas-dan-tukar-pecahan)
9. [Mencatat Prive Rumah Tangga (Prive Tunai & Prive Barang)](#9-mencatat-prive-rumah-tangga-prive-tunai--prive-barang)
10. [Mengelola Stok Kulakan & Hutang Tempo Agen](#10-mengelola-stok-kulakan--hutang-tempo-agen)
11. [Mengelola Barang Titipan Tetangga (Konsinyasi Kue & Jajanan)](#11-mengelola-barang-titipan-tetangga-konsinyasi-kue--jajanan)
12. [Pergantian Shift & Serah Terima Kasir](#12-pergantian-shift--serah-terima-kasir)
13. [Menutup Kasir & Rekonsiliasi Laci](#13-menutup-kasir--rekonsiliasi-laci)
14. [Memantau Laporan Keuntungan & Aset Warung (Termasuk AI Penasihat Bisnis)](#14-memantau-laporan-keuntungan--aset-warung)
15. [Kondisi Internet Terputus (Mode Offline)](#15-kondisi-internet-terputus-mode-offline)
16. [Checklist Cepat Operasional Harian](#16-checklist-cepat-operasional-harian)
17. [Alur Pengelolaan Pegawai & Buka Shift Kasir (Multi-User)](#17-alur-pengelolaan-pegawai--buka-shift-kasir-multi-user)
18. [Alur Pemanfaatan Fitur Pintar Restok (Smart Reorder)](#18-alur-pemanfaatan-fitur-pintar-restok-smart-reorder)
19. [Alur Kasir Pembantu & Multi-Perangkat Laci Bersama (Tandem Kasir Keluarga)](#19-alur-kasir-pembantu--multi-perangkat-laci-bersama-tandem-kasir-keluarga)

---

## 1. Peran Pengguna dan Persiapan Kasir

Aplikasi dibuka melalui browser di komputer kasir, laptop, atau tablet layar sentuh (disarankan tablet minimal 10 inci untuk penjaga warung lansia agar tombol terlihat besar dan mudah disentuh).

### Peran yang Tersedia
- **Penjaga / Kasir (Mode Ramah Lansia):** Layar khusus yang bersih, hanya fokus pada pencarian barang, scan barcode, tombol foto barang curah, dan tombol nominal warna uang. Menu teknis, grafik, data HPP/laba, dan tombol hapus data dikunci demi keamanan.
- **Pemilik (Mode Manajemen Penuh):** Membuka seluruh fitur manajemen: harga modal (HPP), daftar kulakan, pengaturan kasbon, hutang supplier, barang titipan konsinyasi, dan laporan laba bersih melalui proteksi PIN.

### Standar Layar Kasir Ramah Lansia
1. **Layar Bebas Distraksi:** Tanpa grafik berputar atau menu samping membingungkan.
2. **Tombol Sentuh Raksasa:** Ukuran tombol minimal 60x60 px hingga 80x80 px agar tidak meleset saat ditekan.
3. **Tulisan Angka Jumbo:** Total harga dan uang kembalian berukuran besar dan tebal (font 28-36px bold) berlatar kontras tinggi sehingga mudah dibaca tanpa kacamata.
4. **Umpan Balik Suara:** Setiap scan berbunyi *"Bip"* dan pembayaran selesai berbunyi *"Ting"*.

---

## 2. Membuka Kasir & Memulai Shift

1. Buka aplikasi POS pada browser.
2. Masukkan PIN kasir yang bertugas.
3. Pada layar **Buka Kasir / Shift Baru**, hitung uang fisik pecahan kecil yang disiapkan di laci sebagai modal kembalian (*Opening Float*).
4. Masukkan jumlah tersebut (misalnya: **Rp 150.000**), lalu sentuh **[Mulai Shift]**.
5. Sistem mencatat waktu mulai shift dan nama kasir yang aktif.

> *Peringatan:* Saldo awal adalah modal uang kembalian yang ada di laci sebelum transaksi dimulai, bukan estimasi omzet penjualan.

---

## 3. Mencatat Penjualan Kilat (Barcode, Foto Curah & Tombol Warna Uang)

Layanan kasir diselesaikan melalui 3 langkah mudah:

### Langkah A: Memasukkan Barang Belanjaan
1. **Barang Berbarcode (Mie instan, sabun, detergen, minuman kemasan):**
   - Arahkan barcode ke scanner. Terdengar bunyi **"Bip"** dan barang langsung masuk keranjang.
   - Scan barang yang sama otomatis menambah kuantitas (`+1`).
2. **Barang Curah / Tanpa Barcode (Gas LPG 3kg, galon air, telur, beras, gula pasir, es batu):**
   - Sentuh **Foto Produk Asli** pada tab *Quick-Pad*. Penjaga cukup menyentuh gambar tabung gas hijau atau galon air tanpa membaca tulisan kecil.
3. **Barang Timbangan Pecahan (Telur kiloan, beras kiloan):**
   - Sentuh tombol pecahan cepat: `[1/4 kg]`, `[1/2 kg]`, `[3/4 kg]`, atau `[1 kg]`.
4. **Barang Sachet Berkilau / Kusut (Kopi sachet, sampo sachet):**
   - Ketik kode cepat 2 digit (misal `01` lalu Enter) untuk memasukkan produk instan tanpa repot scan kamera.

### Langkah B: Menekan Tombol Bayar
- Setelah semua belanjaan masuk, tekan tombol hijau besar di kanan bawah bertuliskan **[BAYAR]**.

### Langkah C: Menentukan Uang Pembeli Berdasarkan Warna Uang Rupiah
Untuk memudahkan orang tua tanpa repot menghitung angka nol:
1. **Cocokkan warna lembaran uang pembeli dengan tombol di layar:**
   - Pembeli memberi uang merah Rp 100.000 -> Tekan tombol **Merah [Rp 100.000]**
   - Pembeli memberi uang biru Rp 50.000 -> Tekan tombol **Biru [Rp 50.000]**
   - Pembeli memberi uang hijau Rp 20.000 -> Tekan tombol **Hijau [Rp 20.000]**
   - Pembeli memberi uang ungu Rp 10.000 -> Tekan tombol **Ungu [Rp 10.000]**
   - Pembeli memberi uang pas -> Tekan tombol **Abu-abu [UANG PAS]**
2. **Layar Kembalian Jumbo:**
   - Layar menampilkan tulisan raksasa:  
     `KEMBALIAN: Rp 14.000`
   - Kasir membacakan nominal tersebut dan mengambilkan uang kembalian dari laci.
3. **Konfirmasi Selesai:**
   - Terdengar bunyi lonceng **"Ting"**, centang hijau muncul, dan struk otomatis tercetak (atau struk dikirim via WhatsApp).

---

## 4. Menangani Pembulatan Koin, Uang Permen, dan Donasi

Sering kali warung kehabisan uang koin pecahan kecil (Rp 100, Rp 200, atau Rp 500):
1. **Opsi Pembulatan Sistem:**
   - Jika total belanja Rp 14.800 dan pembeli menyerahkan Rp 15.000, namun tidak ada koin Rp 200:
   - Kasir dapat menekan tombol pintas **[Bulatkan Rp 15.000]** atas persetujuan pembeli.
2. **Opsi Ganti Permen:**
   - Tekan tombol **[Ganti Permen (Rp 200)]**. Sistem otomatis mengurangi stok permen 1 biji dan mencatat transaksi laci pas.
3. **Opsi Donasi Kotak Amal:**
   - Tekan tombol **[Masuk Kotak Amal]**. Selisih koin dicatat ke akun penampungan donasi tanpa menjadi selisih tekor di laci kas.

---

## 5. Menangani Retur Cepat & Tukar Barang (Salah Beli)

Sering terjadi tetangga datang kembali beberapa menit setelah belanja karena salah beli (misal: disuruh istri beli mie rasa soto tapi terbeli mie goreng):
1. Tekan tombol **[Tukar Barang]** di layar kasir.
2. Scan barang yang dikembalikan pembeli (stok barang tersebut otomatis bertambah kembali `+1`).
3. Scan barang pengganti yang diinginkan pembeli (stok barang pengganti otomatis berkurang `-1`).
4. **Hasil Penyesuaian:**
   - **Harga Sama:** Layar menampilkan *"Tukar Pas (Rp 0)"*. Kasir cukup menekan Selesai.
   - **Barang Baru Lebih Mahal:** Layar menampilkan jumlah uang tambahan yang harus dibayar pembeli.
   - **Barang Baru Lebih Murah:** Layar menampilkan jumlah uang kembalian yang harus diberikan kepada pembeli.

---

## 6. Mencatat Produk Digital & Jasa Warung (Pulsa, Token Listrik, Top-Up)

1. Pada layar kasir, sentuh tab **[Produk Digital / Pulsa]**.
2. Pilih jenis transaksi: Pulsa / Token PLN / Top-Up E-Wallet.
3. Masukkan nominal transaksi (misal: Token PLN Rp 20.000) dan biaya admin warung (misal: Rp 2.500).
4. Masukkan nomor meteran/nomor HP pelanggan.
5. Terima uang tunai pembeli (Rp 22.500) dan masukkan ke laci kasir.
6. Konfirmasi di aplikasi. Sistem mencatat uang tunai masuk Rp 22.500 dan keuntungan bersih Rp 2.500 tanpa memotong stok barang fisik warung.

---

## 7. Mencatat Kasbon & Pembayaran Angsuran Tetangga

### Membuat Transaksi Kasbon Baru
1. Masukkan barang belanjaan ke keranjang seperti biasa.
2. Tekan tombol **[Pilih Pelanggan]** dan ketik nama atau patokan rumah tetangga (misal: *"Bu Tejo"*).
3. Periksa saldo utang lama dan sisa batas kasbon (*debt limit*).
4. Pilih metode pembayaran **[KASBON]** (atau **[SPLIT]** jika membayar sebagian tunai dan sisanya kasbon).
5. Konfirmasi transaksi. Stok barang berkurang dan buku piutang pelanggan otomatis bertambah.
6. Tekan tombol **[Kirim Rincian WA]** jika ingin mengirim nota belanja langsung ke nomor WhatsApp pelanggan.

> *Batas Limit Kasbon:* Jika kasbon baru melebihi limit yang disetujui, kasir lansia tidak dapat melanjutkan kecuali pemilik memasukkan PIN otorisasi.

### Mencatat Pembayaran Angsuran / Pelunasan Kasbon
1. Masuk ke menu **Buku Kasbon / Piutang**.
2. Cari nama pelanggan dan buka rincian rekening koran kasbonnya.
3. Tekan tombol **[Terima Angsuran / Bayar Utang]**.
4. Masukkan jumlah uang tunai yang diserahkan pelanggan (bisa cicil sebagian).
5. Konfirmasi. Saldo kasbon pelanggan langsung berkurang, uang tunai otomatis tercatat menambah laci kas shift hari ini, dan kasir dapat mengirim tanda terima pelunasan via WhatsApp dalam 1 klik.

---

## 8. Mengelola Uang Angsulan, Tambah Kas, dan Tukar Pecahan

- **Uang Angsulan (Modal Kembalian):** Selalu dicatat di awal shift saat Buka Kasir.
- **Tambah Kas / Float di Tengah Hari:** Jika uang kembalian di laci habis dan pemilik menyuntikkan uang pecahan baru, buka menu **Arus Kas -> Tambah Kas Kembalian**. Ini dicatat sebagai penambahan kas laci, bukan sebagai penjualan.
- **Tukar Pecahan Uang:** Jika kasir menukar uang Rp 100.000 dengan dua lembar Rp 50.000 ke tetangga, gunakan menu **Tukar Uang Pecahan**. Total saldo kas laci tetap sama, hanya rincian lembaran yang disesuaikan.

---

## 9. Mencatat Prive Rumah Tangga (Prive Tunai & Prive Barang)

Warung kelontong sering kali menyatu dengan rumah tinggal sehingga rentan campur aduk keuangan keluarga:

### Prive Tunai (Ambil Uang Laci untuk Dapur)
Jika uang kas laci diambil untuk uang jajan anak, belanja sayur di tukang sayur keliling, atau bayar iuran RT pribadi:
1. Buka menu **Arus Kas -> Prive Tunai**.
2. Masukkan nominal uang yang diambil dan keterangan singkat (misal: *"Uang saku anak sekolah"*).
3. Saldo uang sistem berkurang secara sah tanpa dianggap uang hilang saat tutup kasir.

### Prive Barang (Ambil Sembako Toko untuk Dapur Sendiri)
Jika pemilik/penjaga mengambil beras, telur, minyak goreng, atau sabun cuci piring dari rak warung untuk konsumsi dapur sendiri:
1. Sentuh tombol cepat **[Konsumsi Dapur / Prive Barang]** di kasir.
2. Scan barang atau sentuh foto produk yang diambil.
3. Konfirmasi dengan harga Rp 0.
4. Sistem otomatis memotong stok fisik gudang dan membukukan harga modal (HPP) barang tersebut sebagai beban prive pemilik.

---

## 10. Mengelola Stok Kulakan & Hutang Tempo Agen

### Penerimaan Kulakan Baru (Beli Tunai)
1. Buka menu **Kulakan / Barang Masuk**.
2. Scan barcode produk atau cari namanya.
3. Pilih satuan faktur (Dus, Bal, Karung, atau Slop).
4. Masukkan jumlah satuan dan total harga beli faktur.
5. Sistem otomatis menghitung konversi ke satuan terkecil dan memperbarui **HPP Rata-Rata Bergerak (Moving Average)**.
6. Simpan penerimaan. Jika harga kulakan naik, sistem langsung menampilkan rekomendasi harga jual baru.

### Kulakan Tempo (Hutang ke Agen / Distributor)
1. Pada form penerimaan kulakan, pilih status pembayaran **[TEMPO]**.
2. Pilih nama Agen/Distributor dan tanggal jatuh tempo faktur (misal: tempo 7 hari).
3. Stok barang langsung bertambah ke toko, dan tagihan masuk ke daftar **Hutang Usaha Supplier**.
4. Saat agen datang menagih, buka menu **Hutang Supplier -> Bayar Faktur**, lalu pilih sumber dana (dari laci kasir atau transfer bank).

---

## 11. Mengelola Barang Titipan Tetangga (Konsinyasi Kue & Jajanan)

1. **Penerimaan Pagi (Jam 06.00):**
   - Masuk ke menu **Konsinyasi**.
   - Pilih nama penitip (misal: *"Bu Siti Donat"*).
   - Masukkan jumlah donat yang dititipkan (misal: 30 biji) dan harga setor (misal: Rp 1.500/biji, warung menjual Rp 2.000/biji).
2. **Penjualan Sepanjang Hari:**
   - Kasir menjual donat seperti biasa melalui foto Quick-Pad donat.
3. **Rekonsiliasi Sore (Jam 17.00 saat penitip mengambil wadah):**
   - Hitung sisa donat yang belum laku (misal: tersisa 5 biji).
   - Masukkan angka sisa retur: 5 biji.
   - Sistem langsung menghitung:
     - Terjual: 25 biji.
     - Uang yang wajib disetorkan ke Bu Siti: `25 x Rp 1.500 = Rp 37.500`.
     - Laba komisi warung: `25 x Rp 500 = Rp 12.500`.
   - Ambil uang Rp 37.500 dari laci dan tekan **[Selesaikan Setoran]**. Pengeluaran kas laci otomatis tercatat sebagai beban bagi hasil konsinyasi.

---

## 12. Pergantian Shift & Serah Terima Kasir

Jika warung dijaga bergantian (misal: Ibu shift pagi sampai siang, Anak shift siang sampai malam):
1. Kasir yang selesai bertugas menekan tombol **[Tutup Shift]**.
2. Hitung uang fisik di laci bersama-sama dengan kasir pengganti.
3. Masukkan jumlah uang fisik dan lakukan konfirmasi serah terima.
4. Kasir pengganti menekan **[Buka Shift Baru]**, memasukkan PIN pribadinya, dan mengonfirmasi modal awal shift yang baru diterima.

---

## 13. Menutup Kasir & Rekonsiliasi Laci

Dilakukan setiap malam sebelum warung ditutup:
1. Pastikan tidak ada transaksi yang tertahan di *Hold*.
2. Tekan tombol **[Tutup Kasir Harian]**.
3. Keluarkan uang tunai fisik dari laci dan hitung secara teliti per lembar/koin.
4. Masukkan nominal uang fisik aktual yang dihitung ke sistem.
5. Sistem menampilkan perbandingan:
   - **Saldo Awal Laci**
   - Ditambah: **Penjualan Tunai + Angsuran Kasbon Tunai + Pemasukan Lain**
   - Dikurangi: **Pengeluaran Operasional + Prive Tunai + Setoran Konsinyasi**
   - **Total Uang Sistem (Expected Cash)** vs **Uang Fisik Aktual**
6. **Status Rekonsiliasi:**
   - **PAS:** Uang fisik cocok 100% dengan hitungan sistem.
   - **LEBIH:** Uang fisik lebih banyak dari catatan sistem.
   - **KURANG:** Uang fisik tekor/kurang. Masukkan keterangan alasan jika diketahui.
7. Tekan **[Konfirmasi Tutup Toko]**. Cetak ringkasan penutupan kasir untuk arsip pemilik.

> *Catatan QRIS:* Pembayaran non-tunai (QRIS) tidak dihitung sebagai uang fisik laci, melainkan langsung masuk ke saldo rekening bank pemilik.

---

## 14. Memantau Laporan Keuntungan & Aset Warung

Khusus Pemilik (Mode Owner):
- **Omzet & Laba Bersih:** Memantau laba kotor, potongan operasional, dan laba bersih riil harian/bulanan.
- **Top Produk Paling Menguntungkan:** Mengetahui barang yang paling banyak menyumbang uang laba (bukan hanya yang paling laris).
- **Perputaran Modal (Dead Stock):** Mengetahui barang yang sudah 60 hari tidak bergerak agar tidak dibeli lagi saat kulakan.
- **Valuasi Modal Warung:** Total nilai rupiah dari seluruh barang dagangan yang ada di rak dan gudang.
- **Total Piutang Kasbon:** Total uang warung yang saat ini masih dipinjam tetangga.

### Fitur Opsional: AI Penasihat Bisnis Warung (Saran & Wawasan Cerdas)
Di pojok atas halaman Dashboard Pemilik, tersedia kartu opsional **"Penasihat Warung Pintar"**:
1. **Cara Menggunakan:**
   - Pemilik membuka menu **Dashboard** dalam Mode Pemilik.
   - Tekan tombol **"Minta Analisa & Saran Bisnis"** (hanya aktif saat internet terhubung dan fitur diaktifkan pada menu Pengaturan).
   - Sistem akan merangkum ringkasan angka penjualan, stok mati, dan perputaran kasbon secara otomatis tanpa mengirim nama pelanggan atau data pribadi tetangga.
   - Dalam hitungan detik, muncul 3–4 poin saran praktis dalam bahasa Indonesia sehari-hari.
2. **Contoh Rekomendasi yang Muncul:**
   - *"Modal Anda sekitar Rp 1.200.000 tertahan di Minyak Goreng Merek B dan Pembersih Lantai Z yang tidak bergerak selama 50 hari. Disarankan buat paket hemat tebus murah bersama Beras 5kg agar uang tunai cepat berputar kembali."*
   - *"Kasbon beredar minggu ini naik 35%. Ingatkan pelanggan yang sudah mendekati jatuh tempo gajian sebelum tanggal 25 agar kas warung tetap aman untuk kulakan belanja pasar awal bulan."*
3. **Batasan Mutlak & Keamanan Bisnis:**
   - Saran dari AI **hanya berupa pertimbangan ide**. AI **tidak akan pernah mengubah harga barang, tidak bisa menambah/mengurangi stok, dan tidak bisa menghapus kasbon**.
   - Seluruh keputusan eksekusi tetap 100% manual di tangan pemilik warung.
   - Jika pemilik tidak ingin menggunakan fitur ini atau perangkat sedang offline, fitur dapat dinonaktifkan sepenuhnya di Pengaturan tanpa mengganggu fungsi kasir maupun laporan utama.

---

## 15. Kondisi Internet Terputus (Mode Offline)

Aplikasi dirancang tangguh saat mati lampu atau Wi-Fi putus:
1. Indikator di pojok layar akan berubah menjadi **[Kuning / Offline]**.
2. **Kasir Tetap Melayani Seperti Biasa:** Scan barcode, pilih foto curah, dan tombol warna uang kembalian tetap bekerja normal karena data tersimpan di memori browser (IndexedDB).
3. Transaksi masuk ke antrean lokal aman.
4. **Saat Internet Menyala Kembali:**
   - Indikator berubah menjadi **[Hijau / Online]**.
   - Sistem secara otomatis mengirimkan seluruh antrean transaksi offline ke server di latar belakang tanpa mengganggu kasir.
   - *Penting:* Jangan membersihkan riwayat/cache browser (*Clear Browser Data*) saat indikator masih menunjukkan antrean offline belum tersinkronisasi.

---

## 16. Checklist Cepat Operasional Harian

### Pagi Hari (Saat Buka Toko)
- [ ] Buka aplikasi di browser dan masukkan PIN.
- [ ] Hitung modal uang pecahan kembalian di laci.
- [ ] Masukkan saldo awal dan tekan [Mulai Shift].
- [ ] Catat penerimaan kue/jajanan titipan tetangga (konsinyasi pagi).

### Siang & Sore Hari (Operasional Berjalan)
- [ ] Setiap scan barcode, pastikan terdengar bunyi *"Bip"*.
- [ ] Cocokkan lembaran uang pembeli dengan tombol warna uang Rupiah.
- [ ] Catat kasbon tetangga dengan memilih nama pelanggan (cek limit utang).
- [ ] Jika ambil uang laci untuk belanja sayur, catat di [Prive Tunai].
- [ ] Jika ambil sembako toko untuk dapur sendiri, catat di [Prive Barang].
- [ ] Lakukan rekonsiliasi dan bayar bagi hasil kue titipan saat penitip datang sore hari.

### Malam Hari (Saat Tutup Toko)
- [ ] Periksa dan bersihkan transaksi tertahan (Hold).
- [ ] Hitung seluruh uang fisik di laci kasir.
- [ ] Masukkan nominal uang fisik pada menu [Tutup Kasir].
- [ ] Periksa status rekonsiliasi (Pas / Selisih).
- [ ] Pastikan seluruh data transaksi offline telah tersinkronisasi (Indikator Hijau).
- [ ] Matikan perangkat kasir dengan aman.

---

**Akhir Panduan.** Panduan ini mencakup seluruh alur operasional warung kelontong semi-minimarket modern, ramah lansia, dan tahan banting.


---

## 17. Alur Pengelolaan Pegawai & Buka Shift Kasir (Multi-User)

### A. Menambah & Mengatur Pegawai (Oleh Pemilik)
1. Pemilik masuk ke menu **Pemilik** dengan PIN Pemilik.
2. Buka tab **Kelola Pegawai** lalu klik **+ Tambah Pegawai**.
3. Masukkan data:
   * **Nama Lengkap & Nama Panggilan:** (Nama panggilan akan tercetak di struk belanja pembeli, misal: *Kasir: Siti*).
   * **Nomor WhatsApp:** Untuk koordinasi shift dan notifikasi darurat.
   * **Peran (Role):**
     * *Kasir:* Hanya bisa transaksi, hold keranjang, cetak struk, dan buka laci.
     * *Kepala Toko / Supervisor:* Bisa approve void transaksi salah, retur barang, dan stock opname fisik.
   * **PIN Kasir (4–6 Digit):** Tentukan PIN unik untuk pegawai tersebut.
4. Klik **Simpan Pegawai**. Pegawai kini aktif di sistem.

### B. Prosedur Buka Shift & Ganti Kasir
1. Di layar awal meja kasir, pegawai memilih namanya dari daftar dropdown/avatar kasir aktif.
2. Kasir memasukkan **PIN Pribadi** masing-masing.
3. Kasir menghitung uang modal awal di laci (misal: Rp 150.000) lalu memasukkan nominal ke sistem.
4. Klik **Buka Laci / Mulai Bertugas**.
5. Semua penjualan, mutasi uang masuk/keluar, dan cetak struk selama shift tersebut otomatis tercatat atas nama kasir tersebut (*audit trail*).

---

## 18. Alur Pemanfaatan Fitur Pintar Restok (Smart Reorder)

### A. Membaca Indikator Radar Restok di HP Pemilik
1. Pemilik membuka menu **Pemilik > Restok Pintar** di smartphone.
2. Periksa pengelompokan status barang:
   * 🔴 **Status Kritis (Sisa < 2 Hari):** Barang laris (Fast-Moving) yang stoknya diprediksi habis sebelum 48 jam berdasarkan tren 7 hari terakhir.
   * 🟡 **Status Menipis (Sisa 3–5 Hari):** Barang yang perlu dipersiapkan untuk order putaran berikutnya.
   * ⚪ **Status Mati (Dead Stock > 30 Hari):** Barang yang tidak laku selama sebulan. Pemilik disarankan membuat promo bundling/diskon modal untuk mencairkan uang tunai.

### B. Membuat Daftar Belanja Pasar Otomatis
1. Klik tombol hijau besar: **"Buat Daftar Kulakan Hari Ini"**.
2. Sistem otomatis mengumpulkan seluruh barang kritis & menipis, lalu mengelompokkannya:
   * **Tab Pasar / Agen Sembako:** Beras, telur, minyak goreng, gula pasir.
   * **Tab Distributor Minuman/Rokok:** Rokok, kopi kemasan, minuman dingin.
3. Sistem menampilkan rekomendasi hemat:
   * *"Indomie Goreng: Disarankan beli 2 Dus (80 pcs), estimasi modal Rp 224.000 (hemat Rp 16.000 dibanding beli eceran)."*
4. Sistem menghitung **Estimasi Total Modal Tunai** yang perlu dibawa ke pasar.
5. Saat di pasar, pemilik membuka daftar belanja ini di HP dan menggunakan tombol centang (checklist) untuk menandai barang yang sudah terbeli.

---

## 19. Alur Kasir Pembantu & Multi-Perangkat Laci Bersama (Tandem Kasir Keluarga)

Panduan ini digunakan ketika warung sedang sangat ramai pembeli, dan anggota keluarga (suami, istri, anak) atau staf pembantu ikut melayani pembeli menggunakan HP/tablet masing-masing, namun **uang tunai hasil penjualan tetap dimasukkan ke dalam satu laci kasir fisik bersama**.

### A. Membuka Shift Utama (Oleh Penanggung Jawab Kasir)
1. Kasir penanggung jawab utama (misal: Ibu) membuka aplikasi di perangkat meja kasir (tablet / PC utama).
2. Input modal awal uang kembalian (misal: Rp 100.000) lalu klik **Buka Shift Utama**.
3. Status shift kini aktif dan menjadi "Laci Induk".

### B. Menghubungkan HP Pembantu (Suami / Istri / Anak)
1. Buka aplikasi di HP masing-masing (HP Ayah / HP Anak).
2. Di halaman login kasir, sistem mendeteksi shift aktif dan menampilkan tombol: **"Gabung ke Shift Aktif (Laci Bersama)"**.
3. Pilih nama pembantu (misal: *Ayah* atau *Anak*) lalu masukkan PIN sederhana.
4. HP pembantu **tidak perlu memasukkan uang modal awal** karena modal awal sudah dihitung di laci induk.
5. Layar kasir di HP pembantu langsung siap digunakan untuk bertransaksi.

### C. Alur Pelayanan Transaksi di HP Pembantu
1. Kasir pembantu memindai barang belanjaan pembeli dengan kamera HP atau mengetuk menu barang curah.
2. Saat pembeli membayar:
   * Kasir pembantu menekan tombol nominal uang pembeli (menggunakan tombol warna uang Rupiah).
   * Layar HP pembantu menampilkan nominal kembalian dengan angka besar.
   * Kasir pembantu menerima uang tunai dari pembeli, memberikan uang kembalian, dan **langsung menaruh uang tunai tersebut ke dalam laci kasir fisik bersama** yang ada di meja kasir.
   * Klik **Selesai / Struk**. Transaksi langsung terekam dan memotong stok barang.

### D. Rekonsiliasi Tutup Toko di Akhir Hari
1. Saat toko tutup, kasir pembantu di HP masing-masing cukup menekan **"Selesai Membantu / Keluar"**.
2. Penanggung jawab utama (Ibu) melakukan proses **Tutup Kasir & Hitung Uang Laci**:
   * Sistem otomatis menjumlahkan seluruh penjualan tunai yang diproses oleh meja utama + HP Ayah + HP Anak.
   * Penanggung jawab menghitung uang fisik yang ada di dalam laci kasir bersama (*Blind Count*).
   * Sistem mencocokkan total uang fisik dengan total saldo gabungan seluruh perangkat.
   * Laporan ringkasan menampilkan rincian: total omzet bersama, serta jumlah transaksi yang dibantu oleh masing-masing anggota keluarga.
