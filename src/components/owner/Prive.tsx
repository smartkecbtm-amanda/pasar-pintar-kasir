import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, useStore } from "@/lib/store";
import { jam, num, rp, tgl } from "@/lib/format";
import { Card, Field, selectCls } from "./ui";

export function PriveTab() {
  const s = useStore((x) => x);
  const items = s.products.filter((p) => !p.digital && !p.bundle);
  const [type, setType] = useState<"tunai" | "barang">("tunai");
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  const [pid, setPid] = useState(items[0]?.id);
  const [qty, setQty] = useState("1");
  const [ck, setCk] = useState<"beban" | "pemasukan">("beban");
  const [ca, setCa] = useState("");
  const [cn_, setCn] = useState("");
  const p = items.find((x) => x.id === pid);
  const total = s.prive.reduce((a, x) => a + x.amount, 0);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="🏠 Catat Prive (Ambil untuk Rumah)">
        <div className="mb-3 grid grid-cols-2 gap-2">
          {(["tunai", "barang"] as const).map((t) => <Button key={t} variant={type === t ? "default" : "secondary"} onClick={() => setType(t)}>Prive {t}</Button>)}
        </div>
        <div className="space-y-2">
          {type === "tunai" ? (
            <Field label="Jumlah uang diambil dari laci"><Input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Barang"><select className={selectCls} value={pid} onChange={(e) => setPid(e.target.value)}>{items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
              <Field label={`Jumlah (${p?.baseUnit})`}><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
            </div>
          )}
          {type === "barang" && p && <p className="text-sm text-muted-foreground">Dinilai sebesar HPP: <b>{rp(p.hpp * +qty)}</b></p>}
          <Field label="Keterangan"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. uang sekolah anak" /></Field>
          <Button className="w-full" onClick={() => {
            if (type === "tunai" && !+amt) return;
            actions.addPrive(type === "tunai" ? { type, amount: +amt, note: note || "Prive tunai" } : { type, amount: p!.hpp * +qty, note: note || "Prive barang", productId: p!.id, qty: +qty });
            toast.success("Prive dicatat"); setAmt(""); setNote("");
          }}>Simpan Prive</Button>
        </div>
      </Card>
      <Card title="💸 Beban Operasional & Pemasukan Lain">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Button variant={ck === "beban" ? "default" : "secondary"} onClick={() => setCk("beban")}>Beban (listrik, plastik…)</Button>
          <Button variant={ck === "pemasukan" ? "default" : "secondary"} onClick={() => setCk("pemasukan")}>Pemasukan lain</Button>
        </div>
        <div className="space-y-2">
          <Field label="Jumlah"><Input type="number" value={ca} onChange={(e) => setCa(e.target.value)} /></Field>
          <Field label="Keterangan"><Input value={cn_} onChange={(e) => setCn(e.target.value)} /></Field>
          <Button className="w-full" disabled={!+ca} onClick={() => { actions.addCash(ck === "beban" ? -ca : +ca, ck, cn_ || ck); toast.success("Dicatat"); setCa(""); setCn(""); }}>Simpan</Button>
        </div>
      </Card>
      <Card title={`Riwayat Prive · total ${rp(total)}`} className="lg:col-span-2">
        {s.prive.slice().reverse().map((x) => {
          const pr = s.products.find((y) => y.id === x.productId);
          return <div key={x.id} className="flex justify-between border-b py-2 text-sm"><span>{tgl(x.ts)} {jam(x.ts)} · <b>{x.type}</b> · {x.note}{pr ? ` (${num(x.qty!)} ${pr.baseUnit} ${pr.name})` : ""}</span><b>{rp(x.amount)}</b></div>;
        })}
      </Card>
    </div>
  );
}
