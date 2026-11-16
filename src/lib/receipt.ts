import type { Sale } from "./store";
import { num, rp } from "./format";

const METHOD: Record<string, string> = { tunai: "Tunai", qris: "QRIS", kasbon: "Kasbon", split: "Gabungan" };

export function receiptLines(sale: Sale) {
  return sale.items.map((i) => ({ name: i.name, detail: `${num(i.qty)} ${i.unit} x ${rp(i.price)}`, total: rp(i.qty * i.price) }));
}

export function paymentLines(sale: Sale) {
  const pays = sale.payments ?? [{ method: sale.method === "split" ? "tunai" : sale.method, amount: sale.total }];
  return pays.map((p) => `${METHOD[p.method] ?? p.method}: ${rp(p.amount)}`);
}

/** Teks struk untuk dikirim lewat WhatsApp (struk digital). */
export function receiptText(sale: Sale, shop: string): string {
  const d = new Date(sale.ts);
  const out = [
    `*${shop}*`,
    `${d.toLocaleDateString("id-ID")} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} · Nota ${sale.id}`,
    sale.cashierName ? `Kasir: ${sale.cashierName}` : "",
    "",
    ...receiptLines(sale).map((l) => `${l.name}\n  ${l.detail} = ${l.total}`),
    "",
    sale.adjust ? `${sale.adjustNote ?? "Penyesuaian"}: ${sale.adjust > 0 ? "+" : ""}${rp(sale.adjust)}` : "",
    sale.manualDiscount ? `Diskon: -${rp(sale.manualDiscount)}` : "",
    `*TOTAL ${rp(sale.total)}*`,
    ...paymentLines(sale),
    sale.method === "tunai" && sale.change > 0 ? `Kembalian: ${rp(sale.change)}` : "",
    "",
    "Terima kasih sudah belanja 🙏",
  ];
  return out.filter((l, i) => l !== "" || out[i - 1] !== "").join("\n").trim();
}

export type SettlementInput = { owner: string; item: string; received: number; sold: number; sisa: number; basi: number; ownerPrice: number; sellPrice: number; date: number };
/** Bukti setor titipan untuk dicetak atau dikirim ke penitip. */
export function settlementLines(c: SettlementInput, shop: string): string[] {
  const d = new Date(c.date);
  return [shop, "BUKTI SETOR TITIPAN", `${d.toLocaleDateString("id-ID")}`, `Penitip: ${c.owner}`, `Barang: ${c.item}`, "--------------------------------",
    `Masuk   : ${num(c.received)}`, `Sisa    : ${num(c.sisa)}`, `Basi/retur: ${num(c.basi)}`, `Terjual : ${num(c.sold)}`, `Harga setor: ${rp(c.ownerPrice)}`,
    "--------------------------------", `TOTAL SETOR ${rp(c.sold * c.ownerPrice)}`, `Komisi warung ${rp(c.sold * (c.sellPrice - c.ownerPrice))}`, "", "Terima kasih"];
}
export function transferLines(t: { id: string; ts: number; fromName: string; toName: string; note: string; items: { name: string; unit: string; qtyBase: number }[] }): string[] {
  const d = new Date(t.ts);
  return ["SURAT JALAN", `No ${t.id}`, `${d.toLocaleDateString("id-ID")}`, `Dari : ${t.fromName}`, `Ke   : ${t.toName}`, "--------------------------------",
    ...t.items.map((i) => `${i.name}  ${num(i.qtyBase)} ${i.unit}`), "--------------------------------", t.note ? `Catatan: ${t.note}` : "", "", "Pengirim: ________   Penerima: ________"].filter((l, i, a) => l !== "" || a[i - 1] !== "");
}
