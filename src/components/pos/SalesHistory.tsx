import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { actions, activeShift, currentEmployee, useStore } from "@/lib/store";
import { jam, rp } from "@/lib/format";
import { PrintPortal, ReceiptPreview, sendReceiptWhatsApp } from "./Receipt";
import { printSaleSmart } from "@/lib/devices";

/** Riwayat nota shift aktif: cetak ulang, struk WhatsApp, dan batalkan nota (supervisor/pemilik, wajib alasan). */
export function SalesHistory({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const sales = useStore((s) => s.sales);
  const shop = useStore((s) => s.shopName);
  const shift = useStore(activeShift);
  const paper = useStore((s) => s.paperWidth);
  const [sel, setSel] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const mine = sales.filter((x) => shift && x.shiftId === shift.id).slice().reverse().slice(0, 40);
  const sale = sales.find((x) => x.id === sel) ?? null;
  const role = currentEmployee()?.role;
  const canVoid = role === "Pemilik" || role === "Supervisor";

  const close = (o: boolean) => { onOpenChange(o); if (!o) { setSel(null); setReason(""); } };
  const doVoid = () => {
    if (!sale) return;
    try { actions.voidSale(sale.id, reason); toast.success("Nota dibatalkan; stok dan uang laci dikoreksi"); setReason(""); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Gagal membatalkan nota"); }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle className="text-2xl">Riwayat Nota Shift Ini</DialogTitle></DialogHeader>
        {!sale ? (
          <div className="space-y-2">
            {!mine.length && <p className="text-muted-foreground">Belum ada nota pada shift ini.</p>}
            {mine.map((x) => (
              <button key={x.id} onClick={() => setSel(x.id)} className="flex w-full items-center justify-between rounded-xl border p-3 text-left hover:border-primary">
                <span><b>{jam(x.ts)}</b> · {x.cashierName ?? "-"}<br /><span className="text-sm text-muted-foreground">{x.id}{x.voided ? " · DIBATALKAN" : ""}</span></span>
                <span className={x.voided ? "num-jumbo text-xl text-muted-foreground line-through" : "num-jumbo text-xl"}>{rp(x.total)}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <Button variant="ghost" onClick={() => setSel(null)}>← Kembali</Button>
            <ReceiptPreview sale={sale} shop={shop} />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => void printSaleSmart(sale, shop, paper)}>🖨️ Cetak Ulang</Button>
              <Button variant="secondary" onClick={() => sendReceiptWhatsApp(sale, shop)}>WhatsApp</Button>
            </div>
            {sale.voided ? (
              <p className="rounded-lg bg-muted p-3 text-sm">Dibatalkan oleh {sale.voided.by} · {sale.voided.reason}</p>
            ) : canVoid ? (
              <div className="space-y-2 rounded-xl border p-3">
                <Input aria-label="Alasan pembatalan" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan membatalkan nota (wajib)" />
                <Button variant="destructive" className="w-full" onClick={doVoid}>Batalkan Nota</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Membatalkan nota membutuhkan supervisor atau pemilik.</p>
            )}
            <PrintPortal sale={sale} shop={shop} width={paper} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
