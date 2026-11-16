# SPESIFIKASI BANGUN WMS (WARUNG MANAGEMENT SYSTEM)
**Spesifikasi Teknis Modul Inventaris, Gudang, Pengadaan, & Multi-Satuan Warung Kelontong Semi-Minimarket**  
*Versi Dokumen: 1.0 (Standar Industri Ritel Rakyat Modern)*  
*Target Implementasi: Store Engine, Operations Service, & Database Relasional PostgreSQL*

---

## 1. Definisi & Ruang Lingkup Sistem

Modul **WMS (Warung Management System)** merupakan inti pengelolaan barang dagangan yang mengatur siklus hidup produk mulai dari pengadaan (kulakan), penerimaan barang, penyimpanan gudang/rak display, konversi satuan kemasan, konsinyasi titipan, penanganan barang curah repacking, hingga pencatatan mutasi keluar akibat penjualan atau retur.

Berbeda dengan WMS pergudangan industri besar yang kaku, WMS Warung dirancang khusus untuk menghadapi realitas ritel rakyat:
1. **Multi-Satuan Fleksibel (UOM):** Barang yang dibeli dalam satuan besar (Dus/Karton/Karung/Bal/Renceng) dijual dalam satuan eceran (Pcs/Bungkus/Butir/Kg/Sachet).
2. **Sistem Konsinyasi Tanpa Modal:** Pencatatan titipan jajanan pasar, roti, dan kerupuk dengan sistem bagi hasil dan settlement hanya untuk barang yang laku.
3. **Barang Curah & Susut Timbangan:** Pembelian beras/gula karungan yang di-repack ke plastik kecil dengan toleransi susut alami.
4. **Otomasi Restok Pintar (Smart Restock):** Perhitungan otomatis kebutuhan kulakan berbasis data historis agar modal warung tidak mati di barang lambat laku (dead stock).

---

## 2. Arsitektur Multi-Satuan (Multi-UOM) & Konversi Otomatis

### 2.1 Konsep Satuan Dasar (Base Unit)
Setiap produk wajib memiliki satu **Satuan Dasar (Base Unit)** yang merepresentasikan unit terkecil pencatatan kuantitas stok fisik di database.
- *Contoh 1:* Mi Instan Goreng -> Satuan Dasar: `bungkus`.
- *Contoh 2:* Beras Medium -> Satuan Dasar: `kg`.
- *Contoh 3:* Telur Ayam -> Satuan Dasar: `kg` (atau `butir`).
- *Contoh 4:* Kopi Sachet -> Satuan Dasar: `sachet`.

### 2.2 Tabel Konversi Satuan Jual & Kulakan
Produk dapat memiliki banyak **Satuan Bertingkat (Packaging Units)** dengan faktor pengali (*multiplier*) terhadap Satuan Dasar:

| Nama Satuan | Faktor Pengali (*qty*) | Jenis Pemakaian | Contoh Kasus (Mi Instan) |
| :--- | :---: | :--- | :--- |
| **Bungkus (Base)**| `1` | Eceran Kasir | Dijual Rp3.100 / bungkus |
| **Renceng** | `10` | Jual Sedang | Dijual Rp30.000 / renceng (Auto-grosir) |
| **Dus / Karton** | `40` | Kulakan & Grosir Warung | Dibeli Rp112.000 / dus; Dijual Rp118.000 / dus |

### 2.3 Formula Mutasi Stok Multi-Satuan
Setiap transaksi masuk atau keluar dikonversi ke Satuan Dasar secara deterministik:
$$\Delta \text{Stok}_{\text{base}} = \text{Input Qty} \times \text{Multiplier}$$

- **Kasus Kulakan:** Pemilik kulakan `3 Dus` Mi Instan.
  $$\Delta \text{Stok}_{\text{base}} = + (3 \times 40) = +120 \text{ bungkus}$$
- **Kasus Penjualan Kasir:** Pelanggan membeli `1 Dus` dan `5 Bungkus`.
  $$\Delta \text{Stok}_{\text{base}} = - ((1 \times 40) + (5 \times 1)) = -45 \text{ bungkus}$$

### 2.4 Logika Auto-Grosir Dinamis di Kasir
Jika pelanggan membeli satuan eceran dalam jumlah kelipatan satuan grosir, kasir secara otomatis mengaplikasikan harga grosir yang lebih murah:
- Aturan: Jika beli eceran $\ge \text{Min Qty Grosir}$, harga per unit otomatis turun ke tier harga grosir tanpa kasir perlu memilih produk terpisah.

---

