# ROADMAP PENGEMBANGAN: WARUNG PINTAR KASIR & WMS
**Peta Jalan Pengembangan Aplikasi POS & WMS Kelontong Semi-Minimarket**  
*Versi Dokumen: 1.0 (Sinkron dengan Blueprint v3.2 & Panduan v3.2)*  
*Target Stack: React 18/19, Vite, Tailwind CSS v4, shadcn/ui, Local-First PWA, Lovable Cloud (Supabase PostgreSQL)*

---

## 1. Ringkasan Eksekutif & Prinsip Pengembangan

Aplikasi **Warung Pintar Kasir & WMS** dirancang untuk mendigitalkan operasional warung kelontong semi-minimarket dengan filosofi:
1. **Lokal-First & Zero-Downtime:** Transaksi kasir tidak boleh terhenti sedetik pun akibat gangguan koneksi internet atau server cloud.
2. **Determinisme Mutlak:** Seluruh hitungan uang, pembulatan, potongan kasbon, mutasi stok, dan saldo laci wajib deterministik tanpa campur tangan AI pada transaksi inti.
3. **Ramah Operasional Warung Keluarga:** Mendukung mode kasir lansia, mode kasir cepat, multi-PIN pegawai, serta **Mode Tandem Kasir (Queue Buster / Laci Bersama)** di mana beberapa perangkat (HP/tablet) dapat melayani antrean secara paralel dengan satu laci kas fisik terpadu.
4. **Tahapan Bertahap (Frontend -> Cloud Backend -> Hardware & Ekosistem):** Memastikan seluruh antarmuka dan interaksi pengguna teruji 100% pada simulasi lokal sebelum menghubungkan infrastruktur cloud backend.

---

## 2. Struktur Fase Pengembangan

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 1: FRONTEND ENGINE & LOKAL-FIRST PWA (Status: Core Terpasang)      │
│ - UI Kasir Cepat & Ramah Lansia                                         │
│ - Manajemen Pegawai & Multi-PIN (SHA-256)                               │
│ - Shift & Mode Tandem Laci Bersama (Multi-Tab / Multi-Client Local)     │
│ - Smart Restock (ROP, ABC, Sisa Hari Stok, Daftar Belanja Pasar)       │
│ - Split Payment, Multi-Satuan, Auto-Grosir, Deteksi Kedaluwarsa        │
│ - Ekspor Laporan (CSV Sanitized & Excel .xlsx), Dark/Contrast Mode      │
│ - AI Penasihat Bisnis Warung (Lokal Heuristik, Read-Only, Opsional)     │
│ - Unit Tests Vitest (9 Passing)                                         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 2: BACKEND CLOUD & SINKRONISASI REALTIME (Target Berikutnya)       │
│ - Schema Database PostgreSQL (Lovable Cloud / Supabase) & RLS           │
│ - Outbox Pattern, Offline Queue & Idempotent Conflict Resolution        │
│ - Sinkronisasi Realtime Tandem Multi-Perangkat (HP Kasir Pembantu)      │
│ - Verifikasi PIN Pegawai Server-Side & Audit Log Tamper-Proof           │
│ - Backup Otomatis & Pemulihan Snapshot Cloud                            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 3: INTEGRASI HARDWARE FISIK & PERIFERAL KASIR                      │
│ - Direct Printing Thermal ESC/POS (Bluetooth / USB 58mm & 80mm)         │
│ - Perintah Buka Laci Kas (Cash Drawer RJ11 Kick Pulse)                  │
│ - Integrasi Barcode Scanner (Kamera WebRTC & USB HID Keyboard Emulation)│
│ - Timbangan Digital Serial (RS-232 / WebSerial untuk Barang Curah)      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 4: CLOUD AI ADVISORY & ANALITIK LANJUTAN (OPSIONAL - READ ONLY)    │
│ - Edge Function / Serverless AI Advisor (Gemini Free Tier / Lovable AI) │
│ - Analisis Dead Stock, Prediksi Kulakan Hari Raya / Gajian              │
│ - Penilaian Risiko Kredit/Kasbon Pelanggan Tanpa Mengirimkan PII        │
│ - Rekomendasi Bundling / Promosi Khusus Warung                          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 5: MULTI-OUTLET, PPOB & PEMBAYARAN DIGITAL DINAMIS                 │
│ - Manajemen Multi-Cabang / Gudang Terpisah & Mutasi Antar-Toko         │
│ - Integrasi QRIS Dinamis Otomatis (Payment Gateway Terverifikasi)       │
│ - Modul Transaksi PPOB (Pulsa, PLN Token, BPJS, Top-up E-Wallet)        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Matriks Detail Sprint & Rincian Tugas

