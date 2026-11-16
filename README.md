# Pasar Pintar Kasir

Bangun frontend aplikasi POS Warung Kelontong Semi-Minimarket PWA sesuai dokumen blueprint dan panduan penggunaan yang terlampir. Jika frontend belum dibangun seluruhnya jangan bangun backend.

Fokus bangun frontend lengkap dengan mock data interaktif di browser (Local Storage / IndexedDB):
1. Mode Kasir Ramah Lansia (Senior-Friendly UI): Layar 2 kolom bersih bebas distraksi, tombol foto barang curah besar (gas 3kg, galon, beras, telur, es batu), kalkulator kembalian cepat dengan tombol warna uang kertas Rupiah (Merah Rp100k, Biru Rp50k, Hijau Rp20k, Ungu Rp10k, Kuning Rp5k, Abu Uang Pas), tipografi angka jumbo (28-36px bold), audio feedback (beep saat scan, chime saat sukses), tombol pembulatan koin/ganti permen/donasi, modul tukar/retur barang kilat, tab produk digital/PPOB ringan, dan parkir keranjang (Hold).
2. Mode Manajemen Pemilik (PIN Switch): Buka/tutup shift kasir dengan rekonsiliasi uang laci, katalog produk multi-satuan (sachet/renteng/dus/kg) dengan kalkulator HPP moving average dan bundling, daftar kulakan otomatis dan hutang supplier tempo, manajemen barang titipan konsinyasi (terima pagi, retur sore, bagi hasil otomatis), CRM buku kasbon digital tetangga (rekening koran, limit kredit, tombol kirim WA), pencatatan prive tunai & prive barang, serta dashboard indikator omzet/laba bersih riil/dead stock.
3. Arsitektur Frontend: PWA installable, responsive untuk tablet kasir 10 inci/desktop dan mobile smartphone pemilik, indikator online/offline mock.

## Dokumentasi

Blueprint, spesifikasi WMS, panduan alur, setup, dan roadmap lengkap ada di [`docs/`](docs/README.md). Status Fase 1 ringkas ada di [`roadmap.md`](roadmap.md).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5538c215-1aff-45cf-893c-5597a981cb22).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Menjalankan dan deploy

```bash
bun install && bun dev        # pengembangan lokal (atau npm install && npm run dev)
bun test                      # tes
bun run build                 # build produksi
```

- **Mode lokal** tidak butuh konfigurasi apa pun.
- **Mode cloud**: salin `.env.example` menjadi `.env`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`, lalu bangun ulang. Backend ada di zip/repo terpisah `pasar-pintar-backend` (lihat README-nya).
- Deploy sebagai situs statis/SSR sesuai konfigurasi Lovable/Vite proyek ini. PWA, printer Bluetooth/USB/Serial, dan kamera hanya bekerja lewat **HTTPS** di Chrome/Edge.
- Panduan uji coba: `docs/UJI-COBA.md`. Status pembangunan: `docs/STATUS-PEMBANGUNAN.md`.
