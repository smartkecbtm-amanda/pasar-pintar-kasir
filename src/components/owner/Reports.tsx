import { useState } from "react";
import { Download } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { selectCls } from "./ui";
import { sanitizeRows } from "@/lib/export";
export function Reports() {
  const s = useStore((s) => s);
  const [kind, setKind] = useState("sales");
  const raw = kind === "sales" ? s.sales.map((x) => ({ Status: x.voided ? "Batal" : "Selesai", Diskon: x.manualDiscount ?? 0, Nota: x.id, Tanggal: new Date(x.ts).toISOString(), Kasir: x.cashierName ?? "Contoh", Perangkat: x.deviceId ?? "", Shift: x.shiftId ?? "", Total: x.total, Tunai: x.payments?.filter((p) => p.method === "tunai").reduce((a,p) => a+p.amount,0) ?? (x.method === "tunai" ? x.total : 0), QRIS: x.payments?.filter((p) => p.method === "qris").reduce((a,p) => a+p.amount,0) ?? (x.method === "qris" ? x.total : 0), Kasbon: x.payments?.filter((p) => p.method === "kasbon").reduce((a,p) => a+p.amount,0) ?? (x.method === "kasbon" ? x.total : 0) })) : kind === "returns" ? s.returns.map((r) => ({ Tanggal: new Date(r.ts).toISOString(), Nota: r.saleId, Barang: r.name, Jenis: r.kind === "retur" ? "Retur" : "Tukar", Jumlah: r.qty, Satuan: r.unit, Refund: r.refund, Kerugian: r.loss, Petugas: r.by ?? "" })) : kind === "stock" ? s.stockMoves.map((x) => ({ Tanggal: new Date(x.ts).toISOString(), Barang: s.products.find((p) => p.id === x.productId)?.name, Jumlah: x.qty, Alasan: x.reason, Audit: x.audit ? "Ya" : "Tidak" })) : s.ledger.map((x) => ({ Tanggal: new Date(x.ts).toISOString(), Pelanggan: s.customers.find((c) => c.id === x.customerId)?.name, Keterangan: x.desc, Debit: x.debit, Kredit: x.credit }));
  const rows = sanitizeRows(raw as Record<string, unknown>[]);
  async function download(format: "csv" | "xlsx") {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Laporan");
    if (format === "xlsx") XLSX.writeFile(book, `warung-${kind}.xlsx`);
    else { const csv = XLSX.utils.sheet_to_csv(sheet); const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = `warung-${kind}.csv`; a.click(); URL.revokeObjectURL(url); }
  }
  return <div className="space-y-4"><h2 className="text-xl font-bold">Ekspor Laporan</h2><select aria-label="Jenis laporan" className={selectCls} value={kind} onChange={(e) => setKind(e.target.value)}><option value="sales">Penjualan</option><option value="stock">Mutasi Stok</option><option value="debts">Buku Kasbon</option><option value="returns">Retur & Tukar</option></select><p>{rows.length} baris</p><div className="flex gap-2"><Button disabled={!rows.length} onClick={() => download("csv")}><Download />CSV</Button><Button disabled={!rows.length} variant="outline" onClick={() => download("xlsx")}><Download />Excel</Button></div></div>;
}