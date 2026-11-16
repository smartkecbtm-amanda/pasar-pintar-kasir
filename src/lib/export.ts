/** Mencegah formula injection di Excel: teks berawalan = + - @ (atau tab/CR) diberi petik. Angka (termasuk negatif) dibiarkan numerik. */
const DANGEROUS = /^[=+\-@\t\r]/;

export function sanitizeCell<T>(value: T): T | string {
  return typeof value === "string" && DANGEROUS.test(value) ? `'${value}` : value;
}

export function sanitizeRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, sanitizeCell(v)])) as T);
}
