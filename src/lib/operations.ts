import { type Product, type State, type CartItem } from "./store";
const DAY = 86400000;
export function wholesalePrice(p: Product, item: CartItem): number {
  const baseQty = item.qty * item.factor;
  const tiers = p.units.filter((u) => u.factor >= item.factor && u.factor <= baseQty && u.factor > 0);
  return Math.min(item.price, ...tiers.map((u) => u.price / u.factor * item.factor));
}
export function expiryStatus(expiry: string | undefined, now = Date.now()) {
  if (!expiry) return null;
  const days = Math.ceil((new Date(`${expiry}T00:00:00`).getTime() - now) / DAY);
  return { days, level: days <= 7 ? "danger" : days <= 30 ? "warning" : "safe" };
}
export function restockRadar(s: State, now = Date.now()) {
  const physical = s.products.filter((p) => !p.digital && !p.bundle);
  const rows = physical.map((p) => {
    const sales = s.sales.filter((x) => x.ts <= now);
    const qty = sales.filter((x) => x.ts >= now - 7 * DAY).reduce((a, x) => a + x.items.filter((i) => i.productId === p.id).reduce((b, i) => b + i.qty * i.factor, 0), 0);
    const daily = qty / 7;
    const last = Math.max(p.createdAt ?? now - 31 * DAY, ...sales.filter((x) => x.items.some((i) => i.productId === p.id)).map((x) => x.ts));
    const days = daily > 0 ? Math.max(0, p.stock) / daily : Infinity;
    const rop = daily * (p.leadTime ?? 2) + (p.safetyStock ?? p.minStock);
    const dead = now - last > 30 * DAY;
    const status = dead ? "Mati" : days < 2 ? "Kritis" : days <= 5 ? "Menipis" : "Aman";
    const revenue = sales.filter((x) => x.ts >= now - 30 * DAY).reduce((a, x) => a + x.items.filter((i) => i.productId === p.id).reduce((b, i) => b + i.price * i.qty, 0), 0);
    const pack = [...p.units].sort((a, b) => b.factor - a.factor)[0];
    const factor = pack?.factor ?? 1;
    const need = Math.max(0, Math.ceil((Math.max(daily * 7, rop + daily * (p.leadTime ?? 2)) - p.stock) / factor)) * factor;
    return { p, daily, days, rop, status, revenue, need, pack, cost: need * p.hpp, abc: "C" as "A" | "B" | "C", market: p.market || (p.category === "Curah" ? "Pasar Pagi" : p.category === "Minuman" || p.category === "Rokok" ? "Distributor" : "Agen Sembako"), reorder: !dead && (p.stock <= rop || days <= 5) };
  }).sort((a, b) => b.revenue - a.revenue);
  const total = rows.reduce((a, r) => a + r.revenue, 0);
  let cumulative = 0;
  rows.forEach((r) => { r.abc = total === 0 || r.revenue === 0 ? "C" : cumulative / total < .8 ? "A" : cumulative / total < .95 ? "B" : "C"; cumulative += r.revenue; });
  return rows;
}
export function businessAdvice(s: State, now = Date.now()) {
  const radar = restockRadar(s, now);
  const frozen = radar.filter((r) => r.status === "Mati").reduce((a, r) => a + r.p.stock * r.p.hpp, 0);
  const debts = s.ledger.reduce((a, x) => a + x.debit - x.credit, 0);
  const urgent = radar.filter((r) => r.reorder);
  return [`Modal barang yang tidak bergerak lebih dari 30 hari sekitar Rp ${Math.round(frozen).toLocaleString("id-ID")}. Pertimbangkan paket hemat sebelum belanja ulang.`, `Kasbon beredar Rp ${Math.round(debts).toLocaleString("id-ID")}. Ingatkan pembayaran dengan santun agar uang kulakan tersedia.`, `${urgent.length} barang mencapai waktu pesan kembali. Dahulukan barang kelas A dan periksa harga agen sebelum belanja.`];
}