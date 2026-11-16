# PANDUAN SETUP & PENGEMBANGAN: WARUNG PINTAR KASIR & WMS
**Dokumen Panduan Instalasi, Konfigurasi Lingkungan, PWA, dan Pengujian**  
*Versi Dokumen: 1.0*  
*Target Environment: Node.js 18+ / Bun 1.1+, Vite, React, Tailwind CSS v4, Lovable Cloud*

---

## 1. Persyaratan Sistem & Perangkat Keras

### Kebutuhan Perangkat Pengembang:
- **Runtime:** Node.js (v18.18.0 atau lebih baru) atau Bun (v1.1.0+ disarankan untuk kecepatan build dan instalasi dependensi).
- **Package Manager:** `bun` (prioritas) atau `npm` / `pnpm`.
- **Browser Pengujian:** Google Chrome, Microsoft Edge, atau Safari modern dengan dukungan Service Worker, Web Storage, dan WebHID/WebBluetooth.

### Kebutuhan Perangkat Klien Kasir (Operasional Warung):
- **Desktop/Laptop:** PC Kasir Windows/Linux/Mac dengan port USB untuk scanner & printer thermal.
- **Tablet / Smartphone:** Android (Chrome) atau iOS (Safari) dengan resolusi minimal 1024x768 untuk tablet atau 360x640 untuk HP kasir pembantu.
- **Printer Struk:** Thermal Printer 58mm atau 80mm (koneksi USB, Bluetooth, atau Network LAN/WiFi) dengan emulasi ESC/POS.
- **Scanner Barcode:** Scanner laser/2D USB HID (plug & play keyboard mode) atau kamera bawaan HP/tablet.
- **Cash Drawer:** Laci uang fisik dengan kabel konektor RJ11 terhubung ke printer thermal.

---

## 2. Struktur Proyek & Arsitektur Direktori

```
warung-pintar-kasir/
├── src/
│   ├── components/
│   │   ├── owner/               # Modul Pemilik / Supervisor (WMS & Admin)
│   │   │   ├── Advisor.tsx      # Komponen AI Penasihat Bisnis (Read-Only)
│   │   │   ├── Consign.tsx      # Manajemen Konsinyasi / Barang Titipan
│   │   │   ├── Customers.tsx    # Buku Pelanggan & Limit Kasbon
│   │   │   ├── Dashboard.tsx    # Ringkasan Omzet, Laba Bersih, & Dead Stock
│   │   │   ├── Employees.tsx    # Master Pegawai, Peran, & PIN Mandiri
│   │   │   ├── Payables.tsx     # Hutang Supplier & Jadwal Jatuh Tempo
│   │   │   ├── Prive.tsx        # Catatan Ambil Uang Dapur / Prive
│   │   │   ├── Products.tsx     # Katalog Produk & Multi-Satuan (UOM)
│   │   │   ├── Reports.tsx      # Ekspor Laporan (CSV & Excel)
│   │   │   ├── Restock.tsx      # Pembelian Kulakan & Faktur Masuk
│   │   │   ├── Settings.tsx     # Pengaturan Tema & Toggle Fitur
│   │   │   ├── Shift.tsx        # Buka/Tutup Shift & Audit Laci Kas
│   │   │   ├── SmartRestock.tsx # WMS: ROP, Analisis ABC, & Daftar Belanja
│   │   │   └── ui.tsx           # Komponen Presentasi Khusus Pemilik
│   │   ├── pos/                 # Modul Kasir Penjualan Depan
│   │   │   ├── Cart.tsx         # Daftar Belanjaan & Hitungan Keranjang
│   │   │   ├── EmployeeAccess.tsx # Modal Login PIN & Tandem Shift Bersama
│   │   │   ├── PaymentDialog.tsx  # Pembayaran Tunai, QRIS, Kasbon, & Split
│   │   │   ├── PinDialog.tsx    # Validasi Akses Peran & Otorisasi
│   │   │   ├── ProductGrid.tsx  # Grid Foto Besar & Kategori Cepat
│   │   │   └── Receipt.tsx      # Tampilan Struk Belanja & Cetak
│   │   └── ui/                  # Komponen Dasar UI (shadcn/ui + Tailwind v4)
│   ├── lib/
│   │   ├── format.ts            # Formatter Rupiah, Tanggal, & Angka
│   │   ├── operations.ts        # Pure Business Logic (ROP, ABC, Expiry, Grosir)
│   │   ├── operations.test.ts   # Unit Test Vitest untuk Logika Bisnis
│   │   ├── pwa.ts               # Registrasi Service Worker PWA (Preview-Safe)
│   │   └── store.ts             # State Management Lokal & Sinkronisasi Tab
│   ├── routes/                  # Routing Aplikasi (TanStack Router / Pages)
│   │   ├── __root.tsx           # Layout Utama, Dialog Global, & Tema
│   │   ├── index.tsx            # Halaman Depan Kasir POS
│   │   └── pemilik.tsx          # Portal Pemilik Toko
│   └── styles.css               # Definisi Tema Tailwind CSS v4
├── public/                      # Aset Statis, Manifest PWA, & Ikon
├── vite.config.ts               # Konfigurasi Vite & vite-plugin-pwa
├── vitest.config.ts             # Konfigurasi Pengujian Otomatis
└── package.json                 # Dependensi & Skrip Proyek
```

---

## 3. Langkah Instalasi & Menjalankan Proyek Lokal

### Langkah 1: Kloning & Pemasangan Dependensi
Buka terminal dan jalankan:
```bash
# Menggunakan Bun (Sangat Direkomendasikan)
bun install

# Atau menggunakan NPM
npm install
```

