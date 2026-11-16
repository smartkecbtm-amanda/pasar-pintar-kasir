import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cloudBase, cloudConfig, createRemoteStore, getSession, listBranches, syncNowIfCloud } from "@/lib/cloud";
import { actionsPlus } from "@/lib/store-extra";
import { transferLines } from "@/lib/receipt";
import { PrintLines } from "@/components/pos/Receipt";
import { useStore } from "@/lib/store";
import { num, tgl } from "@/lib/format";
import { Card, Field, selectCls } from "./ui";

const msg = (e: unknown, d: string) => (e instanceof Error ? e.message : d);

/** Multi-cabang: daftar cabang pemilik yang sama dan surat jalan digital antar-cabang (butuh cloud aktif). */
export function Branches() {
  const s = useStore((x) => x);
  const cfg = cloudConfig();
  const ready = !!cfg && !!getSession();
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [toStore, setToStore] = useState("");
  const [lines, setLines] = useState<{ productId: string; qty: string }[]>([{ productId: s.products.find((p) => !p.digital && !p.bundle)?.id ?? "", qty: "1" }]);
  const [note, setNote] = useState("");
  const [newName, setNewName] = useState("");
  const [created, setCreated] = useState("");
  const [print, setPrint] = useState<string[] | null>(null);
  const items = s.products.filter((p) => !p.digital && !p.bundle);

  const refresh = () => { listBranches().then((b) => { setBranches(b); if (!toStore && b[0]) setToStore(b[0].id); }).catch((e) => toast.error(msg(e, "Gagal memuat cabang"))); };
  useEffect(() => { if (ready) refresh(); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <Card title="🏬 Cabang"><p className="text-muted-foreground">Fitur multi-cabang membutuhkan cloud. Aktifkan di tab “Cloud & Perangkat”: isi konfigurasi Supabase, masuk dengan email pemilik, lalu mulai sinkronisasi.</p></Card>;

  const send = () => {
    const to = branches.find((b) => b.id === toStore);
    if (!to || !cfg) return toast.error("Pilih cabang tujuan");
    try {
      actionsPlus.createTransfer({ fromStore: cfg.storeId, toStore: to.id, fromName: s.shopName, toName: to.name, note, lines: lines.map((l) => ({ productId: l.productId, qtyBase: Number(l.qty) })) });
      toast.success("Surat jalan dikirim; stok toko ini sudah berkurang"); setNote(""); void syncNowIfCloud();
    } catch (e) { toast.error(msg(e, "Gagal mengirim")); }
  };
  const act = (fn: () => void, ok: string) => { try { fn(); toast.success(ok); void syncNowIfCloud(); } catch (e) { toast.error(msg(e, "Gagal")); } };
  const printTr = (t: (typeof s.transfers)[number]) => { setPrint(transferLines(t)); setTimeout(() => window.print(), 80); };
  const base = cloudBase();
  const mine = s.transfers.slice().reverse();

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <Card title="🚚 Kirim Barang ke Cabang">
          <div className="space-y-2">
            <Field label="Cabang tujuan"><select className={selectCls} value={toStore} onChange={(e) => setToStore(e.target.value)}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            {!branches.length && <p className="text-sm text-muted-foreground">Belum ada cabang lain. Buat di bawah.</p>}
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_auto] items-end gap-1">
                <select aria-label="Barang" className={selectCls} value={l.productId} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)))}>{items.map((p) => <option key={p.id} value={p.id}>{p.name} ({num(p.stock)} {p.baseUnit})</option>)}</select>
                <Input aria-label="Jumlah" type="number" min={0} value={l.qty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
                <Button variant="ghost" size="sm" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setLines([...lines, { productId: items[0]?.id ?? "", qty: "1" }])}>+ Barang</Button>
            <Field label="Catatan"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <Button className="w-full" disabled={!branches.length} onClick={send}>Kirim Surat Jalan</Button>
          </div>
        </Card>
        <Card title="🏪 Buat Cabang Baru">
          <div className="space-y-2">
            <Field label="Nama cabang"><Input value={newName} onChange={(e) => setNewName(e.target.value)} /></Field>
            <Button className="w-full" disabled={!newName.trim() || !base} onClick={async () => { try { if (!base) return; const id = await createRemoteStore(base, newName.trim()); setCreated(id); setNewName(""); refresh(); toast.success("Cabang dibuat"); } catch (e) { toast.error(msg(e, "Gagal membuat cabang")); } }}>Buat Cabang</Button>
            {created && <p className="break-all rounded-xl bg-muted p-2 text-xs">ID toko cabang: <b>{created}</b><br />Di perangkat cabang, masuk dengan email yang sama dan isi ID ini pada Cloud & Perangkat.</p>}
          </div>
        </Card>
      </div>
      <Card title="Surat Jalan">
        {!mine.length && <p className="text-muted-foreground">Belum ada surat jalan.</p>}
        {mine.map((t) => {
          const incoming = t.toStore === cfg?.storeId; const outgoing = t.fromStore === cfg?.storeId;
          return (
            <div key={t.id} className="space-y-1 border-b py-3 last:border-0">
              <div className="flex flex-wrap justify-between gap-2"><b>{incoming ? `Masuk dari ${t.fromName}` : `Keluar ke ${t.toName}`}</b><span className="text-sm text-muted-foreground">{tgl(t.ts)} · {t.status}</span></div>
              <div className="text-sm">{t.items.map((i) => `${i.name} ${num(i.qtyBase)} ${i.unit}`).join(", ")}</div>
              <div className="flex gap-1">
                {incoming && t.status === "dikirim" && <Button size="sm" onClick={() => act(() => actionsPlus.receiveTransfer(t.id), "Barang diterima dan masuk stok")}>Terima</Button>}
                {outgoing && t.status === "dikirim" && <Button size="sm" variant="destructive" onClick={() => act(() => actionsPlus.cancelTransfer(t.id), "Dibatalkan; stok kembali")}>Batalkan</Button>}
                <Button size="sm" variant="outline" onClick={() => printTr(t)}>🖨️ Cetak</Button>
              </div>
            </div>
          );
        })}
      </Card>
      <PrintLines lines={print} width={s.paperWidth} />
    </div>
  );
}
