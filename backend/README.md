# Pasar Pintar Kasir: Backend (Supabase)

Backend untuk aplikasi frontend `pasar-pintar-kasir`: PostgreSQL + RLS, RPC sinkronisasi, PIN pegawai di server, dan Edge Functions untuk AI, QRIS, dan PPOB.

> **Status jujur.** Logika Edge Functions diuji otomatis (11 tes, Supabase dan penyedia ditiru). **SQL migrasi belum pernah dijalankan** di PostgreSQL oleh pembuatnya, dan penyedia nyata (Midtrans, Digiflazz, Gemini) belum diuji dengan akun. Lakukan di proyek uji dulu, jalankan `supabase/tests/smoke.sql`, baru dipakai produksi.

## Isi
```
supabase/config.toml
supabase/migrations/   1_schema, 2_security_rpc (RLS + RPC), 3_views (laporan)
supabase/functions/    ai-advisor, qris-create, qris-status, qris-webhook, ppob-purchase, _shared
supabase/tests/smoke.sql
tests/backend.test.ts
```

## Deploy
Prasyarat: akun Supabase, [Supabase CLI](https://supabase.com/docs/guides/cli).
```bash
supabase login
supabase link --project-ref <REF_PROYEK>
supabase db push                                   # jalankan 3 migrasi
cp .env.example .env                               # isi rahasia (lihat di bawah)
supabase secrets set --env-file .env
supabase functions deploy ai-advisor
supabase functions deploy qris-create
supabase functions deploy qris-status
supabase functions deploy ppob-purchase
supabase functions deploy qris-webhook --no-verify-jwt   # dipanggil Midtrans tanpa login
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` disediakan otomatis untuk Edge Functions; jangan taruh di `.env`.

### Login pemilik (kode email)
Aplikasi meminta kode 6 digit. Di Supabase Dashboard → Authentication → Email Templates → **Magic Link**, pastikan isi email memuat `{{ .Token }}`. Untuk produksi pasang SMTP sendiri (SMTP bawaan sangat dibatasi).

### Hubungkan frontend
Isi di `.env` frontend: `VITE_SUPABASE_URL=https://<REF>.supabase.co` dan `VITE_SUPABASE_ANON_KEY=<anon key>`. Lalu di aplikasi: Pemilik → Cloud & Perangkat → masuk → Buat Toko → Mulai Sinkronisasi.

## Penyedia
| Fungsi | Variabel rahasia | Catatan |
| :--- | :--- | :--- |
| QRIS uji | `QRIS_PROVIDER=mock` (bawaan), `MOCK_PAY_AFTER_SECONDS=8` | Otomatis dianggap lunas beberapa detik setelah dibuat |
| QRIS Midtrans | `QRIS_PROVIDER=midtrans`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_SANDBOX=true` | URL notifikasi di dasbor Midtrans: `https://<REF>.supabase.co/functions/v1/qris-webhook` |
| PPOB uji | `PPOB_PROVIDER=mock` (bawaan) | Target berakhiran 13 gagal, 99 tertunda, lainnya sukses |
| PPOB Digiflazz | `PPOB_PROVIDER=digiflazz`, `DIGIFLAZZ_USERNAME`, `DIGIFLAZZ_API_KEY`, `DIGIFLAZZ_TESTING=true` | Gunakan SKU dari daftar harga Digiflazz |
| AI | `GEMINI_API_KEY`, opsional `GEMINI_MODEL` | Hanya menerima ringkasan angka; tanpa akses tulis |
| CORS | `ALLOWED_ORIGIN=https://kasir.contoh.com` | Batasi asal dengan domain aplikasi |

Sebelum memakai penyedia nyata, uji di sandbox: adapter ditulis dari dokumentasi publik dan bisa berbeda dari perilaku sebenarnya.

## Uji otomatis
```bash
npm install
npm test
```

## Model keamanan
- Klien tidak menulis langsung ke tabel; semua lewat RPC `SECURITY DEFINER` yang memeriksa keanggotaan toko. RLS hanya mengizinkan baca data toko sendiri.
- Hash PIN bcrypt hanya di server; terkunci 5 menit setelah 5 kali salah.
- Jejak audit berantai hash dan tidak dapat diubah/dihapus (pemicu).
- Surat jalan antar-cabang hanya antar toko milik pemilik yang sama.
- Edge Functions memeriksa token pengguna dan keanggotaan toko; webhook Midtrans memeriksa `signature_key` dan nominal.

## Batasan
- Belum ada pembatasan laju (rate limit); pasang di Supabase/WAF bila dipakai publik.
- Sinkronisasi memakai polling dari klien (tanpa Realtime).
- Akun perangkat dapat membaca seluruh data tokonya; PIN pegawai membatasi aksi di aplikasi, bukan akses data langsung.
