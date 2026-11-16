import { useSyncExternalStore } from "react";
import { idbAvailable, scheduleSnapshot, kvGet } from "./persist";

export type Unit = { name: string; factor: number; price: number };
export type Role = "Pemilik" | "Supervisor" | "Kasir";
export type Employee = { id: string; name: string; nickname: string; phone: string; role: Role; active: boolean; pinHash: string; onLeave?: boolean };
export type Payment = { method: "tunai" | "qris" | "kasbon"; amount: number; ref?: string };
export type StockMove = { id: string; ts: number; productId: string; qty: number; reason: string; cashierId?: string; audit?: boolean };
export type Product = {
  id: string; name: string; emoji: string; category: "Curah" | "Sembako" | "Minuman" | "Rokok" | "Jajan" | "Digital" | "Paket";
  baseUnit: string; stock: number; hpp: number; units: Unit[]; minStock: number; quick?: boolean;
   digital?: boolean; bundle?: { productId: string; qty: number }[]; barcode?: string; quickCode?: string; photo?: string; consignment?: boolean;
   expiry?: string; leadTime?: number; safetyStock?: number; market?: string; createdAt?: number;
};
export type CartItem = { productId: string; name: string; unit: string; factor: number; qty: number; price: number; hpp: number; listPrice?: number; manual?: boolean };
export type Sale = {
  id: string; ts: number; items: CartItem[]; subtotal: number; adjust: number; adjustNote?: string;
  total: number; paid: number; change: number; method: "tunai" | "qris" | "kasbon" | "split"; customerId?: string; shiftId?: string;
  payments?: Payment[]; cashierId?: string; cashierName?: string; deviceId?: string;
  voided?: { ts: number; by: string; reason: string }; manualDiscount?: number; limitOverrideBy?: string;
};
export type Customer = { id: string; name: string; phone: string; limit: number; payday: number; address?: string; landmark?: string; tag?: string; active?: boolean };
export type Ledger = { id: string; customerId: string; ts: number; desc: string; debit: number; credit: number };
export type Supplier = { id: string; name: string; phone: string };
export type Payable = { id: string; supplierId: string; ts: number; due: number; amount: number; paid: number; note: string };
export type Consign = { id: string; owner: string; phone: string; item: string; date: number; received: number; returned: number | null; sellPrice: number; ownerPrice: number; sold: number; settled: boolean; productId?: string; sisa?: number; basi?: number };
export type Prive = { id: string; ts: number; type: "tunai" | "barang"; amount: number; note: string; productId?: string; qty?: number };
export type CashMove = { id: string; ts: number; shiftId?: string; amount: number; kind: string; note: string };
export type Shift = { id: string; cashier: string; cashierId?: string; participants?: string[]; openedAt: number; opening: number; closedAt?: number; counted?: number; expected?: number; note?: string };
export type PpobTx = { id: string; ts: number; kind: "pulsa" | "data" | "token" | "ewallet" | "transfer" | "tagihan"; target: string; nominal: number; fee: number; cost: number; price: number; status: "sukses" | "pending" | "gagal" | "manual"; sn?: string; ref?: string; cashierId?: string; shiftId?: string };
export type TransferItem = { productId: string; barcode?: string; name: string; unit: string; qtyBase: number; hpp?: number; price?: number };
export type DepositMove = { id: string; ts: number; amount: number; note: string };
export type Transfer = { id: string; ts: number; fromStore: string; toStore: string; fromName: string; toName: string; status: "dikirim" | "diterima" | "dibatalkan"; items: TransferItem[]; note: string; receivedAt?: number };
export type Held = { id: string; label: string; ts: number; items: CartItem[] };
export type SaleReturn = { id: string; ts: number; saleId: string; productId: string; name: string; unit: string; qty: number; qtyBase: number; refund: number; cost: number; loss: number; kind: "retur" | "tukar"; by?: string };
export type AuditEntry = { id: string; ts: number; by: string; action: string; detail: string };
export const OPNAME_REASONS = ["Selisih hitung", "Basi / rusak / hama", "Susut timbangan", "Konsumsi rumah tangga"] as const;
export type OpnameReason = (typeof OPNAME_REASONS)[number];

export type State = {
  shopName: string; pin: string; products: Product[]; sales: Sale[]; customers: Customer[]; ledger: Ledger[];
  suppliers: Supplier[]; payables: Payable[]; consigns: Consign[]; prive: Prive[]; cash: CashMove[];
  shifts: Shift[]; held: Held[]; mockOffline: boolean; pendingSync: number;
  employees: Employee[]; stockMoves: StockMove[]; advisorEnabled: boolean; theme: "light" | "dark" | "contrast";
  shopping: { productId: string; qty: number; cost: number; checked: boolean }[];
  returns: SaleReturn[]; audit: AuditEntry[];
  deposit: number; depositMoves: DepositMove[]; ppob: PpobTx[]; transfers: Transfer[]; roundingStep: number; paperWidth: 58 | 80; savedAt?: number;
};

