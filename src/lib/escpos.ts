import type { Sale } from "./store";
import { num, rp } from "./format";
import { paymentLines } from "./receipt";

/** Penyusun perintah ESC/POS (printer thermal 58/80 mm). Murni data, tidak menyentuh perangkat. */
export const KICK_DRAWER = [0x1b, 0x70, 0x00, 0x19, 0xfa] as const; // ESC p 0 25 250 (pin 2)
export const CUT_PARTIAL = [0x1d, 0x56, 0x42, 0x00] as const; // GS V 66 0: maju lalu potong sebagian

export const columnsFor = (width: 58 | 80) => (width === 80 ? 48 : 32);

/** Printer ESC/POS standar hanya mengerti ASCII: buang aksen dan karakter di luar cetak. */
export const ascii = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "?");

export class EscPos {
  private bytes: number[] = [];
  raw(...b: number[]) { this.bytes.push(...b); return this; }
  init() { return this.raw(0x1b, 0x40); }
  align(a: "left" | "center" | "right") { return this.raw(0x1b, 0x61, a === "left" ? 0 : a === "center" ? 1 : 2); }
  bold(on: boolean) { return this.raw(0x1b, 0x45, on ? 1 : 0); }
  size(wide: boolean, tall: boolean) { return this.raw(0x1d, 0x21, (wide ? 0x10 : 0) | (tall ? 0x01 : 0)); }
  text(t: string) { for (const ch of ascii(t)) this.bytes.push(ch.charCodeAt(0)); return this; }
  line(t = "") { return this.text(t).raw(0x0a); }
  feed(n: number) { return this.raw(0x1b, 0x64, Math.max(0, Math.min(255, n))); }
  rule(cols: number, ch = "-") { return this.line(ch.repeat(cols)); }
  /** Dua kolom rata kiri-kanan; teks kiri dipotong bila terlalu panjang. */
  cols(left: string, right: string, cols: number) {
    const r = ascii(right);
    const l = ascii(left).slice(0, Math.max(0, cols - r.length - 1));
    return this.line(l + " ".repeat(Math.max(1, cols - l.length - r.length)) + r);
  }
  cut() { return this.raw(...CUT_PARTIAL); }
  kick() { return this.raw(...KICK_DRAWER); }
  build() { return Uint8Array.from(this.bytes); }
}

export function kickDrawerBytes() { return new EscPos().init().kick().build(); }

/** Struk penjualan dalam perintah ESC/POS. */
export function receiptToEscPos(sale: Sale, shop: string, width: 58 | 80 = 58, opts: { kick?: boolean } = {}): Uint8Array {
  const c = columnsFor(width);
  const e = new EscPos().init();
  const d = new Date(sale.ts);
  e.align("center").bold(true).size(true, true).line(shop).size(false, false).bold(false);
  e.line(`${d.toLocaleDateString("id-ID")} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`);
  e.align("left").line(`Nota ${sale.id}${sale.cashierName ? ` / ${sale.cashierName}` : ""}`);
  if (sale.voided) e.align("center").bold(true).line("*** NOTA DIBATALKAN ***").bold(false).align("left");
  e.rule(c);
  for (const i of sale.items) { e.line(i.name); e.cols(`  ${num(i.qty)} ${i.unit} x ${rp(i.price)}`, rp(i.qty * i.price), c); }
  e.rule(c);
  if (sale.adjust) e.cols(sale.adjustNote ?? "Penyesuaian", `${sale.adjust > 0 ? "+" : ""}${rp(sale.adjust)}`, c);
  if (sale.manualDiscount) e.cols("Diskon", `-${rp(sale.manualDiscount)}`, c);
  e.bold(true).cols("TOTAL", rp(sale.total), c).bold(false);
  for (const p of paymentLines(sale)) e.line(p);
  if (sale.method === "tunai" && sale.change > 0) e.cols("Kembalian", rp(sale.change), c);
  e.rule(c).align("center").line("Terima kasih sudah belanja").feed(3).cut();
  if (opts.kick) e.kick();
  return e.build();
}

/** Teks bebas (bukti bagi hasil, tutup shift, dll.) dalam ESC/POS. */
export function linesToEscPos(lines: string[], width: 58 | 80 = 58): Uint8Array {
  const c = columnsFor(width);
  const e = new EscPos().init();
  for (const l of lines) e.line(l.slice(0, c));
  return e.feed(3).cut().build();
}
