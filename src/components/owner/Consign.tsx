import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, useStore } from "@/lib/store";
import { rp, tgl } from "@/lib/format";
import { Card, Field } from "./ui";

export function Consign() {
  const list = useStore((x) => x.consigns);
  const [f, setF] = useState({ owner: "", phone: "62", item: "", received: "20", sellPrice: "2500", ownerPrice: "2000" });
  const [ret, setRet] = useState<Record<string, string>>({});
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card title="🌅 Terima Titipan Pagi">
        <div className="space-y-2">
          <Field label="Nama penitip"><Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></Field>
          <Field label="No. WA"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Barang"><Input value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Jumlah"><Input type="number" value={f.received} onChange={(e) => setF({ ...f, received: e.target.value })} /></Field>
            <Field label="Harga jual"><Input type="number" value={f.sellPrice} onChange={(e) => setF({ ...f, sellPrice: e.target.value })} /></Field>
            <Field label="Hak penitip"><Input type="number" value={f.ownerPrice} onChange={(e) => setF({ ...f, ownerPrice: e.target.value })} /></Field>
          </div>
          <Button className="w-full" onClick={() => { if (!f.owner || !f.item) return toast.error("Lengkapi data"); actions.addConsign({ owner: f.owner, phone: f.phone, item: f.item, received: +f.received, sellPrice: +f.sellPrice, ownerPrice: +f.ownerPrice }); toast.success("Titipan dicatat"); }}>Catat Titipan</Button>
        </div>
      </Card>
      <Card title="🌇 Retur Sore & Bagi Hasil">
        <div className="space-y-2">
          {list.slice().reverse().map((c) => {
            const msg = encodeURIComponent(`Halo ${c.owner}, titipan ${c.item} tgl ${tgl(c.date)}: titip ${c.received}, laku ${c.sold}, sisa ${c.returned}. Hak Anda ${rp(c.sold * c.ownerPrice)}. Terima kasih 🙏`);
            return (
              <div key={c.id} className="rounded-xl border p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><b>{c.owner} · {c.item}</b><span className="text-muted-foreground">{tgl(c.date)} · titip {c.received} · jual {rp(c.sellPrice)}</span></div>
                {c.settled ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span>Laku <b>{c.sold}</b> · sisa {c.returned} · setor penitip <b>{rp(c.sold * c.ownerPrice)}</b> · untung warung <b className="text-success">{rp(c.sold * (c.sellPrice - c.ownerPrice))}</b></span>
                    <a href={`https://wa.me/${c.phone}?text=${msg}`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">Kirim WA</Button></a>
                  </div>
                ) : (
                  <div className="mt-2 flex items-end gap-2">
                    <Field label="Sisa dikembalikan"><Input type="number" className="w-32" value={ret[c.id] ?? ""} onChange={(e) => setRet({ ...ret, [c.id]: e.target.value })} /></Field>
                    {ret[c.id] && <span className="pb-2">laku {c.received - +ret[c.id]} → setor {rp((c.received - +ret[c.id]) * c.ownerPrice)}</span>}
                    <Button size="sm" className="ml-auto" disabled={!ret[c.id]} onClick={() => { actions.settleConsign(c.id, +ret[c.id]); toast.success("Bagi hasil dihitung"); }}>Selesaikan</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
