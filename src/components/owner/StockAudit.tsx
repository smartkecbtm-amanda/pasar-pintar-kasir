import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, OPNAME_REASONS, useStore, type OpnameReason } from "@/lib/store";
import { jam, num, tgl } from "@/lib/format";
import { Card, Field, selectCls } from "./ui";

/** Stock opname: hitung fisik → sistem menghitung selisih → alasan wajib → tercatat di mutasi stok dan audit. */
export function Opname() {
  const products = useStore((s) => s.products);
  const moves = useStore((s) => s.stockMoves);
  const items = products.filter((p) => !p.digital && !p.bundle);
  const [pid, setPid] = useState(items[0]?.id ?? "");
  const [physical, setPhysical] = useState("");
  const [reason, setReason] = useState<OpnameReason>(OPNAME_REASONS[0]);
  const [note, setNote] = useState("");
  const p = items.find((x) => x.id === pid);
  const diff = physical === "" || !p ? null : Number(physical) - p.stock;
  const history = moves.filter((m) => m.reason.startsWith("Opname")).slice(-12).reverse();

  const save = () => {
    try {
      actions.adjustStock(pid, Number(physical), reason, note);
      toast.success("Stok disesuaikan dan tercatat di audit");
      setPhysical(""); setNote("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal menyimpan opname"); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="📋 Stock Opname">
        <div className="space-y-2">
          <Field label="Barang"><select className={selectCls} value={pid} onChange={(e) => { setPid(e.target.value); setPhysical(""); }}>{items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={`Stok di sistem (${p?.baseUnit ?? ""})`}><Input readOnly value={p ? num(p.stock) : ""} /></Field>
            <Field label="Hasil hitung fisik"><Input type="number" min={0} value={physical} onChange={(e) => setPhysical(e.target.value)} /></Field>
          </div>
          {diff !== null && <p className={diff === 0 ? "text-sm text-muted-foreground" : diff < 0 ? "text-sm font-bold text-destructive" : "text-sm font-bold text-success"}>Selisih {diff > 0 ? "+" : ""}{num(diff)} {p?.baseUnit}</p>}
          <Field label="Alasan"><select className={selectCls} value={reason} onChange={(e) => setReason(e.target.value as OpnameReason)}>{OPNAME_REASONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Catatan (opsional)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <p className="text-xs text-muted-foreground">Konsumsi rumah tangga otomatis dicatat sebagai prive barang senilai HPP.</p>
          <Button className="w-full" disabled={!diff} onClick={save}>Simpan Penyesuaian</Button>
        </div>
      </Card>
      <Card title="Riwayat Opname Terakhir">
        {history.map((m) => (
          <div key={m.id} className="flex justify-between border-b py-2 text-sm">
            <span>{tgl(m.ts)} {jam(m.ts)} · {products.find((x) => x.id === m.productId)?.name} <span className="text-muted-foreground">{m.reason.replace("Opname · ", "")}</span></span>
            <b className={m.qty < 0 ? "text-destructive" : "text-success"}>{m.qty > 0 ? "+" : ""}{num(m.qty)}</b>
          </div>
        ))}
        {!history.length && <p className="text-muted-foreground">Belum ada opname.</p>}
      </Card>
    </div>
  );
}

/** Jejak audit: ubah harga/HPP, void, retur, tukar, prive, opname, ubah harga di kasir. */
export function AuditLog() {
  const audit = useStore((s) => s.audit);
  const rows = audit.slice(-150).reverse();
  return (
    <Card title="🔎 Jejak Audit">
      {rows.map((a) => (
        <div key={a.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm">
          <span><b>{a.action}</b> · {a.detail}</span>
          <span className="text-muted-foreground">{a.by} · {tgl(a.ts)} {jam(a.ts)}</span>
        </div>
      ))}
      {!rows.length && <p className="text-muted-foreground">Belum ada perubahan tercatat.</p>}
    </Card>
  );
}
