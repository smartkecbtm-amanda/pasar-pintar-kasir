import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, type Consign as ConsignRec } from "@/lib/store";
import { actionsPlus } from "@/lib/store-extra";
import { settlementLines } from "@/lib/receipt";
import { PrintLines } from "@/components/pos/Receipt";
import { num, rp, tgl } from "@/lib/format";
import { Card, Field, selectCls } from "./ui";

const msg = (e: unknown, d: string) => (e instanceof Error ? e.message : d);

/** Titipan terhubung stok: barang masuk stok, dijual di kasir, disetor ke penitip saat penyelesaian. */
export function Consign() {
  const s = useStore((x) => x);
  const [f, setF] = useState({ owner: "", phone: "62", productId: "", item: "", received: "20", sellPrice: "2500", ownerPrice: "2000" });
  const [res, setRes] = useState<Record<string, { sisa: string; basi: string }>>({});
  const [print, setPrint] = useState<string[] | null>(null);
  const consignProducts = s.products.filter((p) => p.consignment);
  const active = s.consigns.filter((c) => c.productId && !c.settled);
  const history = s.consigns.filter((c) => c.settled).slice().reverse().slice(0, 15);

  const receive = () => {
    try {
      actionsPlus.receiveConsign({ owner: f.owner, phone: f.phone, productId: f.productId || undefined, item: f.item, received: Number(f.received), ownerPrice: Number(f.ownerPrice), sellPrice: Number(f.sellPrice) });
      toast.success("Titipan masuk stok dan siap dijual di kasir"); setF({ ...f, item: "", productId: "" });
    } catch (e) { toast.error(msg(e, "Gagal mencatat titipan")); }
  };
  const settle = (c: ConsignRec) => {
    const r = res[c.id] ?? { sisa: "0", basi: "0" };
    try { actionsPlus.settleConsignment(c.id, Number(r.sisa), Number(r.basi)); toast.success("Titipan diselesaikan; uang setor keluar dari laci"); }
    catch (e) { toast.error(msg(e, "Gagal menyelesaikan titipan")); }
  };
  const lines = (c: ConsignRec) => settlementLines({ owner: c.owner, item: c.item, received: c.received, sold: c.sold, sisa: c.sisa ?? 0, basi: c.basi ?? 0, ownerPrice: c.ownerPrice, sellPrice: c.sellPrice, date: c.date }, s.shopName);
  const printNow = (c: ConsignRec) => { setPrint(lines(c)); setTimeout(() => window.print(), 80); };
  const wa = (c: ConsignRec) => `https://wa.me/${c.phone}?text=${encodeURIComponent(lines(c).join("\n"))}`;

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card title="🌅 Terima Titipan">
        <div className="space-y-2">
          <Field label="Nama penitip"><Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></Field>
          <Field label="No. WA"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Barang titipan"><select className={selectCls} value={f.productId} onChange={(e) => setF({ ...f, productId: e.target.value })}><option value="">Barang baru…</option>{consignProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          {!f.productId && <Field label="Nama barang baru"><Input value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })} /></Field>}
          <div className="grid grid-cols-3 gap-2">
            <Field label="Jumlah"><Input type="number" value={f.received} onChange={(e) => setF({ ...f, received: e.target.value })} /></Field>
            <Field label="Harga setor"><Input type="number" value={f.ownerPrice} onChange={(e) => setF({ ...f, ownerPrice: e.target.value })} /></Field>
            <Field label="Harga jual"><Input type="number" value={f.sellPrice} onChange={(e) => setF({ ...f, sellPrice: e.target.value })} /></Field>
          </div>
          <p className="text-xs text-muted-foreground">Komisi warung {rp(Number(f.sellPrice) - Number(f.ownerPrice))} per buah. Barang tampil di kasir dengan stoknya sendiri.</p>
          <Button className="w-full" onClick={receive}>Terima Titipan</Button>
        </div>
      </Card>
      <div className="space-y-4">
        <Card title="🌇 Penyelesaian Titipan">
          {!active.length && <p className="text-muted-foreground">Tidak ada titipan yang menunggu penyelesaian.</p>}
          {active.map((c) => {
            const pr = s.products.find((p) => p.id === c.productId);
            const r = res[c.id] ?? { sisa: String(Math.max(0, pr?.stock ?? 0)), basi: "0" };
            const sold = c.received - Number(r.sisa) - Number(r.basi);
            return (
              <div key={c.id} className="space-y-2 border-b py-3 last:border-0">
                <div className="flex justify-between"><b>{c.item} · {c.owner}</b><span className="text-sm text-muted-foreground">{tgl(c.date)} · masuk {num(c.received)} · stok kasir {num(pr?.stock ?? 0)}</span></div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Field label="Sisa fisik"><Input type="number" min={0} value={r.sisa} onChange={(e) => setRes({ ...res, [c.id]: { ...r, sisa: e.target.value } })} /></Field>
                  <Field label="Basi/retur"><Input type="number" min={0} value={r.basi} onChange={(e) => setRes({ ...res, [c.id]: { ...r, basi: e.target.value } })} /></Field>
                  <div className="self-end text-sm">Terjual <b>{num(sold)}</b><br />Setor <b>{rp(Math.max(0, sold) * c.ownerPrice)}</b></div>
                  <Button className="self-end" disabled={sold < 0} onClick={() => settle(c)}>Selesaikan</Button>
                </div>
              </div>
            );
          })}
        </Card>
        <Card title="Riwayat Setor">
          {!history.length && <p className="text-muted-foreground">Belum ada.</p>}
          {history.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm">
              <span>{tgl(c.date)} · {c.item} · {c.owner} · terjual {num(c.sold)} · setor <b>{rp(c.sold * c.ownerPrice)}</b></span>
              <span className="flex gap-1"><Button size="sm" variant="outline" onClick={() => printNow(c)}>🖨️ Bukti</Button><a href={wa(c)} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">WA</Button></a></span>
            </div>
          ))}
        </Card>
      </div>
      <PrintLines lines={print} width={s.paperWidth} />
    </div>
  );
}
