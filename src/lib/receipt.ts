import type { Sale } from "./store";

export function receiptText(shop: string, sale: Sale, width: 58 | 80 = 58) {
  const columns = width === 58 ? 32 : 48;
  const lines = [shop, `Nota ${sale.id}`, new Date(sale.ts).toLocaleString("id-ID"), `Kasir: ${sale.cashierName ?? "Kasir"}`, "-".repeat(columns)];
  sale.items.forEach((i) => lines.push(i.name, `${i.qty} ${i.unit} x ${i.price} = ${Math.round(i.qty * i.price)}`));
  lines.push("-".repeat(columns), `Subtotal: ${sale.subtotal}`, `Penyesuaian: ${sale.adjust}`, `Donasi: ${sale.donation ?? 0}`, `Total: ${sale.total}`, ...((sale.payments ?? []).map((p) => `${p.method.toUpperCase()}: ${p.amount}`)), `Diterima: ${sale.paid}`, `Kembalian: ${sale.change}`, sale.adjustNote ?? "", "Terima kasih");
  return lines.flatMap((line) => line.match(new RegExp(`.{1,${columns}}`, "g")) ?? [""]).join("\n") + "\n\n\n";
}

export function escPos(text: string) {
  // Printer default code pages support ASCII; normalize unsupported glyphs.
  const ascii = text.normalize("NFKD").replace(/[^\x20-\x7e\n]/g, "?");
  return new Uint8Array([27, 64, 27, 97, 0, ...new TextEncoder().encode(ascii), 29, 86, 0]);
}