## 3. Algoritma Pengadaan Pintar (Smart Restock Engine)

WMS Warung dilengkapi mesin rekomendasi pengadaan deterministik yang berjalan di `src/lib/operations.ts`.

### 3.1 Perhitungan Laju Penjualan Harian ($d$)
Laju rata-rata penjualan harian dihitung dari pergerakan barang selama $N$ hari terakhir (standar: 7 hari):
$$d = \frac{\sum_{t=1}^{7} \text{Qty Terjual}_t}{7}$$

### 3.2 Estimasi Sisa Hari Stok (*Days of Inventory Remaining*)
Menunjukkan berapa hari stok di rak/gudang akan bertahan sebelum habis total:
$$\text{Sisa Hari} = \begin{cases} \frac{\text{Stok Fisik Saat Ini}}{d}, & \text{jika } d > 0 \\ 999, & \text{jika } d = 0 \text{ (Barang Tidak Laku)} \end{cases}$$

### 3.3 Formula Titik Pesan Ulang / Reorder Point ($ROP$)
Menentukan batas ambang kapan barang harus segera dibeli kembali ke pasar/distributor:
$$ROP = (d \times L) + SS$$
- $d$ = Rerata penjualan harian.
- $L$ = *Lead Time* (waktu tunggu pengiriman/jadwal kulakan dalam hari, default: 2 hari).
- $SS$ = *Safety Stock* (stok pengaman cadangan lonjakan permintaan, default: $\max(\text{minStock}, d \times 2)$).

### 3.4 Kategori Status Stok
1. **KRITIS / HABIS ($\text{Sisa Hari} \le 1$ atau $\text{Stok} = 0$):** Wajib dibeli hari ini juga.
2. **PERLU RESTOK ($\text{Stok} \le ROP$):** Masuk dalam daftar belanja pasar kulakan berikutnya.
3. **AMAN ($ROP < \text{Stok} \le \text{Maksimal}$):** Stok cukup untuk siklus normal.
4. **OVERSTOCK / DEAD STOCK ($\text{Sisa Hari} > 30$ dan tidak terjual $>30$ hari):** Peringatan modal macet; hentikan kulakan barang ini.

### 3.5 Klasifikasi Pareto ABC (Prioritas Modal)
Setiap produk diklasifikasikan berdasarkan kontribusi omzet 30 hari terakhir:
- **Kelas A (Fast Moving / 80% Nilai Penjualan):** Sekitar 20% varian produk penyumbang 80% omzet (Beras, Rokok/Minyak/Telur, Gas). **Toleransi stok habis: 0%**.
- **Kelas B (Medium Moving / 15% Nilai Penjualan):** Bumbu dapur, sabun mandi, deterjen.
- **Kelas C (Slow Moving / 5% Nilai Penjualan):** Barang pelengkap variasi (baterai, lem, alat tulis). Pembelian dalam jumlah minimal.

### 3.6 Generator Daftar Belanja Pasar Terpadu
Sistem WMS secara otomatis menghasilkan lembar checklist belanja pasar:
- Mengelompokkan barang yang berstatus "KRITIS" dan "PERLU RESTOK" berdasarkan **Lokasi Kulakan / Supplier** (Contoh: Agen Sembako Pasar Induk, Distributor Minuman, Sales Roti).
- Menyediakan estimasi kebutuhan modal kulakan:
  $$\text{Estimasi Modal} = \sum (\text{Saran Beli} \times \text{HPP Satuan Kulakan})$$

---

## 4. Pengelolaan Kulakan & Hutang Dagang (Accounts Payable)

### 4.1 Alur Faktur Masuk (Goods Receipt)
1. Pemilik mencatat nota pembelian kulakan dari distributor/pasar:
   - Tanggal dan nomor faktur supplier.
   - Pilihan supplier (atau supplier umum/pasar).
   - Rincian barang, satuan beli (dus/bal/renceng), kuantitas, dan harga beli riil.
2. **Pembaruan Otomatis HPP (Moving Average):**
   $$\text{HPP Baru} = \frac{(\text{Stok Lama} \times \text{HPP Lama}) + (\text{Qty Masuk} \times \text{Harga Beli Baru})}{\text{Stok Lama} + \text{Qty Masuk}}$$
3. **Pilihan Pembayaran Kulakan:**
   - **Tunai Laci Kas Toko:** Otomatis mencatat pengeluaran kas (`cash_moves`) pada shift kasir yang sedang aktif.
   - **Tempo / Hutang Dagang:** Mencatat catatan hutang (`payables`) dengan tanggal jatuh tempo (misal: 7 hari / 14 hari).