### FASE 1: FRONTEND LOKAL-FIRST & PWA (Status: Core Terpasang & Sisa Item)

| Sprint | Modul & Fitur | Status | Deskripsi & Batasan Pengujian |
| :--- | :--- | :---: | :--- |
| **1.1** | **Fondasi PWA & Local Store** | Selesai | Reactive store di `src/lib/store.ts`, persistensi LocalStorage, offline PWA guard (`vite-plugin-pwa`). |
| **1.2** | **Layar Kasir POS Utama** | Selesai | Grid foto besar, input barcode scanner, kalkulasi keranjang, kembalian pecahan otomatis, parkir belanjaan. |
| **1.3** | **Aturan Bisnis & Multi-Satuan** | Selesai | Auto-grosir, konversi satuan dasar vs kulakan, penanganan stok minus dengan flag audit, split payment. |
| **1.4** | **Master Pegawai & Akses PIN** | Selesai | Peran Kasir, Supervisor, Pemilik. PIN hashing lokal SHA-256, nama kasir tercetak di struk, audit selisih kas per staf. |
| **1.5** | **Shift & Tandem Laci Bersama** | Selesai | Buka laci modal awal, gabung shift pembantu (laci bersama) antar-tab lokal, rekonsiliasi kas tunggal saat tutup shift. |
| **1.6** | **WMS: Inventaris & Restok Pintar** | Selesai | Formula ROP, estimasi sisa hari stok, klasifikasi ABC (Pareto), generator daftar belanja pasar terkelompok supplier. |
| **1.7** | **Peringatan Kedaluwarsa & Kualitas**| Selesai | Indikator H-30 (kuning) dan H-7 / kedaluwarsa (merah) pada dashboard dan katalog. |
| **1.8** | **Buku Kasbon & Prive Pemilik** | Selesai | Batas plafon kasbon per pelanggan, cicilan kasbon, setoran kasbon saat shift aktif, penarikan uang dapur (prive). |
| **1.9** | **Ekspor Data & Pelaporan** | Selesai | Ekspor laporan penjualan, mutasi stok, buku kasbon ke format CSV (dengan proteksi CSV formula injection) dan Excel (.xlsx). |
| **1.10**| **UI/UX, Tema, & Penasihat Lokal** | Selesai | Pilihan tema Terang, Gelap, Kontras Tinggi. Kartu Penasihat Warung Pintar berbasis analisis heuristik lokal (read-only). |
| **1.11**| **Sisa Fase 1 (Penyempurnaan Akhir)** | Terjadwal | Simulasi pemindaian barcode kamera WebRTC, simulator struk cetak canvas ESC/POS 58mm/80mm, audit form stok opname fisik. |

---

### FASE 2: BACKEND CLOUD & SINKRONISASI REALTIME (Target Berikutnya)

| Sprint | Modul & Fitur | Dependensi | Deskripsi Teknis |
| :--- | :--- | :---: | :--- |
| **2.1** | **Database Schema & RLS** | Lovable Cloud / Supabase | Skema relasional PostgreSQL (`stores`, `employees`, `products`, `uom_conversions`, `shifts`, `sales`, `sale_items`, `payments`, `cash_moves`, `customers`, `debts`, `suppliers`, `payables`, `consignments`). Row Level Security (RLS) berdasarkan `store_id`. |
| **2.2** | **Otentikasi & Verifikasi PIN Server** | Sprint 2.1 | Otentikasi Pemilik via email/magic link, otentikasi cepat kasir via PIN hash (bcrypt/argon2) terenkripsi di serverless function. |
| **2.3** | **Engine Sinkronisasi Offline (Outbox)** | Sprint 2.1 | Tabel IndexedDB lokal `outbox_events`. Pola Idempotency Key (UUIDv4) untuk mencegah duplikasi nota transaksi saat koneksi pulih. |
| **2.4** | **Realtime Tandem Multi-Device** | Sprint 2.2 | Supabase Realtime Channel untuk broadcast transaksi kasir pembantu ke layar kasir utama, sinkronisasi total uang fisik laci bersama secara instan. |
| **2.5** | **Cloud Ledger & Rekonsiliasi Kas** | Sprint 2.3 | Rekonsiliasi multi-kasir di cloud. Snapshot neraca harian warung (kas masuk, kas keluar, piutang, hutang supplier, nilai aset stok). |

