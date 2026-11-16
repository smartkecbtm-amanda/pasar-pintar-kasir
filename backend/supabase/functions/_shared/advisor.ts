/** Penasihat bisnis AI: hanya menerima ringkasan agregat, hanya mengembalikan saran teks (tanpa akses tulis apa pun). */
export const FORBIDDEN = ["phone", "telepon", "email", "alamat", "address", "nik", "ktp", "nama_pelanggan", "customer", "pelanggan_nama", "pin"];

export function validateSummary(summary: unknown): Record<string, unknown> {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) throw new Error("Ringkasan tidak valid");
  const text = JSON.stringify(summary);
  if (text.length > 6000) throw new Error("Ringkasan terlalu besar");
  const lower = text.toLowerCase();
  for (const k of FORBIDDEN) if (lower.includes(`"${k}"`)) throw new Error(`Ringkasan memuat data pribadi (${k}); kirim hanya angka agregat`);
  const s = summary as Record<string, unknown>;
  if (!s["periode"] || typeof s["periode"] !== "object") throw new Error("Ringkasan tidak lengkap");
  return s;
}

export function buildPrompt(summary: Record<string, unknown>): string {
  return [
    "Anda penasihat bisnis untuk warung kelontong semi-minimarket di Indonesia.",
    "Berdasarkan ringkasan angka berikut (rupiah), berikan 3 sampai 5 saran praktis dan singkat dalam bahasa Indonesia.",
    "Fokus: modal tertahan di barang tidak laku, jadwal kulakan menjelang awal bulan/hari raya, risiko kasbon, dan arus kas.",
    "Aturan: jangan meminta data pribadi, jangan mengklaim sudah melakukan tindakan, hanya beri saran. Satu saran per baris, diawali tanda '-'.",
    "",
    JSON.stringify(summary),
  ].join("\n");
}

export function parseAdvice(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.replace(/^[\s\-*•\d.)]+/, "").replace(/\*\*/g, "").trim()).filter((l) => l.length >= 12 && l.length <= 400).slice(0, 6);
}