export const DAY = 86400000;
let seq = 0;
// akhiran acak per sesi supaya ID unik juga antar-perangkat saat sinkronisasi
const TAG = Math.random().toString(36).slice(2, 6);
export const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}${TAG}`;

function p(id: string, name: string, emoji: string, category: Product["category"], baseUnit: string, price: number, hpp: number, stock: number, minStock: number, extra: Partial<Product> = {}): Product {
  return { id, name, emoji, category, baseUnit, stock, hpp, minStock, units: [{ name: baseUnit, factor: 1, price }], ...extra };
}

export function makeSeed(): State {
  const now = Date.now();
  const products: Product[] = [
    p("gas", "Gas LPG 3kg", "🔥", "Curah", "tabung", 22000, 19000, 14, 5, { quick: true }),
    p("galon", "Isi Ulang Galon", "💧", "Curah", "galon", 6000, 3000, 40, 10, { quick: true }),
    p("beras", "Beras Medium", "🍚", "Curah", "kg", 14000, 12200, 48, 20, { quick: true, units: [{ name: "kg", factor: 1, price: 14000 }, { name: "karung 5kg", factor: 5, price: 68000 }] }),
    p("telur", "Telur Ayam", "🥚", "Curah", "kg", 29000, 26000, 12, 5, { quick: true, units: [{ name: "kg", factor: 1, price: 29000 }, { name: "1/2 kg", factor: 0.5, price: 15000 }, { name: "1/4 kg", factor: 0.25, price: 7500 }] }),
    p("es", "Es Batu", "🧊", "Curah", "bungkus", 2000, 800, 30, 10, { quick: true }),
    p("gula", "Gula Pasir", "🍬", "Curah", "kg", 18000, 16000, 3, 8, { quick: true, units: [{ name: "kg", factor: 1, price: 18000 }, { name: "1/2 kg", factor: 0.5, price: 9500 }] }),
    p("minyak", "Minyak Goreng 1L", "🫗", "Sembako", "pouch", 18500, 16500, 20, 6, { barcode: "8991001", units: [{ name: "pouch", factor: 1, price: 18500 }, { name: "dus (12)", factor: 12, price: 210000 }] }),
    p("indomie", "Mie Goreng", "🍜", "Sembako", "bks", 3500, 2850, 80, 40, { barcode: "8991002", quickCode: "03", units: [{ name: "bks", factor: 1, price: 3500 }, { name: "5 bks", factor: 5, price: 16500 }, { name: "dus (40)", factor: 40, price: 118000 }] }),
    p("kopi", "Kopi Sachet", "☕", "Sembako", "sachet", 1500, 1050, 9, 20, { barcode: "8991003", quickCode: "01", units: [{ name: "sachet", factor: 1, price: 1500 }, { name: "renteng (10)", factor: 10, price: 13500 }] }),
    p("sampo", "Sampo Sachet", "🧴", "Sembako", "sachet", 1000, 700, 60, 20, { quickCode: "02", units: [{ name: "sachet", factor: 1, price: 1000 }, { name: "renteng (12)", factor: 12, price: 11000 }] }),
    p("teh", "Teh Botol", "🧃", "Minuman", "btl", 5000, 3800, 24, 12, { barcode: "8991004", quickCode: "04", units: [{ name: "btl", factor: 1, price: 5000 }, { name: "dus (24)", factor: 24, price: 108000 }] }),
    p("air", "Air Mineral 600ml", "🥤", "Minuman", "btl", 3500, 2300, 36, 24, { barcode: "8991005" }),
    p("rokok", "Rokok Kretek 12", "🚬", "Rokok", "bks", 24000, 22000, 15, 10, { units: [{ name: "bks", factor: 1, price: 24000 }, { name: "slop (10)", factor: 10, price: 232000 }] }),
    p("permen", "Permen", "🍭", "Jajan", "pcs", 500, 250, 200, 50),
    p("biskuit", "Biskuit Kaleng", "🍪", "Jajan", "kaleng", 45000, 38000, 4, 1),
    p("sabun", "Sabun Batang", "🧼", "Sembako", "pcs", 4000, 3100, 18, 6),
    p("paket", "Paket Sarapan (Mie+Telur+Kopi)", "🎁", "Paket", "paket", 11500, 0, 0, 0, { bundle: [{ productId: "indomie", qty: 1 }, { productId: "telur", qty: 0.25 }, { productId: "kopi", qty: 1 }] }),
    p("pulsa10", "Pulsa 10rb", "📱", "Digital", "trx", 12000, 10200, 0, 0, { digital: true }),
    p("pulsa25", "Pulsa 25rb", "📱", "Digital", "trx", 27000, 25100, 0, 0, { digital: true }),
    p("token20", "Token PLN 20rb", "⚡", "Digital", "trx", 22500, 20300, 0, 0, { digital: true }),
    p("token50", "Token PLN 50rb", "⚡", "Digital", "trx", 52500, 50300, 0, 0, { digital: true }),
    p("ewallet", "Top Up E-Wallet 50rb", "💳", "Digital", "trx", 52000, 50000, 0, 0, { digital: true }),
  ];
  const sales: Sale[] = [];
  const pick = ["indomie", "galon", "gas", "kopi", "teh", "beras", "rokok", "air", "telur", "es", "pulsa10"];
  for (let d = 6; d >= 0; d--) {
    const n = 6 + ((d * 7) % 5);
    for (let i = 0; i < n; i++) {
      const pr = products.find((x) => x.id === pick[(d * 3 + i) % pick.length]);
      if (!pr) continue;
      const qty = 1 + ((i + d) % 3);
      const item: CartItem = { productId: pr.id, name: pr.name, unit: pr.baseUnit, factor: 1, qty, price: pr.units[0].price, hpp: pr.hpp };
      const total = item.price * qty;
      sales.push({ id: `s${d}-${i}`, ts: now - d * DAY - (i + 1) * 1800000, items: [item], subtotal: total, adjust: 0, total, paid: total, change: 0, method: i % 5 === 0 ? "qris" : "tunai" });
    }
  }
  return {
    shopName: "Warung Bu Sri", pin: "1234", products, sales,
    customers: [
      { id: "c1", name: "Bu Darmi", phone: "6281234567801", limit: 300000, payday: 25 },
      { id: "c2", name: "Pak Joko (Ojol)", phone: "6281234567802", limit: 150000, payday: 1 },
      { id: "c3", name: "Mbak Rina", phone: "6281234567803", limit: 200000, payday: 28 },
    ],
    ledger: [
      { id: "l1", customerId: "c1", ts: now - 10 * DAY, desc: "Beras 5kg + minyak", debit: 86500, credit: 0 },
      { id: "l2", customerId: "c1", ts: now - 5 * DAY, desc: "Cicilan tunai", debit: 0, credit: 40000 },
      { id: "l3", customerId: "c1", ts: now - 2 * DAY, desc: "Gas 3kg", debit: 22000, credit: 0 },
      { id: "l4", customerId: "c2", ts: now - 3 * DAY, desc: "Rokok + kopi", debit: 135000, credit: 0 },
    ],
    suppliers: [
      { id: "sp1", name: "Agen Sembako Makmur", phone: "6281300000001" },
      { id: "sp2", name: "Pangkalan Gas Pak Udin", phone: "6281300000002" },
      { id: "sp3", name: "Sales Minuman", phone: "6281300000003" },
    ],
    payables: [{ id: "py1", supplierId: "sp1", ts: now - 6 * DAY, due: now + 8 * DAY, amount: 850000, paid: 300000, note: "Kulakan mie & minyak" }],
    consigns: [
      { id: "k1", owner: "Bu Tini", phone: "6281400000001", item: "Kue Lapis", date: now - 1 * DAY, received: 20, returned: 4, sellPrice: 2500, ownerPrice: 2000, sold: 16, settled: true },
      { id: "k2", owner: "Bu Tini", phone: "6281400000001", item: "Kue Lapis", date: now, received: 20, returned: null, sellPrice: 2500, ownerPrice: 2000, sold: 0, settled: false },
      { id: "k3", owner: "Mak Ijah", phone: "6281400000002", item: "Gorengan", date: now, received: 30, returned: null, sellPrice: 1000, ownerPrice: 800, sold: 0, settled: false },
    ],
    prive: [{ id: "pv1", ts: now - 2 * DAY, type: "barang", amount: 24400, note: "Masak di rumah", productId: "beras", qty: 2 }],
    cash: [{ id: "cm1", ts: now - DAY, amount: -15000, kind: "beban", note: "Plastik kresek" }],
    shifts: [], held: [], mockOffline: false, pendingSync: 0,
    employees: [
      { id: "e1", name: "Bu Sri", nickname: "Sri", phone: "", role: "Pemilik", active: true, pinHash: "4fa49d4b73c49bf3139979b09e1a0195205aed09a7f097ff865f4e9fa928f913" },
      { id: "e2", name: "Siti", nickname: "Siti", phone: "", role: "Kasir", active: true, pinHash: "b1078fcc2f199432bd37e385c25b417b347ec5380257963b27546aab47c8d242" },
      { id: "e3", name: "Pak Budi", nickname: "Budi", phone: "", role: "Supervisor", active: true, pinHash: "b73c96f51a20fb5c4fd9a1ab27af83ca1115ad0a4ef7fed81ef123f81641e15e" },
    ], stockMoves: [], shopping: [], advisorEnabled: false, theme: "light", returns: [], audit: [], deposit: 0, depositMoves: [], ppob: [], transfers: [], roundingStep: 500, paperWidth: 58,
  };
}

const KEY = "pos-warung-v1";
let saveFailed = false;
let state: State | null = null;
let serverSeed: State | null = null;
const listeners = new Set<() => void>();

function load(): State {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? { ...makeSeed(), ...JSON.parse(raw) } : makeSeed();
  } catch { state = makeSeed(); }
  return state ?? makeSeed();
}
export function getState() { return typeof window === "undefined" ? (serverSeed ??= makeSeed()) : load(); }
const observers = new Set<(prev: State, next: State) => void>();
let applyingRemote = false;
let externalPending = false;
/** Dipanggil setelah setiap perubahan lokal (bukan perubahan dari server). Dipakai mesin sinkronisasi. */
export function onStateChange(fn: (prev: State, next: State) => void) { observers.add(fn); return () => { observers.delete(fn); }; }
/** Mesin sinkronisasi menandai bahwa jumlah antrean dihitung dari outbox, bukan simulasi. */
export function setCloudActive(on: boolean) { externalPending = on; }
export function setState(fn: (s: State) => Partial<State>) {
  const s = load();
  const patch = fn(s);
  const pendingSync = "pendingSync" in patch ? (patch.pendingSync as number) : s.mockOffline ? s.pendingSync + 1 : externalPending ? s.pendingSync : 0;
  state = { ...s, ...patch, pendingSync, savedAt: Date.now() };
  let lsOk = true;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { lsOk = false; }
  saveFailed = !lsOk && !idbAvailable();
  scheduleSnapshot(state, (ok) => { const bad = !lsOk && !ok; if (bad !== saveFailed) { saveFailed = bad; listeners.forEach((l) => l()); } });
  listeners.forEach((l) => l());
  if (!applyingRemote) observers.forEach((o) => o(s, state as State));
}
/** Terapkan data dari server tanpa memicu antrean kirim. */
export function applyRemote(fn: (s: State) => Partial<State>) {
  applyingRemote = true;
  try { setState(fn); } finally { applyingRemote = false; }
}
/** Muat snapshot IndexedDB bila lebih baru dari localStorage (mis. localStorage penuh atau dibersihkan). */
export async function hydrateFromIdb() {
  if (!idbAvailable()) return;
  const saved = await kvGet<State>("state");
  const cur = load();
  if (saved && (saved.savedAt ?? 0) > (cur.savedAt ?? 0)) { state = { ...makeSeed(), ...saved }; listeners.forEach((l) => l()); }
}
export function resetData() { state = makeSeed(); localStorage.setItem(KEY, JSON.stringify(state)); listeners.forEach((l) => l()); }

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => { listeners.add(l); const sync = (e: StorageEvent) => { if (e.key === KEY) { state = null; listeners.forEach((notify) => notify()); } }; window.addEventListener("storage", sync); return () => { listeners.delete(l); window.removeEventListener("storage", sync); }; },
    () => sel(load()),
    () => sel(serverSeed ??= makeSeed()),
  );
}

const subscribeSave = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
/** true bila penyimpanan browser penuh/ditolak sehingga data terbaru belum tersimpan. */
export function useSaveFailed() {
  return useSyncExternalStore(subscribeSave, () => saveFailed, () => false);
}

/* ---------- domain helpers ---------- */
export const activeShift = (s: State) => s.shifts.find((x) => !x.closedAt);
export const customerBalance = (s: State, id: string) => s.ledger.filter((l) => l.customerId === id).reduce((a, l) => a + l.debit - l.credit, 0);
export const productCost = (s: State, pr: Product): number =>
  pr.bundle ? pr.bundle.reduce((a, b) => a + (s.products.find((x) => x.id === b.productId)?.hpp ?? 0) * b.qty, 0) : pr.hpp;
export const bundleStock = (s: State, pr: Product) =>
  pr.bundle ? Math.floor(Math.min(...pr.bundle.map((b) => (s.products.find((x) => x.id === b.productId)?.stock ?? 0) / b.qty))) : pr.stock;

/** Moving average HPP: ((stok lama × HPP lama) + (qty baru × harga beli baru)) / (stok lama + qty baru) */
export function movingAverage(oldStock: number, oldHpp: number, qty: number, cost: number) {
  const total = Math.max(oldStock, 0) + qty;
  return total <= 0 ? cost : (Math.max(oldStock, 0) * oldHpp + qty * cost) / total;
}

/** Mutasi stok fisik untuk satu baris: barang biasa satu baris, paket diuraikan per komponen (stok = jumlah mutasi, dasar sinkronisasi antar-perangkat). */
export function moveRows(products: Product[], productId: string, qty: number, reason: string, cashierId?: string, ts = Date.now(), id?: string): StockMove[] {
  const pr = products.find((x) => x.id === productId);
  if (!pr || pr.digital) return [];
  if (pr.bundle) return pr.bundle.flatMap((b) => moveRows(products, b.productId, qty * b.qty, `${reason} · paket ${pr.name}`, cashierId, ts));
  return [{ id: id ?? uid(), ts, productId, qty, reason, cashierId }];
}

export function logAudit(s: State, by: Employee | undefined, action: string, detail: string, base: AuditEntry[] = s.audit): AuditEntry[] {
  return [...base, { id: uid(), ts: Date.now(), by: by?.nickname ?? "sistem", action, detail }];
}

export function addCash(s: State, amount: number, kind: string, note: string): CashMove[] {
  return [...s.cash, { id: uid(), ts: Date.now(), shiftId: activeShift(s)?.id, amount, kind, note }];
}

export function deduct(products: Product[], items: { productId: string; qty: number }[], sign = -1) {
  const map = new Map(products.map((x) => [x.id, { ...x }]));
  for (const it of items) {
    const pr = map.get(it.productId);
    if (!pr || pr.digital) continue;
    if (pr.bundle) pr.bundle.forEach((b) => { const c = map.get(b.productId); if (c) c.stock += sign * b.qty * it.qty; });
    else pr.stock += sign * it.qty;
  }
  return [...map.values()];
}

export const actions = {
  checkout(sale: Omit<Sale, "id" | "ts" | "shiftId">): Sale {
    const out: { sale?: Sale } = {};
    setState((s) => {
      const sh = activeShift(s);
      const employee = currentEmployee(s);
      if (!sh || !employee || !sh.participants?.includes(employee.id)) throw new Error("Pilih pegawai dan gabung shift terlebih dahulu");
      if (!sale.items.length) throw new Error("Keranjang kosong");
      const manual = sale.items.filter((i) => i.manual);
      if (manual.length && employee.role === "Kasir") throw new Error("Ubah harga membutuhkan supervisor atau pemilik");
      const manualDiscount = manual.reduce((a, i) => a + Math.max(0, (i.listPrice ?? i.price) - i.price) * i.qty, 0);
      const payments = sale.payments ?? [{ method: sale.method === "split" ? "tunai" : sale.method, amount: sale.total }];
      validatePayments(s, sale.total, payments, sale.customerId, !!sale.limitOverrideBy);
      const full: Sale = { ...sale, payments, manualDiscount, id: uid(), ts: Date.now(), shiftId: sh.id, cashierId: employee.id, cashierName: employee.nickname, deviceId: deviceId() };
      out.sale = full;
      const patch: Partial<State> = {
        sales: [...s.sales, full],
        products: deduct(s.products, sale.items.map((i) => ({ productId: i.productId, qty: i.qty * i.factor }))),
      };
      const cash = payments.filter((p) => p.method === "tunai").reduce((a, p) => a + p.amount, 0);
      const debt = payments.filter((p) => p.method === "kasbon").reduce((a, p) => a + p.amount, 0);
      if (cash) patch.cash = addCash(s, cash, "penjualan", `Penjualan · ${employee.nickname}`);
      if (debt && sale.customerId)
        patch.ledger = [...s.ledger, { id: uid(), customerId: sale.customerId, ts: Date.now(), desc: sale.items.map((i) => i.name).join(", ").slice(0, 60), debit: debt, credit: 0 }];
      patch.stockMoves = [...s.stockMoves, ...sale.items.flatMap((i) => moveRows(s.products, i.productId, -i.qty * i.factor, "Penjualan", employee.id)).map((m) => ({ ...m, audit: (patch.products?.find((p) => p.id === m.productId)?.stock ?? 0) < 0 }))];
      if (manual.length) patch.audit = manual.reduce((base, i) => logAudit(s, employee, "Ubah harga di kasir", `${i.name}: ${i.listPrice ?? i.price} → ${i.price} (nota ${full.id})`, base), s.audit);
      return patch;
    });
    if (!out.sale) throw new Error("Transaksi gagal disimpan");
    return out.sale;
  },
  /** Retur uang kembali ("retur") atau tukar barang rusak dengan yang baru ("tukar"), satu satuan per ketukan, dibatasi sesuai nota. */
  returnItem(saleId: string, productId: string, unit: string, kind: "retur" | "tukar") {
    requireLocalRole(["Supervisor", "Pemilik"]);
    setState((s) => {
      const sale = s.sales.find((x) => x.id === saleId);
      if (!sale || sale.voided) throw new Error("Nota tidak ditemukan atau sudah dibatalkan");
      const lines = sale.items.filter((i) => i.productId === productId && i.unit === unit);
      const line = lines[0];
      if (!line) throw new Error("Barang tidak ada di nota ini");
      const sold = lines.reduce((a, i) => a + i.qty, 0);
      const done = s.returns.filter((r) => r.saleId === saleId && r.productId === productId && r.unit === unit).reduce((a, r) => a + r.qty, 0);
      const qty = Math.min(1, sold - done);
      if (qty <= 0) throw new Error("Barang ini sudah diretur seluruhnya");
      const employee = currentEmployee(s);
      const pr = s.products.find((x) => x.id === productId);
      const qtyBase = qty * line.factor;
      const refund = kind === "retur" ? line.price * qty : 0;
      if (refund > 0 && !activeShift(s)) throw new Error("Buka shift dahulu untuk mengembalikan uang dari laci");
      const cost = line.hpp * qty;
      const stockless = !pr || !!pr.digital;
      const delta = kind === "retur" ? qtyBase : -qtyBase;
      const now = Date.now();
      const rec: SaleReturn = { id: uid(), ts: now, saleId, productId, name: line.name, unit, qty, qtyBase, refund, cost: kind === "retur" ? cost : 0, loss: kind === "tukar" ? cost : 0, kind, by: employee?.nickname };
      return {
        returns: [...s.returns, rec],
        products: stockless ? s.products : deduct(s.products, [{ productId, qty: delta }], 1),
        stockMoves: stockless ? s.stockMoves : [...s.stockMoves, ...moveRows(s.products, productId, delta, kind === "retur" ? "Retur pelanggan" : "Tukar barang", employee?.id, now)],
        cash: refund ? addCash(s, -refund, "retur", `Retur ${line.name} · ${sale.id}`) : s.cash,
        audit: logAudit(s, employee, kind === "retur" ? "Retur" : "Tukar barang", `${line.name} 1 ${unit} · nota ${sale.id}`),
      };
    });
  },
  /** Batalkan nota: stok kembali, uang tunai keluar dari laci, kasbon dibalik, tercatat di audit. */
  voidSale(saleId: string, reason: string) {
    requireLocalRole(["Supervisor", "Pemilik"]);
    if (!reason.trim()) throw new Error("Alasan pembatalan wajib diisi");
    setState((s) => {
      const sale = s.sales.find((x) => x.id === saleId);
      if (!sale) throw new Error("Nota tidak ditemukan");
      if (sale.voided) throw new Error("Nota sudah dibatalkan");
      if (s.returns.some((r) => r.saleId === saleId)) throw new Error("Nota sudah punya retur atau tukar; tidak dapat dibatalkan");
      const employee = currentEmployee(s);
      const payments = sale.payments ?? [{ method: sale.method === "split" ? "tunai" : sale.method, amount: sale.total }];
      const cash = payments.filter((p) => p.method === "tunai").reduce((a, p) => a + p.amount, 0);
      const debt = payments.filter((p) => p.method === "kasbon").reduce((a, p) => a + p.amount, 0);
      if (cash && !activeShift(s)) throw new Error("Buka shift dahulu untuk mengembalikan uang tunai dari laci");
      const now = Date.now();
      const physical = sale.items.filter((i) => !s.products.find((p) => p.id === i.productId)?.digital);
      return {
        sales: s.sales.map((x) => (x.id === saleId ? { ...x, voided: { ts: now, by: employee?.nickname ?? "sistem", reason: reason.trim() } } : x)),
        products: deduct(s.products, sale.items.map((i) => ({ productId: i.productId, qty: i.qty * i.factor })), 1),
        stockMoves: [...s.stockMoves, ...physical.flatMap((i) => moveRows(s.products, i.productId, i.qty * i.factor, "Void nota", employee?.id, now))],
        cash: cash ? addCash(s, -cash, "void", `Batal nota ${sale.id}`) : s.cash,
        ledger: debt && sale.customerId ? [...s.ledger, { id: uid(), customerId: sale.customerId, ts: now, desc: `Batal nota ${sale.id}`, debit: 0, credit: debt }] : s.ledger,
        audit: logAudit(s, employee, "Void nota", `${sale.id} · total ${Math.round(sale.total)} · ${reason.trim()}`),
      };
    });
  },
  /** Stock opname: setel stok sesuai hitung fisik dengan alasan wajib; selalu menulis mutasi stok dan audit. */
  adjustStock(productId: string, physical: number, reason: OpnameReason, note: string) {
    requireLocalRole(["Supervisor", "Pemilik"]);
    if (!Number.isFinite(physical) || physical < 0) throw new Error("Stok fisik tidak valid");
    setState((s) => {
      const pr = s.products.find((x) => x.id === productId);
      if (!pr || pr.digital || pr.bundle) throw new Error("Barang ini tidak dapat disesuaikan");
      const diff = physical - pr.stock;
      if (diff === 0) throw new Error("Stok fisik sama dengan stok sistem");
      if (reason === "Konsumsi rumah tangga" && diff > 0) throw new Error("Konsumsi rumah tangga hanya untuk pengurangan stok");
      const employee = currentEmployee(s);
      const now = Date.now();
      const patch: Partial<State> = {
        products: s.products.map((x) => (x.id === productId ? { ...x, stock: physical } : x)),
        stockMoves: [...s.stockMoves, { id: uid(), ts: now, productId, qty: diff, reason: `Opname · ${reason}`, cashierId: employee?.id }],
        audit: logAudit(s, employee, "Stock opname", `${pr.name}: ${pr.stock} → ${physical} (${reason}${note.trim() ? `; ${note.trim()}` : ""})`),
      };
      if (reason === "Konsumsi rumah tangga") patch.prive = [...s.prive, { id: uid(), ts: now, type: "barang", amount: pr.hpp * -diff, note: `Opname: ${note.trim() || reason}`, productId, qty: -diff }];
      return patch;
    });
  },
  hold(label: string, items: CartItem[]) { setState((s) => { if (s.held.length >= 5) throw new Error("Maksimal 5 keranjang diparkir"); return { held: [...s.held, { id: uid(), label, ts: Date.now(), items }] }; }); },
  unhold(id: string) { setState((s) => ({ held: s.held.filter((h) => h.id !== id) })); },
  openShift(cashier: string, opening: number) { setState((s) => { const e = currentEmployee(s); if (!e || activeShift(s)) throw new Error("Shift sudah aktif atau pegawai belum masuk"); if (!Number.isFinite(opening) || opening < 0) throw new Error("Modal awal tidak valid"); return { shifts: [...s.shifts, { id: uid(), cashier: e.nickname, cashierId: e.id, participants: [e.id], opening, openedAt: Date.now() }] }; }); },
  joinShift() { setState((s) => { const e = currentEmployee(s); const sh = activeShift(s); if (!e || !sh) throw new Error("Shift belum aktif"); return { shifts: s.shifts.map((x) => x.id === sh.id ? { ...x, participants: [...new Set([...(x.participants ?? []), e.id])] } : x) }; }); },
  closeShift(counted: number, expected: number, note = "") {
    setState((s) => { const sh = activeShift(s); if (!sh || currentEmployee(s)?.id !== sh.cashierId) throw new Error("Hanya penanggung jawab dapat menutup laci"); if (s.held.length) throw new Error("Selesaikan keranjang diparkir dahulu"); const exp = expectedCash(s, sh); if (Math.round(counted) !== Math.round(exp) && !note.trim()) throw new Error("Tulis alasan selisih kas dahulu"); return { shifts: s.shifts.map((x) => (x.closedAt ? x : { ...x, closedAt: Date.now(), counted, expected: exp, note: note.trim() || undefined })) }; });
  },
  saveProduct(pr: Product) {
    requireLocalRole(["Pemilik"]);
    setState((s) => {
      const old = s.products.find((x) => x.id === pr.id);
      const employee = currentEmployee(s);
      const prices = (p: Product) => p.units.map((u) => `${u.name} ${u.price}`).join(", ");
      let audit = s.audit; let stockMoves = s.stockMoves;
      if (!old) {
        if (pr.stock) stockMoves = [...stockMoves, { id: uid(), ts: Date.now(), productId: pr.id, qty: pr.stock, reason: "Stok awal", cashierId: employee?.id }];
        audit = logAudit(s, employee, "Tambah produk", pr.name, audit);
      } else {
        if (prices(old) !== prices(pr)) audit = logAudit(s, employee, "Ubah harga jual", `${pr.name}: ${prices(old)} → ${prices(pr)}`, audit);
        if (Math.round(old.hpp) !== Math.round(pr.hpp)) audit = logAudit(s, employee, "Ubah HPP", `${pr.name}: ${Math.round(old.hpp)} → ${Math.round(pr.hpp)}`, audit);
      }
      const next: Product = old ? { ...pr, stock: old.stock } : { ...pr, createdAt: Date.now() };
      return { products: old ? s.products.map((x) => (x.id === pr.id ? next : x)) : [...s.products, next], stockMoves, audit };
    });
  },
  deleteProduct(id: string) {
    requireLocalRole(["Pemilik"]);
    setState((s) => ({ products: s.products.filter((x) => x.id !== id), audit: logAudit(s, currentEmployee(s), "Hapus produk", s.products.find((x) => x.id === id)?.name ?? id) }));
  },
  receive(productId: string, qtyBase: number, totalCost: number, tempo?: { supplierId: string; days: number }) {
    requireLocalRole(["Supervisor", "Pemilik"]);
    setState((s) => {
      const products = s.products.map((x) => x.id === productId ? { ...x, hpp: movingAverage(x.stock, x.hpp, qtyBase, totalCost / qtyBase), stock: x.stock + qtyBase } : x);
      const name = s.products.find((x) => x.id === productId)?.name ?? "";
       const stockMoves = [...s.stockMoves, { id: uid(), ts: Date.now(), productId, qty: qtyBase, reason: "Kulakan", cashierId: currentEmployee(s)?.id }];
       if (tempo) return { products, stockMoves, payables: [...s.payables, { id: uid(), supplierId: tempo.supplierId, ts: Date.now(), due: Date.now() + tempo.days * DAY, amount: totalCost, paid: 0, note: `Kulakan ${name}` }] };
       return { products, stockMoves, cash: addCash(s, -totalCost, "kulakan", `Kulakan ${name}`) };
    });
  },
  payPayable(id: string, amount: number) {
    requireLocalRole(["Supervisor", "Pemilik"]);
    setState((s) => ({ payables: s.payables.map((x) => (x.id === id ? { ...x, paid: x.paid + amount } : x)), cash: addCash(s, -amount, "bayar hutang", "Bayar supplier") }));
  },
  addConsign(c: Omit<Consign, "id" | "date" | "returned" | "sold" | "settled">) {
    setState((s) => ({ consigns: [...s.consigns, { ...c, id: uid(), date: Date.now(), returned: null, sold: 0, settled: false }] }));
  },
  settleConsign(id: string, returned: number) {
    setState((s) => {
       const c = s.consigns.find((x) => x.id === id);
       if (!c || c.settled) return {};
      const sold = Math.max(0, c.received - returned);
      return {
        consigns: s.consigns.map((x) => (x.id === id ? { ...x, returned, sold, settled: true } : x)),
        cash: addCash({ ...s, cash: addCash(s, sold * c.sellPrice, "konsinyasi", `Jual titipan ${c.item}`) }, -sold * c.ownerPrice, "bagi hasil", `Setor ${c.owner}`),
      };
    });
  },
  addCustomer(c: Omit<Customer, "id">) { setState((s) => ({ customers: [...s.customers, { ...c, id: uid() }] })); },
  payDebt(customerId: string, amount: number) {
    setState((s) => ({ ledger: [...s.ledger, { id: uid(), customerId, ts: Date.now(), desc: "Pembayaran / cicilan", debit: 0, credit: amount }], cash: addCash(s, amount, "kasbon masuk", "Cicilan kasbon") }));
  },
  addPrive(pv: Omit<Prive, "id" | "ts">) {
    requireLocalRole(["Pemilik"]);
    setState((s) => {
      const employee = currentEmployee(s);
      const base: Partial<State> = { prive: [...s.prive, { ...pv, id: uid(), ts: Date.now() }], audit: logAudit(s, employee, pv.type === "tunai" ? "Prive tunai" : "Prive barang", `${pv.note} · ${Math.round(pv.amount)}`) };
      if (pv.type === "tunai") return { ...base, cash: addCash(s, -pv.amount, "prive", pv.note) };
      if (pv.productId && pv.qty) return { ...base, products: deduct(s.products, [{ productId: pv.productId, qty: pv.qty }]), stockMoves: [...s.stockMoves, ...moveRows(s.products, pv.productId, -pv.qty, "Prive barang", employee?.id)] };
      return base;
    });
  },
  addCash(amount: number, kind: string, note: string) { setState((s) => ({ cash: addCash(s, amount, kind, note) })); },
  toggleOffline() { setState((s) => ({ mockOffline: !s.mockOffline })); },
  setPin(pin: string) { setState(() => ({ pin })); },
};

export function expectedCash(s: State, sh: Shift) {
  return sh.opening + s.cash.filter((c) => c.shiftId === sh.id).reduce((a, c) => a + c.amount, 0);
}

export function currentEmployee(s = getState()) {
  if (typeof window === "undefined") return undefined;
  return s.employees.find((e) => e.id === sessionStorage.getItem("employee") && e.active);
}
export function requireLocalRole(roles: Role[]) {
  const e = currentEmployee();
  if (!e || !roles.includes(e.role)) throw new Error("Pegawai tidak berwenang untuk tindakan ini");
}
export function deviceId() {
  let id = sessionStorage.getItem("device");
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem("device", id); }
  return id;
}
export async function hashPin(pin: string) {
  const bytes = new TextEncoder().encode(`warung-local-pin:${pin}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