---

### FASE 3: INTEGRASI PERIFERAL HARDWARE FISIK

| Sprint | Modul & Fitur | Dependensi | Deskripsi Teknis |
| :--- | :--- | :---: | :--- |
| **3.1** | **Direct Thermal ESC/POS (USB/BLE)**| Browser WebHID / WebBluetooth | Driver cetak struk tanpa dialog popup OS. Dukungan pemotongan kertas otomatis (cutter) dan format struk ekonomis 58mm/80mm. |
| **3.2** | **Cash Drawer RJ11 Kick Pulse** | Sprint 3.1 | Pengiriman pulse pin 2/5 printer ESC/POS `ESC p 0 25 250` untuk membuka laci kas otomatis saat transaksi tunai selesai. |
| **3.3** | **Scanner Barcode Dual Mode** | WebRTC / Keyboard Event | Penangkapan input keyboard HID berkecepatan tinggi (<50ms per karakter) dan fallback kamera perangkat mobile menggunakan html5-qrcode. |
| **3.4** | **Timbangan Digital Serial (Opsional)**| WebSerial API | Integrasi timbangan buah/beras kiloan untuk membaca gramatur secara otomatis ke keranjang belanja kasir. |

---

### FASE 4: CLOUD AI ADVISORY (READ-ONLY & DATA TERAGREGASI)

| Sprint | Modul & Fitur | Dependensi | Deskripsi Teknis |
| :--- | :--- | :---: | :--- |
| **4.1** | **Edge Function AI Business Advisor** | Fase 2 | Endpoint cloud serverless (Gemini 1.5 Flash Free Tier / Lovable AI) yang menerima ringkasan agregat tanpa data pribadi pelanggan (PII). |
| **4.2** | **Analitik Dead Stock & Modal Tertahan**| Sprint 4.1 | Menghitung valuasi barang tidak bergerak (>30 hari) dan memberikan rekomendasi taktis (paket sembako, diskon cuci gudang). |
| **4.3** | **Prediksi Lonjakan Kulakan & Musiman**| Sprint 4.1 | Rekomendasi volume restok menjelang awal bulan, hari pasar, atau perayaan hari raya berdasarkan histori tren penjualan. |
| **4.4** | **Analisis Kesehatan Kasbon & Arus Kas**| Sprint 4.1 | Evaluasi rasio piutang pelanggan vs kas operasional warung, deteksi pelanggan dengan risiko gagal bayar. |

---

### FASE 5: MULTI-CABANG, PPOB & PEMBAYARAN DIGITAL DINAMIS

| Sprint | Modul & Fitur | Dependensi | Deskripsi Teknis |
| :--- | :--- | :---: | :--- |
| **5.1** | **Multi-Outlet & Transfer Gudang** | Fase 2 | Satu pemilik dengan lebih dari satu warung fisik. Mutasi stok antar-cabang dengan surat jalan digital. |
| **5.2** | **QRIS Dinamis Otomatis** | Payment Gateway | Generate QRIS dinamis per transaksi via layar kasir / tablet pelanggan, verifikasi status bayar otomatis via webhook realtime. |
| **5.3** | **Modul PPOB Warung** | API Aggregator PPOB | Penjualan pulsa, paket data, token PLN, tagihan air PDAM, dan top-up e-wallet langsung terintegrasi dengan saldo deposit warung. |

---

## 4. Metrik Kualitas & Kriteria Kelayakan (Definition of Done)

1. **Kecepatan Transaksi:** Waktu pemrosesan dari scan barang hingga cetak struk/selesai tidak boleh melebihi 5 detik per transaksi 3 barang.
2. **Kesesuaian Akuntansi Kas:** Selisih hitungan kas fisik vs sistem harus terdokumentasi rapi per shift dan per penanggung jawab tanpa ada angka yang hilang.
3. **Penyimpanan Lokal:** Ukuran penyimpanan data offline di browser tidak boleh membebani memori HP/tablet kelas entry-level (<50MB untuk 5.000 produk dan riwayat 3 bulan).
4. **Keamanan Formula:** Setiap file ekspor CSV wajib disanitasi dari karakter awalan berbahaya (`=`, `+`, `-`, `@`) guna mencegah eksekusi macro pada Microsoft Excel.
5. **Integritas Stok:** Tidak boleh ada mutasi stok tanpa referensi kejadian yang sah (penjualan, penerimaan kulakan, retur, penyesuaian opname, atau susut curah).

