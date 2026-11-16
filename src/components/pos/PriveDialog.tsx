import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { actions, useStore } from "@/lib/store";
import { rp } from "@/lib/format";

/** Prive barang 1 langkah di kasir (pemilik): barang dinilai HPP dan stok langsung berkurang. */
export function PriveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const products = useStore((s) => s.products).filter((p) => !p.digital && !p.bundle);
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState(1);
  const p = products.find((x) => x.id === pid);
  const save = () => {
    if (!p) return;
    try { actions.addPrive({ type: "barang", amount: p.hpp * qty, note: `Prive ${p.name}`, productId: p.id, qty }); toast.success(`Prive ${qty} ${p.baseUnit} ${p.name} dicatat (${rp(p.hpp * qty)})`); setPid(""); setQty(1); onOpenChange(false); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Gagal mencatat prive"); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader><DialogTitle className="text-2xl">Ambil Barang (Prive)</DialogTitle></DialogHeader>
        <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto">
          {products.map((x) => <button key={x.id} onClick={() => setPid(x.id)} className={`rounded-xl border-2 p-2 text-left ${pid === x.id ? "border-primary bg-primary/10" : ""}`}>{x.emoji} {x.name}</button>)}
        </div>
        {p && <>
          <label className="block font-semibold">Jumlah ({p.baseUnit})<Input type="number" min={0.25} step={0.25} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></label>
          <p className="text-sm text-muted-foreground">Nilai {rp(p.hpp * qty)} (HPP). Stok tersisa {p.stock - qty < 0 ? "minus" : p.stock - qty}.</p>
          <Button className="w-full" disabled={!(qty > 0)} onClick={save}>Catat Prive</Button>
        </>}
      </DialogContent>
    </Dialog>
  );
}