/** Kait verifikasi PIN di server (mode cloud). null = server tidak terjangkau, pakai hash lokal. */
export type PinHooks = { verify: (employeeId: string, pin: string) => Promise<boolean | null>; set: (employeeId: string, pin: string) => Promise<void> };
let pinHooks: PinHooks | null = null;
export function setPinHooks(h: PinHooks | null) { pinHooks = h; }
export async function loginEmployee(id: string, pin: string, roles?: Role[]) {
  const hash = await hashPin(pin);
  if (pinHooks) {
    const remote = await pinHooks.verify(id, pin).catch(() => null);
    if (remote === false) throw new Error("PIN salah atau pegawai tidak berwenang");
    if (remote === true) {
      const emp = getState().employees.find((x) => x.id === id);
      if (emp && emp.pinHash !== hash) applyRemote((s) => ({ employees: s.employees.map((x) => (x.id === id ? { ...x, pinHash: hash } : x)) }));
    }
  }
  const found = getState().employees.find((x) => x.id === id);
  if (found?.onLeave) throw new Error("Pegawai sedang cuti");
  const e = getState().employees.find((x) => x.id === id && x.active && x.pinHash === hash && (!roles || roles.includes(x.role)));
  if (!e) throw new Error("PIN salah atau pegawai tidak berwenang");
  sessionStorage.setItem("employee", e.id);
  if (e.role === "Pemilik") sessionStorage.setItem("owner", e.id);
  else sessionStorage.removeItem("owner");
  listeners.forEach((l) => l());
  return e;
}
export async function saveEmployee(employee: Employee, pin: string) {
  if (currentEmployee()?.role !== "Pemilik") throw new Error("Hanya pemilik boleh mengelola pegawai");
  if (pin && !/^\d{4,6}$/.test(pin)) throw new Error("PIN harus 4–6 digit");
  const pinHash = pin ? await hashPin(pin) : employee.pinHash;
  if (!pinHash || getState().employees.some((x) => x.id !== employee.id && x.pinHash === pinHash)) throw new Error("PIN wajib unik per pegawai");
  if (!employee.name.trim() || !employee.nickname.trim()) throw new Error("Nama dan panggilan wajib diisi");
  setState((s) => {
    const employees = s.employees.some((e) => e.id === employee.id) ? s.employees.map((e) => e.id === employee.id ? { ...employee, pinHash } : e) : [...s.employees, { ...employee, pinHash }];
    if (!employees.some((e) => e.active && e.role === "Pemilik")) throw new Error("Harus ada minimal satu pemilik aktif");
    return { employees };
  });
  if (pin && pinHooks) await pinHooks.set(employee.id, pin).catch(() => { throw new Error("PIN tersimpan di perangkat ini tetapi belum ke server (offline?). Simpan ulang saat online."); });
}
export function validatePayments(s: State, total: number, payments: Payment[], customerId?: string, allowOverLimit = false) {
  if (!payments.length || !Number.isFinite(total) || total < 0 || payments.some((p) => !Number.isFinite(p.amount) || p.amount < 0) || Math.abs(payments.reduce((a, p) => a + p.amount, 0) - total) > .001) throw new Error("Jumlah pembayaran harus sama dengan total belanja");
  const debt = payments.filter((p) => p.method === "kasbon").reduce((a, p) => a + p.amount, 0);
  if (debt) {
    const c = s.customers.find((c) => c.id === customerId);
    if (!c) throw new Error("Pilih pelanggan kasbon");
    if (!allowOverLimit && customerBalance(s, c.id) + debt > c.limit) throw new Error("Kasbon melebihi limit pelanggan");
  }
}
