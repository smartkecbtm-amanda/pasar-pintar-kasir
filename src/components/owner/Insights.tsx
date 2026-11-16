import { useStore } from "@/lib/store";
import { peakHours, topProducts } from "@/lib/operations";
import { num, rp } from "@/lib/format";
import { Card } from "./ui";

/** Top 10 paling untung/laris (30 hari) dan jam tersibuk. */
export function Insights() {
  const s = useStore((x) => x);
  const t = topProducts(s, 30);
  const h = peakHours(s, 30);
  const max = Math.max(1, ...h.hours);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="💰 10 Paling Untung (30 hari)">{t.byProfit.map((r, i) => <div key={r.id} className="flex justify-between border-b py-1 text-sm last:border-0"><span>{i + 1}. {r.name}</span><b>{rp(r.profit)}</b></div>)}{!t.byProfit.length && <p className="text-muted-foreground">Belum ada penjualan.</p>}</Card>
      <Card title="🔥 10 Paling Laris (30 hari)">{t.byQty.map((r, i) => <div key={r.id} className="flex justify-between border-b py-1 text-sm last:border-0"><span>{i + 1}. {r.name}</span><b>{num(r.qty)}</b></div>)}{!t.byQty.length && <p className="text-muted-foreground">Belum ada penjualan.</p>}</Card>
      <Card title="⏰ Jam Tersibuk">
        <div className="flex h-24 items-end gap-0.5">{h.hours.map((c, i) => <div key={i} title={`${i}:00 · ${c} transaksi`} className="flex-1 rounded-t bg-primary/70" style={{ height: `${(c / max) * 100}%`, minHeight: c ? 3 : 1 }} />)}</div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>0</span><span>6</span><span>12</span><span>18</span><span>23</span></div>
        <p className="mt-2 text-sm">{h.top.length ? `Tersibuk: ${h.top.map((x) => `${String(x.hour).padStart(2, "0")}:00 (${x.count})`).join(", ")}` : "Belum ada data."}</p>
      </Card>
    </div>
  );
}