### Langkah 2: Menjalankan Server Pengembangan (Dev Mode)
```bash
# Menggunakan Bun
bun dev

# Atau menggunakan NPM
npm run dev
```
Aplikasi akan aktif secara default di `http://localhost:5173`.

### Langkah 3: Menjalankan Unit Test (Vitest)
Untuk memastikan seluruh perhitungan uang, auto-grosir, ROP, dan kalkulasi kedaluwarsa berjalan deterministik:
```bash
# Menjalankan pengujian sekali jalan
bun test

# Atau dalam mode watch (interaktif saat ngoding)
bunx vitest
```

---

## 4. Konfigurasi Mode Operasional

Aplikasi dirancang dengan arsitektur saklar konfigurasi agar dapat bertransisi mulus dari simulasi lokal ke backend cloud:

### Mode 1: Lokal-First / Standalone (Aktif saat ini)
- Seluruh data toko disimpan di browser via `src/lib/store.ts` menggunakan API Web Storage / IndexedDB.
- Tidak memerlukan database eksternal ataupun API Key pihak ketiga.
- Fitur multi-tab storage event aktif otomatis untuk mensimulasikan mode tandem kasir laci bersama pada browser yang sama.

### Mode 2: Cloud-Connected (Fase 2 - Lovable Cloud / Supabase)
Saat beralih ke Fase 2, buat file `.env` di root proyek:
```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_STORE_ID=warung-bu-sri-001
VITE_APP_ENV=production
```
Ketika variabel ini terisi, store lokal akan mengaktifkan driver sinkronisasi background worker (`outbox pattern`).

---

## 5. Konfigurasi PWA & Offline Caching (Preview-Safe)

Aplikasi menggunakan `vite-plugin-pwa` dengan aturan penting agar tidak mengganggu hot-reloading di editor:

1. **Preview Safe Guard (`src/lib/pwa.ts`):**
   - Service worker otomatis dinonaktifkan (`disabled`) saat berjalan di dalam iframe preview editor (`window.self !== window.top`) atau hostname preview khusus.
   - Pada aplikasi yang terbit (production URL) atau saat diakses langsung di tab mandiri, service worker terdaftar secara otomatis (`registerSW({ immediate: true })`).

2. **Strategi Caching Manifest:**
   - **App Shell & Aset Statis:** `CacheFirst` dengan masa berlaku 30 hari (HTML, JS, CSS, Font, Ikon).
   - **Data Gambar/Foto Produk:** `StaleWhileRevalidate` untuk efisiensi kuota internet kasir.

3. **Instalasi PWA:**
   - Buka browser di tablet/HP kasir, tekan menu browser (titik tiga atau tombol bagikan), lalu pilih **"Tambahkan ke Layar Utama" (Install App)**.
   - Aplikasi akan terbuka fullscreen layaknya aplikasi kasir bawaan tanpa address bar browser.

---

## 6. Setup Periferal Hardware Kasir

### A. Barcode Scanner (USB / Wireless Dongle)
1. Colokkan kabel USB scanner ke PC atau hubungkan dongle 2.4GHz / Bluetooth.
2. Pastikan scanner berada pada mode standar **USB HID Keyboard**.
3. Pastikan konfigurasi scanner mengirimkan akhiran **Enter (CR / LF)** setelah setiap scan.
4. Input kasir POS di layar utama akan menangkap input barcode secara otomatis tanpa kasir harus mengklik kolom pencarian secara manual.

### B. Thermal Printer ESC/POS (58mm / 80mm)
1. Hubungkan printer ke PC kasir (USB) atau pairing via Bluetooth untuk tablet Android/iOS.
2. Pada browser, buka dialog Cetak (`Ctrl+P`):
   - Atur Ukuran Kertas: `58mm x 210mm` atau `80mm x Roll`.
   - Atur Margin: `None` (Tanpa margin).
   - Nonaktifkan: `Headers and Footers` (Header dan footer URL browser).
3. Untuk integrasi **Direct ESC/POS Raw Print (Fase 3)**, aplikasi akan langsung berkomunikasi dengan device ID printer tanpa menampilkan dialog cetak sistem operasi.

### C. Cash Drawer (Laci Kas RJ11)
1. Hubungkan kabel RJ11 dari laci uang ke port `DK` (Drawer Kick) di bagian belakang printer thermal.
2. Setiap kali printer mencetak struk transaksi tunai atau kasir menekan tombol "Buka Laci" pada menu shift, printer akan memicu impuls elektrik yang melontarkan laci secara otomatis.

---

## 7. Keamanan Data & Kebijakan Backup

1. **Hashing PIN Pegawai:**
   - Pada mode lokal, PIN pegawai di-hash menggunakan algoritma SHA-256 sebelum disimpan ke dalam store untuk menghindari PIN terbaca polos di layar.
   - Pada mode cloud (Fase 2), validasi PIN dilakukan via RPC serverless dengan algoritma bcrypt/argon2.

2. **Pencegahan Formula Injection (CSV Sanitization):**
   - Seluruh ekspor CSV pada `src/components/owner/Reports.tsx` dilengkapi sanitasi otomatis: karakter awalan `=`, `+`, `-`, `@` otomatis diawali dengan petik tunggal (`'`) agar tidak dieksekusi sebagai formula berbahaya saat dibuka di Microsoft Excel.

3. **Backup Data Lokal:**
   - Pemilik toko dapat mengunduh salinan data penuh dalam format Excel (.xlsx) atau JSON sewaktu-waktu melalui portal Pemilik -> Laporan.

