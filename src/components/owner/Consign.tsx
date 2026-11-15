import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, useStore } from "@/lib/store";
import { printBrowser } from "@/lib/printer";
import { rp, tgl } from "@/lib/format";
import { Card, Field } from "./ui";

export function Consign() {
  const list = useStore((x) => x.consigns);
  const [f, setF] = useState({ owner: "", phone: "62", item: "", received: "20", sellPrice: "2500", ownerPrice: "2000" });
  const [damaged, setDamaged] = useState<Record<string, string>>({});
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
          <Button className="w-full" onClick={() => { if (!f.owner || !f.item) return toast.error("Lengkapi data"); try { actions.addConsign({ owner: f.owner, phone: f.phone, item: f.item, received: +f.received, sellPrice: +f.sellPrice, ownerPrice: +f.ownerPrice }); toast.success("Titipan dicatat dan tersedia di kasir"); } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); } }}>Catat Titipan</Button>
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
                    <Button variant="outline" size="sm" onClick={() => { try { printBrowser(`BUKTI SETOR TITIPAN\n${c.owner} - ${c.item}\nTerjual: ${c.sold}\nRetur: ${c.returned}\nRusak: ${c.damaged ?? 0}\nOmzet: ${rp(c.sold * c.sellPrice)}\nKomisi: ${rp(c.sold * (c.sellPrice - c.ownerPrice))}\nSetor: ${rp(c.sold * c.ownerPrice)}`); } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal cetak"); } }}>Cetak Bukti</Button>
                    <a href={`https://wa.me/${c.phone}?text=${msg}`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">Kirim WA</Button></a>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <Field label="Sisa dikembalikan"><Input type="number" className="w-32" value={ret[c.id] ?? ""} onChange={(e) => setRet({ ...ret, [c.id]: e.target.value })} /></Field>
                    <Field label="Rusak / basi"><Input type="number" min={0} className="w-24" value={damaged[c.id] ?? "0"} onChange={(e) => setDamaged({ ...damaged, [c.id]: e.target.value })} /></Field>
                    {c.productId && <span>Terjual di kasir: {c.sold}</span>}
                    {ret[c.id] && <span className="pb-2">laku {c.received - +ret[c.id] - +(damaged[c.id] ?? 0)} → setor {rp((c.received - +ret[c.id] - +(damaged[c.id] ?? 0)) * c.ownerPrice)}</span>}
                    <Button size="sm" className="ml-auto" disabled={!ret[c.id]} onClick={() => { try { actions.settleConsign(c.id, +ret[c.id], +(damaged[c.id] ?? 0)); toast.success("Bagi hasil dihitung"); } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); } }}>Selesaikan</Button>
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