### 4.2 Pelacakan Jatuh Tempo & Pelunasan
- Dashboard menampilkan alarm jatuh tempo H-3 dan hutang lewat waktu.
- Pelunasan hutang tempo dapat dicicil atau lunas, memotong kas toko atau rekening bank pemilik.

### 4.3 Retur Pembelian ke Supplier
Jika barang saat dibongkar ditemukan rusak, bocor, atau expired:
- Mengurangi stok barang di gudang.
- Mengurangi saldo hutang ke supplier (jika belum lunas) atau mencatat piutang retur / pengembalian uang kas.

---

## 5. Sistem Konsinyasi (Titipan Barang Jajanan & Makanan Basah)

### 5.1 Karakteristik Konsinyasi Warung
Warung sering menerima titipan kue basah, kerupuk kaleng, gorengan, atau roti keliling tanpa mengeluarkan modal uang sepeser pun di awal.

### 5.2 Skema Bagi Hasil & Margin
- **Harga Setor Pemasok ($H_{\text{setor}}$):** Nilai hak penitip per unit barang (misal: Rp1.500 / bungkus kue).
- **Harga Jual Warung ($H_{\text{jual}}$):** Harga yang dibayar pembeli (misal: Rp2.000 / bungkus).
- **Komisi Warung:** $H_{\text{jual}} - H_{\text{setor}} = \text{Rp500 / bungkus}$ (100% laba bersih tanpa resiko modal).

### 5.3 Prosedur Settlement / Buka Kaleng / Tutup Periode
Saat penitip barang datang kembali untuk menagih (harian atau mingguan):
1. Hitung sisa stok fisik yang belum terjual ($S_{\text{sisa}}$).
2. Hitung jumlah retur barang basi/kedaluwarsa ($S_{\text{retur}}$).
3. Hitung jumlah terjual riil:
   $$\text{Qty Terjual} = \text{Stok Awal Masuk} - S_{\text{sisa}} - S_{\text{retur}}$$
4. Nilai bayar ke pemasok:
   $$\text{Total Setor} = \text{Qty Terjual} \times H_{\text{setor}}$$
5. Sisa barang basi diserahkan kembali ke pemasok. **Warung tidak menanggung kerugian kue yang basi.**

---

## 6. Barang Curah, Repacking, & Susut Stok

### 6.1 Alur Repacking Barang Karungan
1. Warung membeli `1 Karung Beras 50 Kg` seharga Rp650.000 (HPP dasar = Rp13.000/kg).
2. Pemilik/karyawan membungkus menjadi kemasan `Beras 1 Kg` sebanyak 49 bungkus dan plastik kemasan seharga Rp200/kantong.
3. Selisih 1 Kg tercatat sebagai **Susut Curah / Waste Alami** (debu/ceceran/timbangan timbang).

### 6.2 Perhitungan HPP Barang Hasil Repacking
$$\text{HPP Kemasan} = \frac{\text{Total Biaya Bahan Baku Terpakai} + \text{Biaya Kemasan Plastik}}{\text{Hasil Bungkus Jadi}}$$

### 6.3 Mutasi Otomatis
- Stok Induk (`Beras Karungan 50kg`): Berkurang 1 karung (-50 kg).
- Stok Anak (`Beras Kantong 1kg`): Bertambah +49 kantong.
- Jurnal Penyesuaian: Tercatat 1 kg susut operasional.

---

## 7. Audit Stok Opname & Pelacakan Kedaluwarsa

### 7.1 Prosedur Stok Opname Fisik
- Dilakukan berkala (mingguan per rak atau bulanan menyeluruh).
- Karyawan/pemilik menghitung fisik -> sistem menghitung selisih ($\text{Fisik} - \text{Sistem}$).
- Selisih minus wajib mencantumkan alasan (Rusak, Hilang, Kadaluwarsa, atau Koreksi Salah Hitung).

### 7.2 Aturan Khusus Stok Minus di Kasir
- Demi kelancaran transaksi saat antrean padat, kasir diizinkan menjual barang meski sistem mencatat stok 0 / minus (karena barang fisik ada di rak namun faktur kulakan belum sempat diinput).
- **Syarat Mutlak:** Transaksi stok minus otomatis ditandai flag `audit: true` agar pemilik dapat mengaudit dan mencocokkan nota kulakan susulan.

