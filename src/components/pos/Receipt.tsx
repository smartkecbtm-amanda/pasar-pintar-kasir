import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getState, type Sale } from "@/lib/store";
import { rp } from "@/lib/format";
import { paymentLines, receiptLines, receiptText } from "@/lib/receipt";

function Body({ sale, shop }: { sale: Sale; shop: string }) {
  const d = new Date(sale.ts);
  return (
    <div>
      <div style={{ textAlign: "center", fontWeight: 700 }}>{shop}</div>
      <div style={{ textAlign: "center" }}>{d.toLocaleDateString("id-ID")} {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
      <div>Nota {sale.id}{sale.cashierName ? ` · ${sale.cashierName}` : ""}</div>
      {sale.voided && <div style={{ textAlign: "center", fontWeight: 700 }}>*** NOTA DIBATALKAN ***</div>}
      <div className="rcpt-line" />
      {receiptLines(sale).map((l, i) => (
        <div key={i} style={{ marginBottom: 2 }}>
          <div>{l.name}</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>{l.detail}</span><span>{l.total}</span></div>
        </div>
      ))}
      <div className="rcpt-line" />
      {sale.adjust !== 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>{sale.adjustNote ?? "Penyesuaian"}</span><span>{sale.adjust > 0 ? "+" : ""}{rp(sale.adjust)}</span></div>}
      {!!sale.manualDiscount && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Diskon</span><span>-{rp(sale.manualDiscount)}</span></div>}
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>TOTAL</span><span>{rp(sale.total)}</span></div>
      {paymentLines(sale).map((l) => <div key={l}>{l}</div>)}
      {sale.method === "tunai" && sale.change > 0 && <div>Kembalian: {rp(sale.change)}</div>}
      <div className="rcpt-line" />
      <div style={{ textAlign: "center" }}>Terima kasih sudah belanja</div>
    </div>
  );
}

/** Pratinjau struk di layar. */
export function ReceiptPreview({ sale, shop }: { sale: Sale; shop: string }) {
  return <div className="mx-auto w-full max-w-[300px] rounded-lg border bg-white p-3 font-mono text-xs text-black"><Body sale={sale} shop={shop} /></div>;
}

/** Salinan struk untuk window.print(): ditaruh di body, hanya tampil saat dicetak (lihat styles.css). */
export function PrintPortal({ sale, shop, width = 58 }: { sale: Sale | null; shop: string; width?: 58 | 80 }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !sale) return null;
  return createPortal(<div className="print-only" style={{ width: `${width}mm` }}><Body sale={sale} shop={shop} /></div>, document.body);
}

/** Struk digital: buka WhatsApp dengan teks struk (nomor pelanggan bila ada di buku kasbon). */
export function sendReceiptWhatsApp(sale: Sale, shop: string) {
  const phone = getState().customers.find((c) => c.id === sale.customerId)?.phone ?? "";
  const digits = phone.replace(/\D/g, "").replace(/^0/, "62");
  window.open(`https://wa.me/${digits}?text=${encodeURIComponent(receiptText(sale, shop))}`, "_blank");
}

/** Salinan teks bebas (bukti setor, surat jalan) untuk window.print(), sama seperti PrintPortal. */
export function PrintLines({ lines, width = 58 }: { lines: string[] | null; width?: 58 | 80 }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !lines) return null;
  return createPortal(<div className="print-only" style={{ width: `${width}mm`, whiteSpace: "pre-wrap" }}>{lines.map((l, i) => <div key={i}>{l || "\u00a0"}</div>)}</div>, document.body);
}
