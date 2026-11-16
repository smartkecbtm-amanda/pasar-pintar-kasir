import { type Product, type State, type CartItem, type Customer, customerBalance } from "./store";
import { num } from "./format";
const DAY = 86400000;
/** Nota yang tidak dibatalkan; semua laporan dan analitik memakai ini. */
export const validSales = (s: State) => s.sales.filter((x) => !x.voided);

export function dayStats(s: State, from: number, to: number) {
  const sales = validSales(s).filter((x) => x.ts >= from && x.ts < to);
  const returns = s.returns.filter((r) => r.ts >= from && r.ts < to);
  const omzet = sales.reduce((a, x) => a + x.total, 0) - returns.reduce((a, r) => a + r.refund, 0);
  const hpp = sales.reduce((a, x) => a + x.items.reduce((b, i) => b + i.hpp * i.qty, 0), 0) - returns.reduce((a, r) => a + r.cost, 0);
  const beban = -s.cash.filter((c) => c.kind === "beban" && c.ts >= from && c.ts < to).reduce((a, c) => a + c.amount, 0) + returns.reduce((a, r) => a + r.loss, 0);
  const lain = s.cash.filter((c) => c.kind === "pemasukan" && c.ts >= from && c.ts < to).reduce((a, c) => a + c.amount, 0);
  const consign = s.consigns.filter((c) => c.settled && !c.productId && c.date >= from && c.date < to).reduce((a, c) => a + c.sold * (c.sellPrice - c.ownerPrice), 0);
  const prive = s.prive.filter((p) => p.ts >= from && p.ts < to).reduce((a, p) => a + p.amount, 0);
  const ppobMargin = s.ppob.filter((t) => t.status !== "gagal" && t.ts >= from && t.ts < to).reduce((a, t) => a + t.price - t.cost, 0);
  return { omzet, count: sales.length, gross: omzet - hpp, net: omzet - hpp - beban + lain + consign + ppobMargin, beban, prive, ppobMargin };
}

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ");
function isSubsequence(small: string, word: string) {
  let i = 0;
  for (const ch of word) if (ch === small[i]) i++;
  return i === small.length;
}
/** Pencarian toleran singkatan: "ind grg" menemukan "Indomie Goreng". Barcode/kode cepat yang persis selalu di urutan pertama. */
export function searchProducts(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  const tokens = norm(q).split(" ").filter(Boolean);
  const scored = products.map((p) => {
    if (p.barcode === q || p.quickCode === q) return { p, score: 100 };
    if (!tokens.length) return { p, score: 0 };
    const words = norm(`${p.name} ${p.category}`).split(" ").filter(Boolean);
    let score = 0;
    for (const t of tokens) {
      if (words.some((w) => w.startsWith(t))) score += 2;
      else if (t.length >= 2 && words.some((w) => w[0] === t[0] && isSubsequence(t, w))) score += 1;
      else return { p, score: 0 };
    }
    return { p, score };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.p);
}
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
    const sales = validSales(s).filter((x) => x.ts <= now);
    const qty = sales.filter((x) => x.ts >= now - 7 * DAY).reduce((a, x) => a + x.items.filter((i) => i.productId === p.id).reduce((b, i) => b + i.qty * i.factor, 0), 0);
    const daily = qty / 7;
    const last = Math.max(p.createdAt ?? now - 31 * DAY, ...sales.filter((x) => x.items.some((i) => i.productId === p.id)).map((x) => x.ts));
    const days = daily > 0 ? Math.max(0, p.stock) / daily : Infinity;
    const rop = daily * (p.leadTime ?? 2) + (p.safetyStock ?? Math.max(p.minStock, daily * 2));
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
/** Stok dalam satuan bertingkat: 45 bungkus dengan dus isi 40 menjadi "1 Dus + 5 Bungkus". */
export function formatStock(p: Pick<Product, "stock" | "baseUnit" | "units">): string {
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const neg = p.stock < 0;
  let rem = Math.abs(p.stock);
  const parts: string[] = [];
  for (const u of [...p.units].filter((x) => x.factor > 1).sort((a, b) => b.factor - a.factor)) {
    const n = Math.floor(rem / u.factor + 1e-9);
    if (n > 0) { parts.push(`${num(n)} ${cap(u.name)}`); rem -= n * u.factor; }
  }
  if (rem > 1e-9 || !parts.length) parts.push(`${num(rem)} ${cap(p.baseUnit)}`);
  return `${neg ? "-" : ""}${parts.join(" + ")}`;
}

const DAY_MS = 86400000;
/** Jatuh tempo kasbon = tanggal gajian pertama setelah utang tertua yang belum lunas (FIFO). */
export function kasbonDue(s: State, c: Customer): number | null {
  const balance = customerBalance(s, c.id);
  if (balance <= 0) return null;
  let left = balance;
  let oldest = Date.now();
  for (const l of s.ledger.filter((x) => x.customerId === c.id && x.debit > 0).sort((a, b) => b.ts - a.ts)) {
    oldest = l.ts; left -= l.debit;
    if (left <= 0) break;
  }
  if (!c.payday) return oldest + 30 * DAY_MS;
  const d = new Date(oldest);
  let due = new Date(d.getFullYear(), d.getMonth(), c.payday, 23, 59, 59).getTime();
  if (due < oldest) due = new Date(d.getFullYear(), d.getMonth() + 1, c.payday, 23, 59, 59).getTime();
  return due;
}
/** hijau = aman, kuning = jatuh tempo dalam 3 hari, merah = lewat jatuh tempo. */
export function kasbonStatus(s: State, c: Customer, now = Date.now()): "hijau" | "kuning" | "merah" {
  const due = kasbonDue(s, c);
  if (due === null) return "hijau";
  if (now > due) return "merah";
  return due - now <= 3 * DAY_MS ? "kuning" : "hijau";
}

/** 10 barang paling untung dan paling laris dalam N hari (nota batal dikeluarkan). */
export function topProducts(s: State, days = 30, now = Date.now()) {
  const acc = new Map<string, { id: string; name: string; qty: number; profit: number }>();
  for (const x of validSales(s).filter((q) => q.ts >= now - days * DAY_MS)) {
    for (const i of x.items) {
      const r = acc.get(i.productId) ?? { id: i.productId, name: i.name, qty: 0, profit: 0 };
      r.qty += i.qty * i.factor; r.profit += (i.price - i.hpp) * i.qty;
      acc.set(i.productId, r);
    }
  }
  const rows = [...acc.values()];
  return { byProfit: rows.slice().sort((a, b) => b.profit - a.profit).slice(0, 10), byQty: rows.slice().sort((a, b) => b.qty - a.qty).slice(0, 10) };
}

/** Jumlah transaksi per jam (0–23) dalam N hari, dan tiga jam tersibuk. */
export function peakHours(s: State, days = 30, now = Date.now()) {
  const hours = Array.from({ length: 24 }, () => 0);
  for (const x of validSales(s).filter((q) => q.ts >= now - days * DAY_MS)) hours[new Date(x.ts).getHours()]++;
  const top = hours.map((count, hour) => ({ hour, count })).filter((h) => h.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
  return { hours, top };
}
