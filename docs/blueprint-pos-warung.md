# BLUEPRINT SPESIFIKASI SISTEM POS WARUNG KELONTONG SEMI-MINIMARKET (EDISI PENYEMPURNAAN)

**Status:** Disetujui & Disempurnakan (Edisi Arsitektur & Operasional Lengkap)  
**Tipe Aplikasi:** Progressive Web App (PWA) 100% Web  
**Model Operasional:** Single-Tenant Warung Mandiri (Online-First dengan Local-First IndexedDB & Graceful Offline Fallback)

---

## DAFTAR ISI
1. [Pilar 1: Arsitektur Sistem, PWA & Ketahanan Offline](#pilar-1-arsitektur-sistem-pwa--ketahanan-offline)
2. [Pilar 2: Modul Transaksi Kasir Kilat & Antarmuka Ramah Lansia (Front-Office)](#pilar-2-modul-transaksi-kasir-kilat--antarmuka-ramah-lansia-front-office)
3. [Pilar 3: Manajemen Inventaris, Multi-Satuan, HPP & Susut](#pilar-3-manajemen-inventaris-multi-satuan-hpp--susut)
4. [Pilar 4: Pengadaan Barang, Kulakan Tempo & Konsinyasi](#pilar-4-pengadaan-barang-kulakan-tempo--konsinyasi)
5. [Pilar 5: CRM Tetangga & Buku Kasbon Digital (Piutang)](#pilar-5-crm-tetangga--buku-kasbon-digital-piutang)
6. [Pilar 6: Manajemen Kas, Laci Uang, Shift & Prive Rumah Tangga](#pilar-6-manajemen-kas-laci-uang-shift--prive-rumah-tangga)
7. [Pilar 7: Dashboard Bisnis, Rekomendasi Pintar & Laporan](#pilar-7-dashboard-bisnis-rekomendasi-pintar--laporan)
8. [Pilar 8: Skema Database Relasional & Model Ledger Mutasi](#pilar-8-skema-database-relasional--model-ledger-mutasi)

---

## PILAR 1: ARSITEKTUR SISTEM, PWA & KETAHANAN OFFLINE

### 1.1 Fondasi Platform Web App
* **Zero-Installation App:** Berjalan penuh di atas browser modern (Google Chrome, Microsoft Edge, Safari) tanpa perlu instalasi file APK atau setup app store.
* **Progressive Web App (PWA):** Mendukung kapabilitas *Add to Home Screen* (A2HS) untuk mode layar penuh (*standalone display*) tanpa address bar browser.
* **Arsitektur Local-First dengan Sinkronisasi Otomatis:**
  * Dalam kondisi normal (Wi-Fi/seluler aktif), transaksi dan mutasi tersimpan *real-time* ke server cloud database.
  * Ketika koneksi internet terputus atau listrik padam, aplikasi otomatis beralih ke penyimpanan lokal browser (**IndexedDB** via Service Worker). Kasir tetap dapat melayani penjualan 100% tanpa jeda.
  * Begitu internet kembali online, antrean transaksi offline disinkronkan secara otomatis menggunakan *Outbox Pattern* di latar belakang.
* **Penomoran Faktur Bebas Bentrok (Conflict-Free Invoice ID):**
  * Untuk mencegah tabrakan nomor faktur saat kasir offline dan pemilik di pasar membuat transaksi bersamaan, format faktur menggunakan:  
    `INV-[YYYYMMDD]-[PREFIX_PERANGKAT]-[NOMOR_URUT_LOKAL]` atau ULID client-side.
* **Prinsip Stok Fisik Nyata (Graceful Negative Stock Allowance):**
  * Dalam realitas warung, jika barang ada secara fisik di tangan pembeli, kasir **dilarang terblokir** oleh sistem meski stok tercatat 0 atau minus (misal karena nota kulakan belum sempat diinput). Sistem mengizinkan transaksi dengan menandai flag audit agar pemilik mengoreksi data kulakan setelahnya.

### 1.2 Integrasi Perangkat Keras Langsung via Browser
* **Web Bluetooth & Web Serial API:** Komunikasi langsung dari browser ke printer thermal kasir (58mm dan 80mm) untuk cetak struk instan tanpa aplikasi jembatan pihak ketiga (seperti RawBT).
* **MediaDevices API (WebRTC) & Native BarcodeDetector:** Pemindaian barcode langsung menggunakan kamera bawaan smartphone/tablet, sangat efisien saat kulakan di pasar.
* **Dukungan Barcode Scanner Fisik:** Input via scanner USB atau Bluetooth yang dikenali sebagai *HID Keyboard Emulation* dengan *auto-enter*.

### 1.3 Adaptabilitas Antarmuka & Ergonomi Pengguna
* **Mode Meja Kasir Ramah Lansia (Desktop / Laptop / Tablet Touchscreen):**
  * Tata letak 2 kolom sederhana bebas distraksi (Daftar barang & Quick-Pad foto di kiri, Keranjang belanja & total di kanan).
  * Target tombol sentuh ekstra besar minimal **60x60 px hingga 80x80 px** agar penjaga warung lansia tidak salah tekan akibat tangan gemetar.
  * Keyboard shortcuts alternatif bagi yang terbiasa keyboard fisik (F2 pencarian, F4 tahan keranjang, F8 pembayaran, Enter cetak struk).
* **Mode Smartphone (Khusus Pemilik / Owner Mobile):** Tampilan ringkas untuk pemilik saat kulakan di pasar, mengecek mutasi kasbon via WhatsApp, menyetujui penyesuaian harga, dan memantau omzet harian.

### 1.4 Manajemen Pegawai, Multi-PIN & Matriks Hak Akses (Role-Based Access)
Sistem mendukung struktur warung mandiri hingga semi-minimarket dengan banyak kasir/pegawai bergantian:
* **Master Data Pegawai Terpadu:**
  * Profil lengkap staf: Nama Lengkap, Nama Panggilan (tampil di struk), No. WhatsApp/Telepon, Peran/Jabatan, dan Status (Aktif / Nonaktif / Cuti).
  * **Multi-PIN Mandiri:** Setiap kasir/pegawai memiliki PIN unik 4–6 digit. Tidak ada lagi satu PIN yang dipakai bersama oleh semua orang.
  * **Login Cepat & Buka Shift Berbasis Nama:** Kasir memilih namanya di layar pembuka lalu memasukkan PIN pribadinya. Laci kasir terhubung secara ketat ke pegawai yang sedang bertugas.
* **Matriks Hak Akses Berjenjang (Permission Matrix):**
  1. **Peran Kasir (Front-Office Cashier):**
     * **Boleh:** Transaksi kasir kilat, scan barcode, cari barang manual, tahan/panggil keranjang (*hold*), cetak ulang struk shift aktif, input kasbon pelanggan terdaftar, pembulatan uang koin.
     * **Terkunci:** Dilarang melihat HPP/harga modal, dilarang melihat laba bersih, dilarang void/hapus transaksi yang sudah tersimpan tanpa izin supervisor, dilarang mengubah harga jual secara bebas, dilarang mengambil kas selain pengeluaran operasional kecil berizin.
  2. **Peran Kepala Toko / Supervisor:**
     * **Boleh:** Seluruh fitur kasir ditambah otorisasi void transaksi salah, persetujuan retur barang, stock opname fisik (penyesuaian stok selisih), dan input penerimaan barang kulakan.
     * **Terkunci:** Laporan laba bersih total warung, modul penarikan dana prive pemilik, dan pengubahan data master pegawai inti.
  3. **Peran Pemilik Warung (Owner):**
     * Akses absolut 100%: Laporan laba kotor & laba bersih, margin HPP, mutasi kasbon, buku hutang supplier, penarikan kas prive rumah tangga, master pegawai, gaji/komisi kasir, dan reset PIN darurat.
* **Audit Trail & Akuntabilitas Kasir:**
  * Setiap nota transaksi dan mutasi laci menyimpan `cashier_id`.
  * Laporan rekap pergantian shift menyajikan **Selisih Kas Laci (Cash Discrepancy)** per pegawai (Uang terhitung di laci fisik vs Uang seharusnya di sistem) untuk mendeteksi dini kebocoran atau keteledoran hitung.

---

## PILAR 2: MODUL TRANSAKSI KASIR KILAT & ANTARMUKA RAMAH LANSIA (FRONT-OFFICE)

### 2.1 Input Barang Multimode
* **Auto-Focus Scanner:** Kursor otomatis berada pada field barcode. Setiap scan barang yang sama otomatis menaikkan kuantitas (`+1`).
* **Fuzzy Search:** Mesin pencari toleran singkatan dan kesalahan ketik (misal mengetik `"ind grg"` tetap memunculkan `"Indomie Goreng"`).
* **Quick-Pad Barang Curah / Tanpa Barcode:** Tab terdepan berisi tombol visual foto nyata untuk barang yang tidak memiliki barcode pabrik (telur eceran, beras curah, gula pasir, galon air, tabung gas LPG 3kg, es batu, dan jajanan pasar).
* **Shortcut Kode Cepat 2-3 Digit:** Opsi input kilat untuk sachet plastik kusut/berkilau yang sulit dibaca scanner (misal ketik `01` lalu Enter langsung memasukkan Kopi Kapal Api Sachet).

### 2.2 Multi-Satuan & Auto-Grosir
* Pilihan satuan fleksibel langsung pada keranjang belanja (misal: Sachet, Renteng, Dus).
* **Auto-Grosir Pintar:** Jika kasir men-scan barang eceran berulang kali hingga menyamai jumlah 1 tingkat di atasnya (misal men-scan 10 sachet yang setara 1 renteng), sistem otomatis memperbarui harga ke harga grosir rentengan.

### 2.3 Perhitungan Barang Pecahan & Timbangan
* Input kuantitas desimal (`0.25`, `0.5`, `1.5`) untuk barang curah kiloan, dilengkapi tombol shortcut instan: `[1/4 kg]`, `[1/2 kg]`, `[3/4 kg]`, `[1 kg]`.

### 2.4 Aturan Pembulatan Kasir (Cash Rounding Policy)
* Mengatasi masalah kelangkaan uang koin pecahan Rp 100, Rp 200, atau Rp 500 di warung:
  * Pilihan pembulatan otomatis ke atas/ke bawah (misal Rp 14.800 menjadi Rp 15.000).
  * Opsi tombol cepat: **"Kembalian Permen"** atau **"Donasi Kotak Amal"** yang tercatat transparan di pembukuan tanpa mengacaukan selisih laci kas.

### 2.5 Negosiasi Harga (Price Override) & Diskon Manual
* Fleksibilitas mengubah harga jual langsung pada baris keranjang saat tawar-menawar dengan pelanggan.
* Selisih pemotongan harga dicatat transparan sebagai **Diskon Manual** agar kalkulasi HPP dan laba bersih tetap akurat.

### 2.6 Modul Retur Cepat & Tukar Barang (Quick Exchange)
* Solusi ramah lansia saat tetangga kembali ke warung untuk menukar barang (misal: salah beli rasa mie instan atau salah merek rokok):
  * Cukup scan/pilih barang yang dikembalikan dan scan barang pengganti.
  * Jika harga sama: mutasi stok otomatis bertukar tanpa transaksi uang tunai.
  * Jika ada selisih harga: sistem langsung menampilkan nominal uang yang harus ditambah atau dikembalikan.

### 2.7 Penjualan Produk Digital & Jasa Warung (PPOB Ringan)
* Menu khusus untuk transaksi pulsa, paket data, token PLN, dan top-up e-wallet:
  * Mencatat uang tunai yang masuk ke laci kasir.
  * Mencatat pendapatan komisi bersih (misal biaya admin Rp 2.500) tanpa memotong stok fisik barang toko.

### 2.8 Parkir Keranjang (Hold Transaction)
* Menahan sementara hingga 5 antrean transaksi aktif saat pembeli mengambil barang tambahan yang tertinggal, memungkinkan kasir mendahulukan pembeli berikutnya.

### 2.9 Pembayaran & Struk Fleksibel
* **Kalkulator Kembalian Cepat dengan Asosiasi Warna Uang Rupiah:**
  * Tombol nominal uang pecahan cepat dicocokkan langsung dengan warna fisik uang kertas Rupiah:
    * **Merah Cerah:** Tombol `[Rp 100.000]`
    * **Biru Terang:** Tombol `[Rp 50.000]`
    * **Hijau Segar:** Tombol `[Rp 20.000]`
    * **Ungu:** Tombol `[Rp 10.000]`
    * **Kuning Emas:** Tombol `[Rp 5.000]`
    * **Abu / Netral Kontras:** Tombol `[Uang Pas]`
  * Memudahkan penjaga warung lansia agar tidak perlu mengeja deretan angka nol saat menerima lembaran uang fisik dari pembeli.
* **Split Payment:** Pembayaran kombinasi dalam 1 transaksi (sebagian Tunai, sisanya QRIS atau dicatat Kasbon).
* **Opsi Struk Digital WhatsApp:** Cetak thermal Bluetooth instan atau kirim nota belanja digital langsung ke nomor WhatsApp pelanggan via deep link `wa.me`.

### 2.10 Desain Antarmuka Ramah Lansia (Senior-Friendly UI/UX) & Aksesibilitas
1. **Quick-Pad Berbasis Foto Nyata Berukuran Besar:** Foto asli beresolusi jelas untuk barang tanpa barcode (gas LPG 3kg, galon air, telur, beras, es batu).
2. **Tipografi Jumbo & Kontras Tinggi (High Contrast):** Total belanja dan kembalian menggunakan font berukuran **28px - 36px bold**, kontras tinggi (teks hitam pekat di atas latar terang/kuning lembut) agar terbaca tanpa kacamata.
3. **Layar Kasir Bebas Distraksi:** Menyembunyikan menu navigasi samping dan grafik omzet. Hanya ada:
   - Area pencarian & tombol foto barang.
   - Daftar keranjang belanjaan.
   - Tombol besar hijau mencolok **[SELESAI / BAYAR]**.
4. **Umpan Balik Multi-Sensori (Audio & Visual Confirmation):**
   - Bunyi *Beep* jernih saat barcode ter-scan.
   - Bunyi lonceng sukses (*Ting*) saat pembayaran berhasil, disertai centang hijau besar dan angka kembalian layar penuh.
5. **Interaksi Satu Ketukan (Forgiving UI):** Bebas gestur rumit (*no swipe, no pinch, no long-press*). Semua aksi cukup 1 kali ketukan jari.

---

## PILAR 3: MANAJEMEN INVENTARIS, MULTI-SATUAN, HPP & SUSUT

### 3.1 Satuan Bertingkat Berbasis Satuan Terkecil (Base Unit)
* Gudang dan stok selalu dihitung berdasarkan 1 Satuan Terkecil (`base_unit`): Butir, Batang, Bungkus, atau Gram.
* Contoh hierarki konversi:
  * `1 Slop Rokok = 10 Bungkus = 160 Batang`.
  * Tampilan stok informatif untuk pemilik: `"9 Bungkus + 12 Batang"`.

### 3.2 Harga Pokok Penjualan Bergerak (Moving Average Cost)
* Sistem otomatis menghitung ulang harga modal rata-rata setiap kali ada penerimaan kulakan baru:
  $$	ext{HPP Baru} = rac{(	ext{Stok Lama} 	imes 	ext{HPP Lama}) + (	ext{Qty Masuk} 	imes 	ext{Harga Beli Baru})}{	ext{Total Stok Baru}}$$
* Menjamin laporan laba kotor dan laba bersih tetap presisi tanpa distorsi fluktuasi harga pasar.

### 3.3 Bundling & Paket Virtual
* Pembuatan paket promosi atau sembako (misal: *"Paket Berkah Ramadhan"* = Beras 2kg + Minyak 1L + Sirup 1 botol). Penjualan paket ini otomatis memotong stok fisik masing-masing komponen penyusunnya melalui tabel relasi `bundle_items`.

### 3.4 Toleransi Susut Barang Curah (Shrinkage Factor)
* Mengakomodasi penyusutan alami barang timbangan (misal: karung beras 50kg saat diecer per kg sering menjadi 49kg karena tercecer, atau telur pecah dalam peti).
* Tersedia menu penyesuaian susut eceran (*weighing shrinkage*) agar selisih timbangan tidak dituduhkan sebagai pencurian kasir.

### 3.5 Pelacak Kedaluwarsa (Expiry Tracker) & Retur Supplier
* Pencatatan tanggal kedaluwarsa untuk kategori rentan basi (susu, roti, bumbu instan).
* Indikator peringatan visual otomatis:
  * **Kuning:** H-30 sebelum kedaluwarsa.
  * **Merah:** H-7 sebelum kedaluwarsa.
* Modul Retur Pembelian ke Supplier (*Purchase Return*) untuk mendata barang rusak/basi yang dikembalikan ke agen/distributor guna klaim ganti barang atau potong nota.

### 3.6 Stock Opname Berbasis Alasan
* Penyesuaian stok manual wajib memilih kategori alasan untuk menjaga akuntabilitas:
  1. **Konsumsi Rumah Tangga (Prive):** Terintegrasi langsung sebagai beban prive pemilik.
  2. **Basi / Rusak / Hama:** Masuk ke pos beban kerugian inventaris.
  3. **Penyusutan Timbangan (Shrinkage):** Koreksi wajar barang curah.
  4. **Selisih Hitung:** Koreksi penyesuaian opname berkala.

---

## PILAR 4: PENGADAAN BARANG, KULAKAN TEMPO & KONSINYASI

### 4.1 Daftar Belanja Otomatis (Smart Restock List)
* Setiap produk yang mencapai batas `min_stock_alert` otomatis masuk ke antrean daftar kulakan.
* Daftar dapat dikelompokkan berdasarkan nama agen atau distributor langganan, dan dapat diekspor langsung menjadi teks pesanan WhatsApp siap kirim.

### 4.2 Mode Kulakan Mobile (Mobile Restock)
* Pemilik dapat melakukan input nota kulakan langsung di pasar menggunakan kamera smartphone:
  * Scan barcode -> pilih satuan beli (Dus/Karung/Bal) -> masukkan jumlah & harga beli faktur.
* **Detektor Kenaikan Modal:** Jika harga kulakan naik, sistem memberikan notifikasi penurunan margin laba dan menyajikan rekomendasi harga jual baru yang bisa disetujui dalam 1 klik.

### 4.3 Pencatatan Kulakan Tempo / Hutang Usaha (Supplier Payables)
* Mendukung pembelian barang dagangan secara tempo (bayar minggu depan/saat faktur jatuh tempo):
  * Mencatat jatuh tempo pembayaran faktur distributor.
  * Rekap hutang berjalan per agen/distributor.
  * Pencatatan pembayaran cicilan atau pelunasan hutang supplier langsung dari kas toko.

### 4.4 Manajemen Lengkap Barang Titipan (Konsinyasi Tetangga)
* Siklus operasional penuh untuk barang titipan (kue basah, donat, keripik, jajanan pasar):
  1. **Penerimaan Pagi:** Mencatat jumlah stok masuk awal dan harga setor titipan per biji.
  2. **Penjualan Kasir:** Barang terjual seperti biasa di kasir (terpotong dari stok konsinyasi).
  3. **Rekonsiliasi Sore/Besok Pagi:** Menginput sisa barang retur yang tidak laku.
  4. **Bagi Hasil Otomatis:** Sistem menghitung otomatis:
     $$	ext{Uang Setoran ke Penitip} = 	ext{Jumlah Terjual} 	imes 	ext{Harga Setor}$$
     $$	ext{Laba Komisi Warung} = 	ext{Jumlah Terjual} 	imes (	ext{Harga Jual} - 	ext{Harga Setor})$$
  5. **Tanda Terima Pembayaran:** Cetak slip setoran atau kirim rincian via WhatsApp ke penitip kue.

---

## PILAR 5: CRM TETANGGA & BUKU KASBON DIGITAL (PIUTANG)

### 5.1 Profil Pelanggan & Batas Kredit (Debt Limit)
* Menyimpan profil pelanggan warung (Nama, Patokan Lokasi Rumah, Nomor WhatsApp, Tagging Keluarga).
* Pengaturan batas maksimal utang (`debt_limit`). Muncul peringatan mencolok di layar kasir jika transaksi kasbon berikutnya akan melampaui limit. Pemilik dapat memberikan persetujuan lewat PIN khusus.

### 5.2 Siklus Jatuh Tempo Kasbon (Payday Matching)
* Penyesuaian tanggal jatuh tempo kasbon dengan siklus pemasukan tetangga (misal: Tanggal 1 / 25 untuk karyawan, atau hari Jumat untuk buruh mingguan).
* Sistem menandai warna kasbon: **Hijau** (aktif wajar), **Kuning** (mendekati tempo), **Merah** (melewati tempo).

### 5.3 Buku Mutasi Piutang Format Rekening Koran
* Pencatatan kronologis yang transparan: tanggal belanja, rincian barang yang diambil, riwayat pembayaran cicilan, dan sisa saldo utang berjalan.

### 5.4 Pembayaran Cicilan Fleksibel
* Mendukung cicilan sebagian. Sisa piutang berkurang secara otomatis dan uang tunai cicilan langsung tercatat ke dalam kas laci shift berjalan.

### 5.5 Kartu Tagihan WhatsApp 1-Klik
* Pembuatan draft pesan penagihan otomatis yang santun dan kekeluargaan, mencantumkan total saldo utang dan rincian transaksi belanja, siap dikirimkan ke WhatsApp pelanggan tanpa rasa canggung.

---

## PILAR 6: MANAJEMEN KAS, LACI UANG, SHIFT & PRIVE RUMAH TANGGA

### 6.1 Manajemen Shift Kasir & Serah Terima Laci (Cashier Shifts)
* Buka shift kasir: input modal awal uang kembalian (*Opening Float*).
* Menghubungkan setiap transaksi dan pengeluaran kas dengan ID shift kasir yang aktif (`shift_id`).
* Rekonsiliasi tutup shift harian: membandingkan saldo sistem (*System Expected Cash*) dengan uang fisik aktual di laci:
  $$	ext{Expected Cash} = 	ext{Modal Awal} + 	ext{Penjualan Tunai} + 	ext{Penerimaan Kasbon Tunai} + 	ext{Pemasukan Lain} - 	ext{Pengeluaran Operasional} - 	ext{Prive Tunai}$$
* Deteksi otomatis: Status **Pas**, **Lebih**, atau **Kurang** disertai catatan alasan selisih.

### 6.2 Manajemen Kas Kecil (Petty Cash Non-Transaksi)
* **Pemasukan Lain-lain:** Penjualan kardus/karung bekas, komisi pulsa/token listrik, jasa titip.
* **Pengeluaran Operasional:** Pembelian plastik kresek, isi ulang galon minum kasir, listrik warung, iuran keamanan/kebersihan RT.
* **Tukar Pecahan Uang (Cash Breakdown):** Fitur mencatat penukaran uang pecahan besar ke uang kecil tanpa mengubah total saldo kas laci.

### 6.3 Pemisahan Prive Rumah Tangga
* **Prive Tunai:** Mencatat penarikan uang kas laci untuk kebutuhan dapur/pribadi (uang jajan anak, beli sayur, bayar SPP) agar uang usaha tidak bocor diam-diam.
* **Prive Barang (1-Klik di Kasir):** Tombol cepat untuk mencatat pengambilan barang dagangan (beras, telur, minyak, sabun) untuk konsumsi rumah tangga sendiri. Nilai penjualan Rp 0 ke kasir, stok gudang otomatis terpotong, dan nilai HPP barang dicatat ke akun penarikan prive pemilik.

### 6.4 Arsitektur Multi-Perangkat Laci Bersama (Tandem Cashier / Shared Drawer Session)
* **Konsep Operasional Warung Keluarga:** Mengakomodasi kebutuhan nyata di lapangan di mana pemilik utama (kepala keluarga/penanggung jawab) dibantu oleh anggota keluarga lain (suami, istri, anak) atau staf pembantu menggunakan HP/tablet/PC masing-masing saat toko ramai, namun seluruh transaksi tunai fisik tetap disetor dan disimpan ke dalam **satu laci kasir fisik bersama**.
* **Mekanisme Gabung Shift Aktif (*Join Active Shift*):**
  1. Penanggung jawab shift utama membuka shift kasir di perangkat utama meja kasir (memasukkan modal awal kas).
  2. Perangkat pembantu (HP istri/suami/anak) memilih opsi **"Gabung ke Shift Aktif"** (memasukkan PIN atau memilih nama pembantu). Perangkat pembantu **tidak membuka shift baru** dan **tidak menginput modal awal baru**.
* **Eksekusi Transaksi Mandiri & Cepat:**
  * Setiap kasir pembantu dapat memindai barang, menghitung kembalian, menerima uang tunai langsung dari tangan pembeli, dan menyelesaikan transaksi secara mandiri di HP masing-masing.
  * Uang tunai fisik yang diterima langsung dimasukkan ke dalam satu laci kasir fisik bersama.
* **Konsolidasi Saldo & Rekonsiliasi Tunggal:**
  * Seluruh penjualan tunai dari semua perangkat secara otomatis teragregasi ke dalam satu `active_shift_id`.
  * Formula saldo laci sistem menghitung total penerimaan tunai gabungan:
    $$\text{Expected Cash} = \text{Modal Awal} + \sum \text{Penjualan Tunai (Semua Perangkat)} + \text{Kas Masuk} - \text{Kas Keluar} - \text{Prive}$$
  * Rekonsiliasi tutup shift (*blind count*) hanya dilakukan **satu kali** di akhir hari oleh penanggung jawab utama untuk laci fisik tersebut.
* **Jejak Audit Internal:** Setiap transaksi tetap merekam metadata `processed_by` (nama yang melayani) dan `device_id` untuk keperluan rekap internal, tanpa memecah uang laci kas.

---

## PILAR 7: DASHBOARD BISNIS, REKOMENDASI PINTAR & LAPORAN

### 7.1 Indikator Detak Harian (Daily Pulse)
* **Ringkasan Penjualan:** Total omzet terpilah berdasarkan metode pembayaran (Tunai, QRIS, Kasbon).
* **Laba Bersih Riil:** Kalkulasi otomatis: Omzet dikurangi HPP dan Biaya Operasional.
* **Total Piutang Beredar:** Monitoring total dana warung yang masih tertahan di kasbon pelanggan.
* **Total Hutang Supplier:** Monitoring kewajiban tempo kulakan yang harus dibayar ke distributor.

### 7.2 Analitik & Wawasan Pintar
* **Top 10 Produk Paling Menguntungkan:** Pemeringkatan berdasarkan total rupiah margin keuntungan yang dihasilkan, bukan hanya volume kuantitas terjual.
* **Indikator Efisiensi Modal (Stock Turnaround / Perputaran Stok):** Mengidentifikasi barang cepat laku (*Fast-Moving*) vs barang lambat laku (*Slow-Moving / Dead Stock*) yang membekukan modal dagang lebih dari 60 hari.
* **Valuasi Aset Warung:** Estimasi total nilai modal dari seluruh stok barang yang saat ini tersimpan di toko.

### 7.3 Kenyamanan UI, Cadangan Data & Audit Trail
* **Dark Mode:** Tampilan antarmuka ramah mata untuk kenyamanan penjaga warung saat shift malam.
* **Ekspor Data Excel/CSV:** Fitur unduh laporan transaksi, mutasi stok, kartu piutang, dan laba rugi ke format Excel/CSV (`.xlsx` / `.csv`).
* **Audit Trail Log:** Rekam jejak perubahan harga, koreksi stok, pembatalan transaksi, dan pemberian diskon manual.

### 7.4 AI Penasihat Bisnis Warung (Fitur Pendukung Opsional & Non-Intrusif)
* **Status & Sifat Fitur:** Berstatus *opsional* (dapat dinonaktifkan/diaktifkan bebas oleh Pemilik di Pengaturan) dan sepenuhnya bersifat *read-only advisory* (hanya membaca data ringkasan agregat dan memberikan saran tekstual, tanpa hak eksekusi perubahan data atau aturan bisnis).
* **Batasan Mutlak & Integritas Operasional:**
  1. **Logika Transaksional 100% Deterministik:** Seluruh perhitungan kasir, nominal kembalian, pembulatan koin, HPP moving average, pengurangan stok, mutasi laci, dan pencatatan buku kasbon dijalankan oleh logika matematika pasti di frontend/lokal secara deterministik tanpa campur tangan AI.
  2. **Tanpa Hak Eksekusi (Zero-Execution Privilege):** AI tidak memiliki akses untuk mengubah harga barang, tidak bisa merubah angka stok, tidak bisa membatalkan transaksi, tidak bisa menghapus kasbon, dan tidak bisa mengubah izin pegawai. Semua eksekusi operasional mutlak dilakukan manual oleh pemilik/staf yang berwenang.
  3. **Privasi & Keamanan Data (No PII):** Data yang dikirimkan untuk analisis hanyalah angka ringkasan statistik (agregat omzet harian/mingguan, kategori barang lambat laku, rasio piutang beredar, tren jam ramai). Data identitas pribadi tetangga/pelanggan (nama, nomor telepon, catatan utang per individu) tidak pernah dikirimkan ke model AI.
  4. **Infrastruktur Bebas Biaya Langganan (Free Tier):** Dirancang kompatibel dengan API kuota gratis / model terbuka tanpa biaya langganan bulanan agar tidak membebani arus kas warung kecil. Jika kuota habis atau perangkat dalam mode offline, sistem otomatis beralih ke analisis berbasis aturan lokal (rule-based heuristic).
* **Fokus Output & Rekomendasi Praktis:**
  1. *Pelepasan Modal Macet (Dead Stock Liquidation):* Mendeteksi barang yang tidak terjual >45–60 hari dan menyarankan strategi promosi atau bundling kreatif agar modal tunai segera kembali.
  2. *Peringatan Arus Kas Kasbon (Cashflow Risk Alert):* Mengingatkan pemilik bila rasio piutang kasbon aktif telah melampaui batas aman modal kerja warung, lengkap dengan saran pengetatan limit kredit tetangga.
  3. *Evaluasi Waktu & Alokasi Kulakan:* Menganalisis perputaran barang fast-moving vs slow-moving agar anggaran belanja pasar difokuskan ke barang yang paling cepat menghasilkan laba riil.
  4. *Penyajian Bahasa Warung yang Santai:* Narasi rekomendasi ditulis dalam Bahasa Indonesia yang lugas, komunikatif, mudah dipahami pemilik warung tanpa jargon akuntansi yang rumit, dan dapat dibaca dalam waktu kurang dari 2 menit.

---

## PILAR 8: SKEMA DATABASE RELASIONAL & MODEL LEDGER MUTASI

### 8.1 Prinsip Desain Database
Untuk menjamin konsistensi data antara perangkat kasir PC dan smartphone pemilik saat terjadi perpindahan status online/offline, sistem menggunakan pola **Event Ledger Mutation** (perubahan stok dan kas dicatat sebagai delta `+` atau `-`, bukan penimpaan nilai mutlak).

### 8.2 Skema Tabel Inti (Entity Relationship Diagram)

```text
=======================================================
1. MASTER PRODUK, UNIT, DAN BUNDLING
=======================================================

[products]
- id (UUID, PK)
- name (VARCHAR)
- barcode (VARCHAR, UNIQUE, NULLABLE)
- quick_code (VARCHAR, NULLABLE) -- Shortcut 2-3 digit
- category (VARCHAR) -- Sembako, Rokok, Minuman, Makanan Ringan, Sabun, Curah, PPOB
- base_unit (VARCHAR) -- Butir, Batang, Bungkus, Gram, Pcs
- min_stock_alert (DECIMAL)
- nearest_expiry_date (DATE, NULLABLE)
- avg_cost_price (DECIMAL) -- HPP Moving Average
- is_consignment (BOOLEAN, DEFAULT: FALSE)
- consignor_id (FK -> consignors.id, NULLABLE)
- is_bundle (BOOLEAN, DEFAULT: FALSE)
- is_active (BOOLEAN, DEFAULT: TRUE)
- created_at, updated_at

[product_units]
- id (UUID, PK)
- product_id (FK -> products.id)
- unit_name (VARCHAR) -- Sachet, Renteng, Dus, Kg, Bal, Slop
- barcode (VARCHAR, NULLABLE)
- conversion_rate (DECIMAL) -- Pengali terhadap base_unit
- selling_price (DECIMAL)
- is_default_pos (BOOLEAN)

[bundle_items]
- id (UUID, PK)
- parent_product_id (FK -> products.id) -- Produk paket
- child_product_id (FK -> products.id) -- Komponen penyusun
- child_qty (DECIMAL) -- Jumlah satuan terkecil yang dipotong

=======================================================
2. INVENTARIS & LEDGER MUTASI STOK
=======================================================

[stock_mutations] -- Ledger Mutasi Delta Stok
- id (UUID, PK)
- product_id (FK -> products.id)
- change_qty (DECIMAL) -- Positif untuk masuk, Negatif untuk keluar (dalam base_unit)
- unit_name (VARCHAR)
- mutation_type (ENUM: SALE, RESTOCK, PRIVE, SPOILED, SHRINKAGE, RETURN_CUSTOMER, RETURN_SUPPLIER, OPNAME_ADJUSTMENT)
- reference_id (UUID, NULLABLE) -- Terhubung ke transactions.id, purchases.id, atau sales_returns.id
- notes (TEXT, NULLABLE)
- device_id (VARCHAR)
- requires_audit (BOOLEAN, DEFAULT: FALSE) -- True jika terjadi transaksi saat stok sistem minus
- created_at (TIMESTAMP WITH TIME ZONE)

=======================================================
3. PENGADAAN KULAKAN & HUTANG SUPPLIER
=======================================================

[suppliers]
- id (UUID, PK)
- name (VARCHAR)
- contact_person (VARCHAR, NULLABLE)
- phone_wa (VARCHAR, NULLABLE)
- address (TEXT, NULLABLE)
- payment_term_days (INT, DEFAULT: 0) -- 0 = Tunai, >0 = Hari Tempo
- is_active (BOOLEAN, DEFAULT: TRUE)

[purchases]
- id (UUID, PK)
- invoice_no (VARCHAR)
- supplier_id (FK -> suppliers.id, NULLABLE)
- purchase_date (DATE)
- total_amount (DECIMAL)
- payment_status (ENUM: PAID, TEMPO, PARTIAL)
- paid_amount (DECIMAL, DEFAULT: 0)
- due_date (DATE, NULLABLE)
- notes (TEXT, NULLABLE)
- device_id (VARCHAR)
- created_at (TIMESTAMP WITH TIME ZONE)

[purchase_items]
- id (UUID, PK)
- purchase_id (FK -> purchases.id)
- product_id (FK -> products.id)
- unit_name (VARCHAR)
- qty (DECIMAL)
- conversion_rate (DECIMAL)
- purchase_price (DECIMAL) -- Harga beli per unit
- subtotal (DECIMAL)

[supplier_payments]
- id (UUID, PK)
- purchase_id (FK -> purchases.id)
- amount (DECIMAL)
- payment_method (ENUM: CASH, BANK_TRANSFER)
- shift_id (FK -> cashier_shifts.id, NULLABLE) -- Terhubung jika dibayar dari kas laci
- notes (TEXT, NULLABLE)
- created_at (TIMESTAMP WITH TIME ZONE)

=======================================================
4. KONSINYASI (BARANG TITIPAN TETANGGA)
=======================================================

[consignors]
- id (UUID, PK)
- name (VARCHAR) -- Misal: Bu Siti Donat, Pak RT Keripik
- phone_wa (VARCHAR, NULLABLE)
- address (TEXT, NULLABLE)
- is_active (BOOLEAN, DEFAULT: TRUE)

[consignments]
- id (UUID, PK)
- consignor_id (FK -> consignors.id)
- product_id (FK -> products.id)
- received_date (DATE)
- received_qty (DECIMAL)
- returned_qty (DECIMAL, DEFAULT: 0)
- sold_qty (DECIMAL, DEFAULT: 0)
- cost_price (DECIMAL) -- Harga setor ke penitip per biji
- selling_price (DECIMAL) -- Harga jual warung ke pembeli
- settlement_status (ENUM: PENDING, SETTLED)
- settled_at (TIMESTAMP WITH TIME ZONE, NULLABLE)
- notes (TEXT, NULLABLE)

=======================================================
5. CRM TETANGGA & BUKU KASBON DIGITAL
=======================================================

[customers]
- id (UUID, PK)
- name (VARCHAR)
- family_tag (VARCHAR, NULLABLE) -- Misal: "Keluarga Pak RT", "Kontrakan No 4"
- address_notes (TEXT, NULLABLE)
- phone_wa (VARCHAR, NULLABLE)
- debt_limit (DECIMAL, DEFAULT: 0)
- current_debt (DECIMAL, DEFAULT: 0)
- payday_date (INT, NULLABLE) -- Tanggal 1-31 atau hari jatuh tempo rutin
- is_active (BOOLEAN, DEFAULT: TRUE)

[customer_debt_ledger] -- Buku Rekening Koran Piutang
- id (UUID, PK)
- customer_id (FK -> customers.id)
- transaction_id (FK -> transactions.id, NULLABLE)
- mutation_type (ENUM: DEBT_INCREASE, REPAYMENT, ADJUSTMENT)
- amount (DECIMAL)
- balance_after (DECIMAL)
- cashier_name (VARCHAR)
- notes (TEXT, NULLABLE)
- created_at (TIMESTAMP WITH TIME ZONE)

=======================================================
6. TRANSAKSI PENJUALAN & RETUR KASIR
=======================================================

[transactions]
- id (UUID, PK)
- invoice_no (VARCHAR, UNIQUE)
- shift_id (FK -> cashier_shifts.id)
- cashier_name (VARCHAR)
- customer_id (FK -> customers.id, NULLABLE)
- payment_method (ENUM: CASH, QRIS, KASBON, SPLIT)
- cash_amount (DECIMAL, DEFAULT: 0)
- non_cash_amount (DECIMAL, DEFAULT: 0)
- kasbon_amount (DECIMAL, DEFAULT: 0)
- change_amount (DECIMAL, DEFAULT: 0)
- rounding_amount (DECIMAL, DEFAULT: 0) -- Nilai pembulatan koin (+/-)
- rounding_type (ENUM: NONE, CASH_ROUND, CANDY, DONATION)
- subtotal (DECIMAL)
- manual_discount (DECIMAL, DEFAULT: 0)
- total_amount (DECIMAL)
- total_cogs (DECIMAL) -- Total HPP untuk kalkulasi laba riil
- status (ENUM: COMPLETED, HOLD, CANCELLED)
- device_id (VARCHAR)
- is_synced (BOOLEAN, DEFAULT: TRUE)
- created_at (TIMESTAMP WITH TIME ZONE)

[transaction_items]
- id (UUID, PK)
- transaction_id (FK -> transactions.id)
- product_id (FK -> products.id)
- unit_name (VARCHAR)
- qty (DECIMAL)
- base_qty_deducted (DECIMAL)
- price_at_sale (DECIMAL)
- cost_at_sale (DECIMAL)
- subtotal (DECIMAL)

[sales_returns]
- id (UUID, PK)
- transaction_id (FK -> transactions.id)
- product_id (FK -> products.id)
- unit_name (VARCHAR)
- return_qty (DECIMAL)
- refund_amount (DECIMAL, DEFAULT: 0)
- return_reason (ENUM: EXCHANGE, SPOILED_DEFECT, WRONG_ITEM)
- shift_id (FK -> cashier_shifts.id)
- created_at (TIMESTAMP WITH TIME ZONE)

=======================================================
7. MANAJEMEN SHIFT & ARUS KAS LACI
=======================================================

[cashier_shifts]
- id (UUID, PK)
- cashier_name (VARCHAR)
- device_id (VARCHAR)
- opening_cash (DECIMAL)
- expected_cash (DECIMAL, DEFAULT: 0)
- actual_cash (DECIMAL, DEFAULT: 0)
- cash_variance (DECIMAL, DEFAULT: 0) -- Selisih (+ Lebih, - Kurang)
- started_at (TIMESTAMP WITH TIME ZONE)
- closed_at (TIMESTAMP WITH TIME ZONE, NULLABLE)
- notes (TEXT, NULLABLE)
- status (ENUM: OPEN, CLOSED)

[cash_flows]
- id (UUID, PK)
- shift_id (FK -> cashier_shifts.id, NULLABLE)
- type (ENUM: CASH_IN, CASH_OUT)
- category (ENUM: OPENING_FLOAT, CLOSING_DRAWER, CASH_DROP, OPERATIONAL_EXPENSE, PRIVE_CASH, DEBT_REPAYMENT, SUPPLIER_PAYMENT, CONSIGNMENT_PAYOUT, PPOB_CASH_IN, OTHER_INCOME)
- amount (DECIMAL)
- description (TEXT)
- recorded_by (VARCHAR)
- created_at (TIMESTAMP WITH TIME ZONE)
```

---
*Dokumen ini merupakan spesifikasi arsitektur teknis dan fungsional resmi POS Warung Kelontong Semi-Minimarket Edisi Lengkap.*


### 8.8 Tabel Master Pegawai & Audit Shift (`employees` & `shifts`)
```sql
CREATE TABLE employees (
    id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(50) NOT NULL, -- Nama yang tercetak di struk
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('kasir', 'supervisor', 'pemilik')),
    pin_hash VARCHAR(128) NOT NULL, -- PIN 4-6 digit
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Penyesuaian tabel shifts untuk akuntabilitas pegawai
ALTER TABLE shifts ADD COLUMN employee_id VARCHAR(36) REFERENCES employees(id);
ALTER TABLE sales ADD COLUMN cashier_id VARCHAR(36) REFERENCES employees(id);
ALTER TABLE cash_ledger ADD COLUMN employee_id VARCHAR(36) REFERENCES employees(id);
```
