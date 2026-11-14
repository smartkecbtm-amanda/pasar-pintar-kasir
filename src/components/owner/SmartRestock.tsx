import { useStore, setState } from "@/lib/store";
import { restockRadar } from "@/lib/operations";
import { num, rp } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingBasket } from "lucide-react";

export function SmartRestock() {
  const s = useStore((s) => s);
  const rows = restockRadar(s);
  const groups = [...new Set(s.shopping.map((i) => rows.find((r) => r.p.id === i.productId)?.market ?? "Pasar"))];
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Restok Pintar</h2><Button onClick={() => setState(() => ({ shopping: rows.filter((r) => r.reorder && r.need > 0).map((r) => ({ productId: r.p.id, qty: r.need, cost: r.cost, checked: false })) }))}><ShoppingBasket />Buat Daftar Kulakan Hari Ini</Button></div>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2">Barang</th><th>ABC</th><th>Sisa hari</th><th>ROP</th><th>Status</th></tr></thead><tbody>{rows.map((r) => <tr key={r.p.id} className="border-t"><td className="py-3 font-semibold">{r.p.emoji} {r.p.name}<div className="text-xs text-muted-foreground">{num(r.daily)} {r.p.baseUnit}/hari · stok {num(r.p.stock)}</div></td><td>{r.abc}</td><td>{Number.isFinite(r.days) ? num(r.days) : "—"}</td><td>{num(r.rop)}</td><td className={r.status === "Kritis" ? "text-destructive font-bold" : r.status === "Menipis" ? "text-warning-foreground" : "text-muted-foreground"}>{r.status}{r.reorder ? " · Pesan" : ""}</td></tr>)}</tbody></table></div>
    {!!s.shopping.length && <section className="border-t pt-4"><h3 className="text-lg font-bold">Daftar Belanja Pasar</h3><p className="num-jumbo my-3 text-2xl text-primary">Modal {rp(s.shopping.reduce((a, i) => a + i.cost, 0))}</p>{groups.map((group) => <div key={group} className="mb-5"><h4 className="mb-2 font-bold">{group}</h4>{s.shopping.map((i) => { const r = rows.find((r) => r.p.id === i.productId); if (!r || r.market !== group) return null; return <div key={i.productId} className="flex flex-wrap items-center gap-3 border-b py-3"><input aria-label={`Terbeli ${r.p.name}`} type="checkbox" checked={i.checked} onChange={(e) => setState((s) => ({ shopping: s.shopping.map((x) => x.productId === i.productId ? { ...x, checked: e.target.checked } : x) }))} /><div className="min-w-0 flex-1"><b className={i.checked ? "line-through text-muted-foreground" : ""}>{r.p.name}</b><p className="text-sm">{num(i.qty / (r.pack?.factor ?? 1))} {r.pack?.name} · {num(i.qty)} {r.p.baseUnit}</p></div><Input aria-label={`Harga beli ${r.p.name}`} className="w-36" type="number" min={0} value={i.cost} onChange={(e) => setState((s) => ({ shopping: s.shopping.map((x) => x.productId === i.productId ? { ...x, cost: Math.max(0, Number(e.target.value)) } : x) }))} /></div>; })}</div>)}</section>}
  </div>;
}