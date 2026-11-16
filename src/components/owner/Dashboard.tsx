import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore, customerBalance } from "@/lib/store";
import { num, rp, startOfDay, tgl } from "@/lib/format";
import { Card, Stat } from "./ui";
import { AIBusinessAdvisorCard } from "./Advisor";
import { dayStats, expiryStatus, validSales } from "@/lib/operations";
import { Insights } from "./Insights";

const DAY = 86400000;
export { dayStats };

export function Dashboard() {
  const s = useStore((x) => x);
  const t0 = startOfDay();
  const today = dayStats(s, t0, t0 + DAY);
  const days = Array.from({ length: 7 }, (_, i) => { const f = t0 - (6 - i) * DAY; const d = dayStats(s, f, f + DAY); return { hari: tgl(f), Omzet: d.omzet, Laba: d.net }; });
  const month = dayStats(s, t0 - 29 * DAY, t0 + DAY);
  const lastSold = new Map<string, number>();
  validSales(s).forEach((x) => x.items.forEach((i) => lastSold.set(i.productId, Math.max(lastSold.get(i.productId) ?? 0, x.ts))));
  const dead = s.products.filter((p) => !p.digital && !p.bundle && p.stock > 0 && (lastSold.get(p.id) ?? p.createdAt ?? 0) < Date.now() - 30 * DAY);
  const low = s.products.filter((p) => !p.digital && !p.bundle && p.stock <= p.minStock);
  const piutang = s.customers.reduce((a, c) => a + customerBalance(s, c.id), 0);
  const hutang = s.payables.reduce((a, p) => a + p.amount - p.paid, 0);
  const stockValue = s.products.reduce((a, p) => a + (p.digital || p.bundle ? 0 : p.stock * p.hpp), 0);
  const best = [...s.products].map((p) => ({ p, q: validSales(s).filter((x) => x.ts > t0 - 7 * DAY).reduce((a, x) => a + x.items.filter((i) => i.productId === p.id).reduce((b, i) => b + i.qty * i.factor, 0), 0) })).sort((a, b) => b.q - a.q).slice(0, 5);

  return (
    <div className="space-y-4">
      <AIBusinessAdvisorCard />
      <div className="flex flex-wrap gap-4 border-b pb-3 text-sm">{(["tunai", "qris", "kasbon"] as const).map((method) => <span key={method}>{method.toUpperCase()} <b>{rp(validSales(s).filter((x) => x.ts >= t0).reduce((a, x) => a + (x.payments?.filter((p) => p.method === method).reduce((b,p) => b+p.amount,0) ?? (x.method === method ? x.total : 0)), 0))}</b></span>)}</div>
      {s.products.filter((p) => { const e = expiryStatus(p.expiry); return e && e.level !== "safe"; }).map((p) => { const e = expiryStatus(p.expiry); return <div key={p.id} className={e?.level === "danger" ? "text-destructive font-bold" : "text-warning-foreground"}>{p.name} · {e && e.days < 0 ? "Sudah kedaluwarsa" : `Kedaluwarsa H-${e?.days}`}</div>; })}
      {s.payables.filter((p) => p.amount - p.paid > 0 && p.due <= Date.now() + 3 * DAY).map((p) => <div key={p.id} className={p.due < Date.now() ? "text-destructive font-bold" : "text-warning-foreground"}>Hutang {p.note || "supplier"} {rp(p.amount - p.paid)} · {p.due < Date.now() ? "sudah lewat jatuh tempo" : `jatuh tempo ${tgl(p.due)}`}</div>)}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Omzet hari ini" value={rp(today.omzet)} />
        <Stat label="Laba bersih riil hari ini" value={rp(today.net)} tone={today.net >= 0 ? "good" : "bad"} />
        <Stat label="Transaksi hari ini" value={String(today.count)} />
        <Stat label="Prive hari ini" value={rp(today.prive)} tone="warn" />
        <Stat label="Laba bersih 30 hari" value={rp(month.net)} tone="good" />
        <Stat label="Piutang kasbon" value={rp(piutang)} tone="warn" />
        <Stat label="Hutang supplier" value={rp(hutang)} tone="bad" />
        <Stat label="Nilai stok (HPP)" value={rp(stockValue)} />
      </div>
      <Card title="Omzet & laba 7 hari">
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={days}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="hari" fontSize={12} />
              <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}rb`} />
              <Tooltip formatter={(v: number) => rp(v)} />
              <Bar dataKey="Omzet" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Laba" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground">Laba bersih riil = omzet − HPP − beban operasional + pemasukan lain + bagi hasil titipan. Prive tidak dihitung sebagai biaya.</p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="🏆 Terlaris 7 hari">{best.map(({ p, q }) => <Row key={p.id} a={`${p.emoji} ${p.name}`} b={`${num(q)} ${p.baseUnit}`} />)}</Card>
        <Card title="⚠️ Stok menipis">{low.length ? low.map((p) => <Row key={p.id} a={p.name} b={`${num(p.stock)} ${p.baseUnit}`} bad />) : <p className="text-muted-foreground">Aman</p>}</Card>
        <Card title="🐌 Dead stock (>30 hari tak laku)">{dead.length ? dead.map((p) => <Row key={p.id} a={p.name} b={rp(p.stock * p.hpp)} />) : <p className="text-muted-foreground">Tidak ada</p>}</Card>
      </div>
      <Insights />
    </div>
  );
}
const Row = ({ a, b, bad }: { a: string; b: string; bad?: boolean }) => (
  <div className="flex justify-between border-b py-1.5 text-sm last:border-0"><span>{a}</span><b className={bad ? "text-destructive" : ""}>{b}</b></div>
);
