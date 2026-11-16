import { useState } from "react";
import { formatStock } from "@/lib/operations";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { actions, bundleStock, productCost, uid, useStore, type Product } from "@/lib/store";
import { num, rp } from "@/lib/format";
import { Card, Field, selectCls } from "./ui";

const CATS: Product["category"][] = ["Curah", "Sembako", "Minuman", "Rokok", "Jajan", "Paket", "Digital"];
const blank = (): Product => ({ id: uid(), name: "", emoji: "📦", category: "Sembako", baseUnit: "pcs", stock: 0, hpp: 0, minStock: 5, units: [{ name: "pcs", factor: 1, price: 0 }] });

export function Products() {
  const s = useStore((x) => x);
  const [edit, setEdit] = useState<Product | null>(null);
  const [q, setQ] = useState("");
  const list = s.products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Card title="Katalog Produk" action={<Button onClick={() => setEdit(blank())}><Plus /> Produk</Button>}>
      <Input placeholder="Cari produk…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground"><tr><th className="py-2">Produk</th><th>Stok</th><th>HPP / satuan dasar</th><th>Satuan jual</th><th>Margin</th></tr></thead>
          <tbody>
            {list.map((p) => {
              const cost = productCost(s, p);
              const m = p.units[0].price ? ((p.units[0].price - cost * p.units[0].factor) / p.units[0].price) * 100 : 0;
              return (
                <tr key={p.id} onClick={() => setEdit(p)} className="cursor-pointer border-t hover:bg-muted">
                  <td className="py-2 font-semibold">{p.emoji} {p.name} <span className="text-xs font-normal text-muted-foreground">{p.category}{p.bundle ? " · bundling" : ""}</span></td>
                  <td className={!p.digital && bundleStock(s, p) <= p.minStock ? "font-bold text-destructive" : ""}>{p.digital ? "∞" : p.bundle ? `${num(bundleStock(s, p))} ${p.baseUnit}` : formatStock({ stock: p.stock, baseUnit: p.baseUnit, units: p.units })}</td>
                  <td>{rp(cost)}</td>
                  <td>{p.units.map((u) => `${u.name} ${rp(u.price)}`).join(" · ")}</td>
                  <td className={m < 5 ? "text-destructive" : "text-success"}>{m.toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {edit && <ProductDialog p={edit} onClose={() => setEdit(null)} />}
    </Card>
  );
}

function ProductDialog({ p: init, onClose }: { p: Product; onClose: () => void }) {
  const products = useStore((x) => x.products);
  const [p, setP] = useState<Product>(init);
  const isExisting = products.some((x) => x.id === init.id);
  const set = (k: Partial<Product>) => setP({ ...p, ...k });
  const isBundle = !!p.bundle;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>{init.name || "Produk baru"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-[80px_1fr] gap-2">
          <Field label="Ikon"><Input value={p.emoji} onChange={(e) => set({ emoji: e.target.value })} /></Field>
          <Field label="Nama"><Input value={p.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Field label="Kategori"><select className={selectCls} value={p.category} onChange={(e) => set({ category: e.target.value as Product["category"], digital: e.target.value === "Digital" })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Satuan dasar"><Input value={p.baseUnit} onChange={(e) => set({ baseUnit: e.target.value })} /></Field>
          <Field label="Stok minimum"><Input type="number" value={p.minStock} onChange={(e) => set({ minStock: Number(e.target.value) })} /></Field>
          <Field label="Barcode"><Input value={p.barcode ?? ""} onChange={(e) => set({ barcode: e.target.value })} /></Field>
          <Field label="Foto produk"><div className="flex items-center gap-2">{p.photo ? <img src={p.photo} alt="" className="size-12 rounded-lg object-cover" /> : <span className="text-2xl">{p.emoji}</span>}<input type="file" accept="image/*" aria-label="Foto produk" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { set({ photo: await resizePhoto(f) }); } catch { toast.error("Foto tidak bisa dibaca"); } } }} />{p.photo && <Button type="button" variant="ghost" size="sm" onClick={() => set({ photo: undefined })}>Hapus</Button>}</div></Field>
          <Field label="Kode cepat (2–3 digit)"><Input inputMode="numeric" maxLength={3} value={p.quickCode ?? ""} onChange={(e) => set({ quickCode: e.target.value.replace(/\D/g, "") })} /></Field>
        </div>
        {!isBundle && (
          <div className="grid grid-cols-2 gap-2">
            <Field label={`Stok (${p.baseUnit})`}><Input type="number" value={p.stock} disabled={isExisting} onChange={(e) => set({ stock: Number(e.target.value) })} />{isExisting && <span className="text-xs text-muted-foreground">Ubah stok lewat tab Opname agar tercatat.</span>}</Field>
            <Field label="HPP per satuan dasar"><Input type="number" value={Math.round(p.hpp)} onChange={(e) => set({ hpp: Number(e.target.value) })} /></Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Tanggal kedaluwarsa"><Input type="date" value={p.expiry ?? ""} onChange={(e) => set({ expiry: e.target.value })} /></Field>
          <Field label="Lokasi kulakan"><Input value={p.market ?? ""} onChange={(e) => set({ market: e.target.value })} /></Field>
          <Field label="Waktu tunggu pesanan (hari)"><Input type="number" min={0} value={p.leadTime ?? 2} onChange={(e) => set({ leadTime: Math.max(0, Number(e.target.value)) })} /></Field>
          <Field label="Stok pengaman"><Input type="number" min={0} value={p.safetyStock ?? p.minStock} onChange={(e) => set({ safetyStock: Math.max(0, Number(e.target.value)) })} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!p.quick} onChange={(e) => set({ quick: e.target.checked })} /> Tampilkan sebagai tombol foto besar di kasir</label>
        <div>
          <div className="mb-1 flex items-center justify-between"><b className="text-sm">Satuan jual (multi-satuan)</b>
            <Button size="sm" variant="outline" onClick={() => set({ units: [...p.units, { name: "dus", factor: 10, price: 0 }] })}><Plus />Satuan</Button></div>
          {p.units.map((u, i) => (
            <div key={i} className="mb-1 grid grid-cols-[1fr_80px_110px_32px] gap-1">
              <Input value={u.name} onChange={(e) => set({ units: p.units.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              <Input type="number" title="isi (x satuan dasar)" value={u.factor} onChange={(e) => set({ units: p.units.map((x, j) => (j === i ? { ...x, factor: Number(e.target.value) } : x)) })} />
              <Input type="number" value={u.price} onChange={(e) => set({ units: p.units.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)) })} />
              <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => set({ units: p.units.filter((_, j) => j !== i) })}><Trash2 /></Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Kolom: nama · isi (berapa {p.baseUnit}) · harga jual</p>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={isBundle} onChange={(e) => set({ bundle: e.target.checked ? [] : undefined })} /> Produk bundling / paket (stok ikut komponen)</label>
          {isBundle && (
            <div className="mt-2 space-y-1">
              {p.bundle?.map((b, i) => (
                <div key={i} className="grid grid-cols-[1fr_90px_32px] gap-1">
                  <select className={selectCls} value={b.productId} onChange={(e) => set({ bundle: p.bundle?.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)) })}>
                    {products.filter((x) => !x.bundle && !x.digital).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                  <Input type="number" value={b.qty} onChange={(e) => set({ bundle: p.bundle?.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)) })} />
                  <Button size="icon" variant="ghost" onClick={() => set({ bundle: p.bundle?.filter((_, j) => j !== i) })}><Trash2 /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set({ bundle: [...(p.bundle ?? []), { productId: products[0]?.id ?? "", qty: 1 }] })}><Plus />Komponen</Button>
            </div>
          )}
        </div>
        <div className="flex justify-between gap-2">
          <Button variant="ghost" className="text-destructive" onClick={() => { actions.deleteProduct(p.id); onClose(); }}>Hapus</Button>
          <Button onClick={() => { if (!p.name) return toast.error("Nama wajib diisi"); actions.saveProduct(p); toast.success("Produk disimpan"); onClose(); }}>Simpan</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Perkecil foto ke maksimal 160 px (JPEG) agar hemat penyimpanan. */
function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 160 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("gambar tidak valid")); };
    img.src = url;
  });
}
