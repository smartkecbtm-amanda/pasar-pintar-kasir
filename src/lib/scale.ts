/**
 * Membaca satu baris keluaran timbangan digital serial dan mengembalikan berat dalam kg.
 * Mengerti format umum: "ST,GS,   0.250kg", "  1.500 kg", "+000.250 kg", "ww001.250kg", "  250 g".
 * Baris tidak stabil (diawali "US") atau tanpa angka mengembalikan null.
 */
export function parseScaleLine(raw: string): number | null {
  const line = raw.trim();
  if (!line || /^US\b/i.test(line) || /\bUS,/i.test(line)) return null;
  const m = line.match(/([-+]?\d+(?:[.,]\d+)?)\s*(kg|g)\b/i);
  if (!m) return null;
  const value = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return null;
  return m[2].toLowerCase() === "g" ? value / 1000 : value;
}

/** Pecah potongan data serial menjadi baris utuh; sisa yang belum berujung baris dikembalikan sebagai buffer. */
export function splitScaleChunk(buffer: string, chunk: string): { lines: string[]; rest: string } {
  const parts = (buffer + chunk).split(/\r\n|\r|\n/);
  return { lines: parts.slice(0, -1), rest: parts[parts.length - 1] };
}
