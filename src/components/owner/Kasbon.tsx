import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { actions, customerBalance, uid, useStore, type Customer } from "@/lib/store";
import { actionsPlus } from "@/lib/store-extra";
import { kasbonStatus } from "@/lib/operations";
import { kasbonRisk } from "@/lib/advisor";
import { rp, tgl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, Field, selectCls } from "./ui";

export function Kasbon() {
  const s = useStore((x) => x);
  const [sel, setSel] = useState(s.customers[0]?.id ?? "");
  const [amt, setAmt] = useState("");
  const [nc, setNc] = useState({ name: "", phone: "62", limit: "200000", payday: "25" });
  const c = s.customers.find((x) => x.id === sel);
  const rows = s.ledger.filter((l) => l.customerId === sel).sort((a, b) => a.ts - b.ts);
  let run = 0;
  const bal = c ? customerBalance(s, c.id) : 0;
  const wa = c && encodeURIComponent(`Assalamualaikum ${c.name} 🙏\nCatatan kasbon di ${s.shopName}:\n` + rows.slice(-5).map((r) => `${tgl(r.ts)} ${r.desc} ${r.debit ? "+" + rp(r.debit) : "-" + rp(r.credit)}`).join("\n") + `\n\nTotal: *${rp(bal)}*\nJatuh tempo tgl ${c.payday}. Terima kasih.`);

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Card title="Pelanggan Kasbon">
          <div className="space-y-2">
            {s.customers.map((x) => {
              const b = customerBalance(s, x.id);
              return (
                <button key={x.id} onClick={() => setSel(x.id)} className={cn("w-full rounded-xl border-2 p-3 text-left", sel === x.id && "border-primary")}>
                  <div className="flex justify-between"><b><span className={kasbonStatus(s, x) === "merah" ? "text-destructive" : kasbonStatus(s, x) === "kuning" ? "text-warning" : "text-success"}>●</span> {x.name}{x.active === false ? " (nonaktif)" : ""}</b><b className={b > x.limit * 0.8 ? "text-destructive" : ""}>{rp(b)}</b></div>
                  <Progress value={Math.min(100, (b / x.limit) * 100)} className="mt-2 h-2" />
                  <div className="mt-1 text-xs text-muted-foreground">limit {rp(x.limit)} · gajian tgl {x.payday}{x.tag ? ` · ${x.tag}` : ""} · risiko {kasbonRisk(s, x).level}</div>
                </button>
              );
            })}
          </div>
        </Card>
        <CustomerForm selected={c} />
      </div>
      {c && (
        <Card title={`Rekening Koran · ${c.name}`} action={<a href={`https://wa.me/${c.phone}?text=${wa}`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">📲 Kirim Tagihan WA</Button></a>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground"><tr><th className="py-2">Tanggal</th><th>Keterangan</th><th className="text-right">Debit</th><th className="text-right">Kredit</th><th className="text-right">Saldo</th></tr></thead>
              <tbody>
                {rows.map((r) => { run += r.debit - r.credit; return (
                  <tr key={r.id} className="border-t"><td className="py-2">{tgl(r.ts)}</td><td>{r.desc}</td><td className="text-right text-destructive">{r.debit ? rp(r.debit) : ""}</td><td className="text-right text-success">{r.credit ? rp(r.credit) : ""}</td><td className="text-right font-bold">{rp(run)}</td></tr>
                ); })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl bg-muted p-3">
            <div className="mr-auto"><div className="text-sm">Sisa utang</div><div className="num-jumbo text-3xl">{rp(bal)}</div></div>
            <Field label="Bayar / cicil"><Input type="number" className="w-36" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
            <Button variant="outline" onClick={() => setAmt(String(bal))}>Lunas</Button>
            <Button disabled={!+amt} onClick={() => { actions.payDebt(c.id, Math.min(+amt, bal)); toast.success("Pembayaran kasbon dicatat"); setAmt(""); }}>Catat</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

const TAGS = ["", "Keluarga", "Tetangga", "Langganan", "Pegawai"];
function CustomerForm({ selected }: { selected?: Customer }) {
  const blank = (): Customer => ({ id: uid(), name: "", phone: "62", limit: 200000, payday: 25, address: "", landmark: "", tag: "", active: true });
  const [f, setF] = useState<Customer>(blank());
  const save = () => {
    try { actionsPlus.saveCustomer(f); toast.success(f.name + " disimpan"); setF(blank()); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Gagal menyimpan"); }
  };
  return (
    <Card title={f.name && selected?.id === f.id ? "Ubah Pelanggan" : "Tambah Pelanggan"} action={selected ? <Button size="sm" variant="outline" onClick={() => setF({ ...blank(), ...selected })}>Ubah yang dipilih</Button> : undefined}>
      <div className="space-y-2">
        <Field label="Nama"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="No. WA"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Alamat / gang"><Input value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <Field label="Patokan rumah"><Input value={f.landmark ?? ""} onChange={(e) => setF({ ...f, landmark: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Limit"><Input type="number" value={f.limit} onChange={(e) => setF({ ...f, limit: Number(e.target.value) })} /></Field>
          <Field label="Tgl gajian"><Input type="number" min={1} max={31} value={f.payday} onChange={(e) => setF({ ...f, payday: Number(e.target.value) })} /></Field>
          <Field label="Kelompok"><select className={selectCls} value={f.tag ?? ""} onChange={(e) => setF({ ...f, tag: e.target.value })}>{TAGS.map((t) => <option key={t} value={t}>{t || "-"}</option>)}</select></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active !== false} onChange={(e) => setF({ ...f, active: e.target.checked })} />Aktif (tampil di kasir)</label>
        <Button className="w-full" onClick={save}>Simpan Pelanggan</Button>
      </div>
    </Card>
  );
}