### 7.3 Manajemen Ambang Batas Kedaluwarsa (Expiry Alerts)
Setiap batch barang mencatat tanggal kedaluwarsa (`expiry`):
- **Level Aman:** Sisa masa simpan $> 30$ hari.
- **Level Peringatan Dini (Kuning):** Sisa $8 - 30$ hari (Tindakan: Tarik ke rak paling depan, jadikan paket promo hemat).
- **Level Bahaya / Kritis (Merah):** Sisa $\le 7$ hari atau sudah lewat (Tindakan: Retur ke supplier atau afkir dari display kasir).

---

## 8. Skema Relasional Database PostgreSQL (WMS Entities)

Berikut spesifikasi tabel database untuk implementasi Fase 2 (Lovable Cloud / Supabase):

```sql
-- 1. Master Produk
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  barcode VARCHAR(64) UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  emoji VARCHAR(16) DEFAULT '📦',
  base_unit VARCHAR(32) NOT NULL, -- pcs, kg, bungkus, sachet
  stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  min_stock NUMERIC(12, 3) NOT NULL DEFAULT 5,
  safety_stock NUMERIC(12, 3) NOT NULL DEFAULT 5,
  lead_time_days INT NOT NULL DEFAULT 2,
  market_location VARCHAR(120), -- Pasar Induk, Distributor A
  hpp NUMERIC(12, 2) NOT NULL DEFAULT 0,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_digital BOOLEAN NOT NULL DEFAULT FALSE,
  is_consignment BOOLEAN NOT NULL DEFAULT FALSE,
  is_quick_access BOOLEAN NOT NULL DEFAULT FALSE,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Multi-Satuan (Packaging Units)
CREATE TABLE product_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_name VARCHAR(32) NOT NULL, -- dus, renceng, lusin, pak
  multiplier NUMERIC(10, 3) NOT NULL, -- 1 dus = 40 pcs -> multiplier = 40
  sell_price NUMERIC(12, 2) NOT NULL,
  barcode VARCHAR(64),
  is_default_purchase BOOLEAN DEFAULT FALSE
);

-- 3. Mutasi Stok (Stock Ledger)
CREATE TABLE stock_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty NUMERIC(12, 3) NOT NULL, -- positif (masuk), negatif (keluar)
  balance_after NUMERIC(12, 3) NOT NULL,
  reason VARCHAR(64) NOT NULL, -- sale, purchase, opname, waste, return, repacking
  reference_id VARCHAR(64), -- ID nota penjualan atau nomor faktur beli
  employee_id UUID REFERENCES employees(id),
  audit_flag BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Pembelian Kulakan (Purchase Orders)
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  invoice_no VARCHAR(100),
  supplier_id UUID REFERENCES suppliers(id),
  total_amount NUMERIC(14, 2) NOT NULL,
  payment_type VARCHAR(32) NOT NULL, -- cash_drawer, cash_bank, credit_tempo
  due_date DATE,
  paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'completed', -- completed, partial, unpaid
  shift_id UUID REFERENCES shifts(id), -- jika bayar pakai kas laci aktif
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Detail Barang Kulakan
CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  unit_name VARCHAR(32) NOT NULL,
  qty NUMERIC(10, 3) NOT NULL,
  multiplier NUMERIC(10, 3) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(12, 2) NOT NULL,
  subtotal NUMERIC(14, 2) NOT NULL
);

-- 6. Konsinyasi & Penitip
CREATE TABLE consignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  received_qty NUMERIC(10, 2) NOT NULL,
  deposit_price NUMERIC(12, 2) NOT NULL, -- harga setor penitip
  sell_price NUMERIC(12, 2) NOT NULL,    -- harga jual kasir
  status VARCHAR(32) NOT NULL DEFAULT 'active', -- active, settled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 9. Panduan Pengujian & Verifikasi Kepatuhan WMS

Setiap penambahan atau modifikasi modul WMS wajib memverifikasi skenario berikut:
1. **Verifikasi Konversi Satuan:** Penjualan 2 renceng kopi (1 renceng = 10 sachet) wajib memotong stok sebesar tepat 20 sachet di database.
2. **Verifikasi Stok Minus:** Pembelian yang menyebabkan stok $< 0$ tidak boleh mengalami crash aplikasi, melainkan menyimpan nilai negatif disertai `audit: true`.
3. **Verifikasi Akurasi ROP:** Jika penjualan 7 hari = 70 bungkus ($d=10$), lead time = 2 hari, dan safety stock = 10, maka sistem wajib mengaktifkan status "Perlu Restok" saat stok $\le 30$.
4. **Verifikasi Zero-Impact AI:** Modul analitik AI Penasihat Bisnis tidak boleh memiliki izin eksekusi SQL `UPDATE`/`INSERT`/`DELETE` ke tabel WMS mana pun.

