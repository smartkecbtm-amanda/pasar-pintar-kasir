import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, movingAverage, useStore } from "@/lib/store";
import { num, rp, tgl } from "@/lib/format";
import { CameraScanner } from "@/components/pos/CameraScanner";
import { SupplierReturns } from "./SupplierReturns";
import { Card, Field, selectCls } from "./ui";

export function Restock() {
  const s = useStore((x) => x);
  const items = s.products.filter((p) => !p.digital && !p.bundle && !p.consignId);
  const [camera, setCamera] = useState(false);
  const [pid, setPid] = useState(items[0]?.id ?? "");
  const p = items.find((x) => x.id === pid);
  const [unitIdx, setUnitIdx] = useState(0);
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("");
  const [tempo, setTempo] = useState(false);
  const [sup, setSup] = useState(s.suppliers[0]?.id ?? "");
  const [days, setDays] = useState("14");
  const unit = p?.units[unitIdx] ?? p?.units[0];
  const qtyBase = (Number(qty) || 0) * (unit?.factor ?? 1);
  const total = Number(cost) || 0;
  const newHpp = p && qtyBase ? movingAverage(p.stock, p.hpp, qtyBase, total / qtyBase) : 0;
  const restock = items.filter((x) => x.stock <= x.minStock).map((x) => ({ x, need: Math.ceil(x.minStock * 2 - x.stock) }));
  const waList = encodeURIComponent(`Daftar kulakan ${s.shopName}:\n` + restock.map((r) => `- ${r.x.name}: ${r.need} ${r.x.baseUnit}`).join("\n"));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="🛒 Daftar Kulakan Otomatis" action={<a href={`https://wa.me/?text=${waList}`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">Kirim WA</Button></a>}>
        {restock.length ? restock.map(({ x, need }) => (
          <div key={x.id} className="flex items-center justify-between border-b py-2 text-sm">
            <span>{x.emoji} <b>{x.name}</b> <span className="text-muted-foreground">sisa {num(x.stock)} / min {x.minStock}</span></span>
            <span className="flex items-center gap-2">beli ±<b>{need} {x.baseUnit}</b><Button size="sm" variant="secondary" onClick={() => { setPid(x.id); setUnitIdx(0); setQty(String(need)); }}>Terima</Button></span>
          </div>
        )) : <p className="text-muted-foreground">Semua stok aman.</p>}
      </Card>
      <Card title="📥 Terima Barang Kulakan" action={<Button variant="outline" onClick={() => setCamera(true)}>Scan Kamera</Button>}>
        <div className="space-y-2">
          <Field label="Barang"><select className={selectCls} value={pid} onChange={(e) => { setPid(e.target.value); setUnitIdx(0); }}>{items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Jumlah"><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
            <Field label="Satuan"><select className={selectCls} value={unitIdx} onChange={(e) => setUnitIdx(Number(e.target.value))}>{p?.units.map((u, i) => <option key={u.name} value={i}>{u.name}</option>)}</select></Field>
            <Field label="Total harga beli"><Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
          </div>
          {p && qtyBase > 0 && total > 0 && (
            <div className="rounded-xl bg-muted p-3 text-sm">
              <div>Masuk: <b>{num(qtyBase)} {p.baseUnit}</b> @ {rp(total / qtyBase)}</div>
              <div>HPP lama {rp(p.hpp)} × {num(p.stock)} → <b className="text-primary">HPP baru {rp(newHpp)}</b> (rata-rata bergerak)</div>
              {newHpp > p.units[0].price && <div className="font-bold text-destructive">⚠️ HPP melebihi harga jual — naikkan harga!</div>}
            </div>
          )}
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={tempo} onChange={(e) => setTempo(e.target.checked)} /> Bayar tempo (hutang ke supplier)</label>
          {tempo && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Supplier"><select className={selectCls} value={sup} onChange={(e) => setSup(e.target.value)}>{s.suppliers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
              <Field label="Jatuh tempo (hari)"><Input type="number" value={days} onChange={(e) => setDays(e.target.value)} /></Field>
            </div>
          )}
          <Button className="w-full" disabled={!qtyBase || !total} onClick={() => { actions.receive(pid, qtyBase, total, tempo ? { supplierId: sup, days: Number(days) } : undefined); toast.success("Stok & HPP diperbarui"); setCost(""); }}>Simpan Penerimaan</Button>
        </div>
      </Card>
      <CameraScanner open={camera} onClose={() => setCamera(false)} onScan={(code) => { const p = items.find((p) => p.barcode === code); if (p) { setPid(p.id); setUnitIdx(0); } else toast.error("Barcode belum terdaftar"); setCamera(false); }} />
      <SupplierReturns />
      <Card title="📒 Hutang Supplier (Tempo)" className="lg:col-span-2">
        {s.payables.filter((x) => x.amount > x.paid).map((x) => {
          const sp = s.suppliers.find((y) => y.id === x.supplierId);
          const late = x.due < Date.now();
          return (
            <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm">
              <span><b>{sp?.name}</b> · {x.note} <span className={late ? "font-bold text-destructive" : "text-muted-foreground"}>jatuh tempo {tgl(x.due)}</span></span>
              <span className="flex items-center gap-2">sisa <b>{rp(x.amount - x.paid)}</b>
                <Button size="sm" onClick={() => { const v = Number(prompt("Bayar berapa?", String(x.amount - x.paid))); if (v > 0) { actions.payPayable(x.id, Math.min(v, x.amount - x.paid)); toast.success("Pembayaran dicatat"); } }}>Bayar</Button></span>
            </div>
          );
        })}
        {!s.payables.some((x) => x.amount > x.paid) && <p className="text-muted-foreground">Tidak ada hutang.</p>}
      </Card>
    </div>
  );
}
