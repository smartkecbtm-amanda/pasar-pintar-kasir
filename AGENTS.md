<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- **Sumber kebenaran:** dokumen di `docs/` (blueprint, panduan alur, susunan pengembangan, `wms-build-spec`, `setup`, `roadmap`) adalah sumber kebenaran utama. Jangan merancang ulang aturan bisnis. Jika kode berbeda dari dokumen, dokumen yang benar. Jika dua dokumen bertentangan, jangan memilih sendiri: catat di `docs/STATUS-PEMBANGUNAN.md` dan tanyakan kepada pemilik proyek.
- Status butir yang sudah dan belum dibangun dicatat di `docs/STATUS-PEMBANGUNAN.md`; perbarui berkas itu setiap kali sebuah butir selesai.
- Implementasi dikerjakan per sprint atas perintah eksplisit pemilik proyek (`docs/susunan-pengembangan-pos-warung.md`, bagian 3).
- Mode lokal: seluruh data ada di browser lewat `src/lib/store.ts` (state in-memory, salinan di localStorage dan snapshot IndexedDB). Mode cloud (opsional): `src/lib/cloud.ts` menyinkronkan data ke backend Supabase (repo/zip terpisah `pasar-pintar-backend`). Aplikasi harus tetap berjalan penuh tanpa cloud.
- **Stok = jumlah mutasi.** Setiap perubahan stok wajib menulis `stockMoves` lewat `moveRows` (paket diuraikan per komponen) agar sinkronisasi antar-perangkat konsisten. Jangan mengubah `product.stock` tanpa mutasi.
- Peristiwa sinkronisasi dibuat otomatis dari perbedaan state (`diffEvents` di `src/lib/cloud.ts`). Data baru yang perlu disinkronkan harus didaftarkan di `ENTITIES` dan di daftar `v_known` pada fungsi SQL `sync_push`.
- PIN pegawai: mode lokal memakai SHA-256 di browser; mode cloud memverifikasi bcrypt di server (`verify_employee_pin`) dan memakai hash lokal hanya sebagai cadangan offline.
- Keep deterministic restock, expiry and wholesale calculations in `src/lib/operations.ts` so business rules can be tested independently from screens.
- Tandem lintas perangkat hanya berjalan lewat sinkronisasi cloud (polling berkala); tanpa cloud, tandem hanya antar-tab satu browser. Jangan menyebut sinkronisasi realtime sebelum memakai kanal Realtime.
- Offline app-shell caching uses vite-plugin-pwa generateSW with the single preview-safe registration wrapper in `src/lib/pwa.ts` to avoid stale editor previews.
