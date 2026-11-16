import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, getState, uid, useStore, type Product } from "@/lib/store";
import { actionsPlus, type InvoiceLine, type InvoicePayment } from "@/lib/store-extra";
import { num, rp } from "@/lib/format";
import { Card, Field, selectCls } from "./ui";

const physical = (ps: Product[]) => ps.filter((p) => !p.digital && !p.bundle);
const bigUnit = (p: Product) => p.units.reduce((a, u) => (u.factor > a.factor ? u : a), p.units[0]);
const up100 = (n: number) => Math.ceil(n / 100) * 100;
const msg = (e: unknown, d: string) => (e instanceof Error ? e.message : d);

export function Warehouse() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Invoice />
      <div className="space-y-4"><ReturSupplier /><Repacking /><Suppliers /></div>
    </div>
  );
}

type Row = { productId: string; unitName: string; qty: string; unitCost: string };
function Invoice() {
  const products = physical(useStore((s) => s.products));
  const suppliers = useStore((s) => s.suppliers);
  const [no, setNo] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [payment, setPayment] = useState<InvoicePayment>("tunai_laci");
  const [dueDays, setDueDays] = useState("7");
  const [paidNow, setPaidNow] = useState("0");
  const blank = (): Row => { const p = products[0]; const u = p ? bigUnit(p) : undefined; return { productId: p?.id ?? "", unitName: u?.name ?? "", qty: "1", unitCost: String(Math.round((p?.hpp ?? 0) * (u?.factor ?? 1))) }; };
  const [rows, setRows] = useState<Row[]>(() => [blank()]);
  const [hints, setHints] = useState<{ id: string; name: string; from: number; to: number }[]>([]);
  const setRow = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const pickProduct = (i: number, id: string) => { const p = products.find((x) => x.id === id); if (!p) return; const u = bigUnit(p); setRow(i, { productId: id, unitName: u.name, unitCost: String(Math.round(p.hpp * u.factor)) }); };
  const total = rows.reduce((a, r) => a + (Number(r.qty) || 0) * (Number(r.unitCost) || 0), 0);

  const save = () => {
    const before = new Map(getState().products.map((p) => [p.id, p.hpp]));
    try {
      const lines: InvoiceLine[] = rows.map((r) => ({ productId: r.productId, unitName: r.unitName, qty: Number(r.qty), unitCost: Number(r.unitCost) }));
      actionsPlus.receiveInvoice({ invoiceNo: no.trim(), supplierId: supplierId || undefined, lines, payment, dueDays: Number(dueDays) || 7, paidNow: Number(paidNow) || 0 });
      const after = getState().products;
      setHints(after.filter((p) => (before.get(p.id) ?? p.hpp) > 0 && p.hpp > (before.get(p.id) ?? p.hpp) * 1.03 && lines.some((l) => l.productId === p.id)).map((p) => ({ id: p.id, name: p.name, from: before.get(p.id) ?? p.hpp, to: p.hpp })));
      toast.success(`Faktur ${no || "tanpa nomor"} dicatat: ${rp(total)}`);
      setNo(""); setRows([blank()]); setPaidNow("0");
    } catch (e) { toast.error(msg(e, "Gagal mencatat faktur")); }
  };
  const applySuggested = (h: { id: string; from: number; to: number }) => {
    const p = getState().products.find((x) => x.id === h.id);
    if (!p) return;
    const base = p.units.find((u) => u.factor === 1) ?? p.units[0];
    const margin = h.from > 0 ? Math.max(0, (base.price / base.factor - h.from) / h.from) : 0.15;
    try { actions.saveProduct({ ...p, units: p.units.map((u) => ({ ...u, price: up100(h.to * u.factor * (1 + margin)) })) }); setHints((x) => x.filter((y) => y.id !== h.id)); toast.success("Harga jual disesuaikan"); }
    catch (e) { toast.error(msg(e, "Gagal mengubah harga")); }
  };

  return (
    <Card title="🧾 Faktur Kulakan">
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Field label="No. faktur"><Input value={no} onChange={(e) => setNo(e.target.value)} /></Field>
          <Field label="Supplier"><select className={selectCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">Pasar / umum</option>{suppliers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        </div>
        {rows.map((r, i) => {
          const p = products.find((x) => x.id === r.productId);
          return (
            <div key={i} className="grid grid-cols-[1fr_90px_70px_100px_auto] items-end gap-1">
              <select aria-label="Barang" className={selectCls} value={r.productId} onChange={(e) => pickProduct(i, e.target.value)}>{products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              <select aria-label="Satuan" className={selectCls} value={r.unitName} onChange={(e) => setRow(i, { unitName: e.target.value })}>{p?.units.map((u) => <option key={u.name}>{u.name}</option>)}</select>
              <Input aria-label="Jumlah" type="number" min={0} value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} />
              <Input aria-label="Harga beli per satuan" type="number" min={0} value={r.unitCost} onChange={(e) => setRow(i, { unitCost: e.target.value })} />
              <Button variant="ghost" size="sm" aria-label="Hapus baris" disabled={rows.length === 1} onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>✕</Button>
            </div>
          );
        })}
        <Button variant="outline" size="sm" onClick={() => setRows((x) => [...x, blank()])}>+ Tambah barang</Button>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Pembayaran"><select className={selectCls} value={payment} onChange={(e) => setPayment(e.target.value as InvoicePayment)}><option value="tunai_laci">Tunai dari laci</option><option value="bank">Transfer bank</option><option value="tempo">Tempo / hutang</option></select></Field>
          {payment === "tempo" && <><Field label="Jatuh tempo (hari)"><Input type="number" value={dueDays} onChange={(e) => setDueDays(e.target.value)} /></Field><Field label="Dibayar sekarang"><Input type="number" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} /></Field></>}
        </div>
        <div className="flex items-center justify-between rounded-xl bg-muted p-3"><span>Total faktur</span><b className="num-jumbo text-2xl">{rp(total)}</b></div>
        <Button className="w-full" disabled={!rows.length || total <= 0} onClick={save}>Simpan Faktur</Button>
        {hints.map((h) => (
          <div key={h.id} className="flex items-center justify-between gap-2 rounded-xl border border-warning p-2 text-sm">
            <span>Modal {h.name} naik {rp(h.from)} → {rp(h.to)} per satuan dasar.</span>
            <Button size="sm" onClick={() => applySuggested(h)}>Naikkan harga jual</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ReturSupplier() {
  const products = physical(useStore((s) => s.products));
  const payables = useStore((s) => s.payables).filter((p) => p.amount - p.paid > 0);
  const [pid, setPid] = useState(products[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("");
  const [mode, setMode] = useState<"potong_hutang" | "uang_kembali">("uang_kembali");
  const [payableId, setPayableId] = useState("");
  const [note, setNote] = useState("");
  const p = products.find((x) => x.id === pid);
  const unitCost = cost === "" ? (p?.hpp ?? 0) : Number(cost);
  const save = () => {
    try { actionsPlus.returnPurchase(pid, Number(qty), unitCost, mode, payableId || undefined, note); toast.success(`Retur ${qty} ${p?.baseUnit} dicatat`); setQty("1"); setNote(""); }
    catch (e) { toast.error(msg(e, "Gagal retur")); }
  };
  return (
    <Card title="↩️ Retur ke Supplier">
      <div className="space-y-2">
        <Field label="Barang"><select className={selectCls} value={pid} onChange={(e) => { setPid(e.target.value); setCost(""); }}>{products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={`Jumlah (${p?.baseUnit ?? ""})`}><Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Harga beli per satuan dasar"><Input type="number" min={0} placeholder={String(Math.round(p?.hpp ?? 0))} value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
        </div>
        <Field label="Penyelesaian"><select className={selectCls} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="uang_kembali">Uang dikembalikan ke laci</option><option value="potong_hutang">Potong hutang dagang</option></select></Field>
        {mode === "potong_hutang" && <Field label="Hutang yang dipotong"><select className={selectCls} value={payableId} onChange={(e) => setPayableId(e.target.value)}><option value="">Pilih…</option>{payables.map((x) => <option key={x.id} value={x.id}>{x.note} · sisa {rp(x.amount - x.paid)}</option>)}</select></Field>}
        <Field label="Alasan"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="rusak, bocor, kedaluwarsa" /></Field>
        <div className="text-sm text-muted-foreground">Nilai retur {rp(Number(qty) * unitCost)}</div>
        <Button className="w-full" onClick={save}>Catat Retur</Button>
      </div>
    </Card>
  );
}

function Repacking() {
  const products = physical(useStore((s) => s.products));
  const [src, setSrc] = useState(products[0]?.id ?? "");
  const [dst, setDst] = useState(products[1]?.id ?? "");
  const [srcQty, setSrcQty] = useState("50");
  const [produced, setProduced] = useState("49");
  const [content, setContent] = useState("1");
  const [pack, setPack] = useState("200");
  const s = products.find((x) => x.id === src);
  const used = Number(produced) * Number(content);
  const susut = Number(srcQty) - used;
  const hppPack = Number(produced) > 0 ? (Number(srcQty) * (s?.hpp ?? 0) + Number(pack) * Number(produced)) / Number(produced) : 0;
  const save = () => {
    try { actionsPlus.repack({ sourceId: src, targetId: dst, sourceQty: Number(srcQty), produced: Number(produced), contentPerPack: Number(content), packagingCostPerPack: Number(pack) }); toast.success("Repacking dicatat"); }
    catch (e) { toast.error(msg(e, "Gagal repacking")); }
  };
  return (
    <Card title="📦 Repacking Curah">
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Barang curah (asal)"><select className={selectCls} value={src} onChange={(e) => setSrc(e.target.value)}>{products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Barang kemasan (hasil)"><select className={selectCls} value={dst} onChange={(e) => setDst(e.target.value)}>{products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label={`Curah dipakai (${s?.baseUnit ?? ""})`}><Input type="number" value={srcQty} onChange={(e) => setSrcQty(e.target.value)} /></Field>
          <Field label="Hasil bungkus jadi"><Input type="number" value={produced} onChange={(e) => setProduced(e.target.value)} /></Field>
          <Field label="Isi per kemasan"><Input type="number" value={content} onChange={(e) => setContent(e.target.value)} /></Field>
          <Field label="Biaya plastik per kemasan"><Input type="number" value={pack} onChange={(e) => setPack(e.target.value)} /></Field>
        </div>
        <div className="rounded-xl bg-muted p-3 text-sm">Susut {num(Math.max(0, susut))} {s?.baseUnit} · HPP kemasan {rp(hppPack)}{susut < 0 && <b className="text-destructive"> · isi bungkus melebihi curah</b>}</div>
        <Button className="w-full" disabled={susut < 0} onClick={save}>Catat Repacking</Button>
      </div>
    </Card>
  );
}

function Suppliers() {
  const list = useStore((s) => s.suppliers);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("62");
  const save = () => {
    try { actionsPlus.saveSupplier({ id: uid(), name, phone }); toast.success("Supplier disimpan"); setName(""); }
    catch (e) { toast.error(msg(e, "Gagal menyimpan supplier")); }
  };
  return (
    <Card title="🏭 Supplier">
      <div className="space-y-2">
        {list.map((x) => <div key={x.id} className="flex justify-between border-b py-1 text-sm"><span>{x.name}</span><span className="text-muted-foreground">{x.phone}</span></div>)}
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <Field label="Nama"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="No. WA"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Button onClick={save}>Tambah</Button>
        </div>
      </div>
    </Card>
  );
}
