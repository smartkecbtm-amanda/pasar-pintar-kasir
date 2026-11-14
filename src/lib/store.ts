import { useSyncExternalStore } from "react";

export type Unit = { name: string; factor: number; price: number };
export type Role = "Pemilik" | "Supervisor" | "Kasir";
export type Employee = { id: string; name: string; nickname: string; phone: string; role: Role; active: boolean; pinHash: string };
export type Payment = { method: "tunai" | "qris" | "kasbon"; amount: number };
export type StockMove = { id: string; ts: number; productId: string; qty: number; reason: string; cashierId?: string; audit?: boolean };
export type Product = {
  id: string; name: string; emoji: string; category: "Curah" | "Sembako" | "Minuman" | "Rokok" | "Jajan" | "Digital" | "Paket";
  baseUnit: string; stock: number; hpp: number; units: Unit[]; minStock: number; quick?: boolean;
   digital?: boolean; bundle?: { productId: string; qty: number }[]; barcode?: string;
   expiry?: string; leadTime?: number; safetyStock?: number; market?: string; createdAt?: number;
};
export type CartItem = { productId: string; name: string; unit: string; factor: number; qty: number; price: number; hpp: number };
export type Sale = {
  id: string; ts: number; items: CartItem[]; subtotal: number; adjust: number; adjustNote?: string;
  total: number; paid: number; change: number; method: "tunai" | "qris" | "kasbon" | "split"; customerId?: string; shiftId?: string;
  payments?: Payment[]; cashierId?: string; cashierName?: string; deviceId?: string;
};
export type Customer = { id: string; name: string; phone: string; limit: number; payday: number };
export type Ledger = { id: string; customerId: string; ts: number; desc: string; debit: number; credit: number };
export type Supplier = { id: string; name: string; phone: string };
export type Payable = { id: string; supplierId: string; ts: number; due: number; amount: number; paid: number; note: string };
export type Consign = { id: string; owner: string; phone: string; item: string; date: number; received: number; returned: number | null; sellPrice: number; ownerPrice: number; sold: number; settled: boolean };
export type Prive = { id: string; ts: number; type: "tunai" | "barang"; amount: number; note: string; productId?: string; qty?: number };
export type CashMove = { id: string; ts: number; shiftId?: string; amount: number; kind: string; note: string };
export type Shift = { id: string; cashier: string; cashierId?: string; participants?: string[]; openedAt: number; opening: number; closedAt?: number; counted?: number; expected?: number };
export type Held = { id: string; label: string; ts: number; items: CartItem[] };

export type State = {
  shopName: string; pin: string; products: Product[]; sales: Sale[]; customers: Customer[]; ledger: Ledger[];
  suppliers: Supplier[]; payables: Payable[]; consigns: Consign[]; prive: Prive[]; cash: CashMove[];
  shifts: Shift[]; held: Held[]; mockOffline: boolean; pendingSync: number;
  employees: Employee[]; stockMoves: StockMove[]; advisorEnabled: boolean; theme: "light" | "dark" | "contrast";
  shopping: { productId: string; qty: number; cost: number; checked: boolean }[];
};

const DAY = 86400000;
let seq = 0;
export const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

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
    p("indomie", "Mie Goreng", "🍜", "Sembako", "bks", 3500, 2850, 80, 40, { barcode: "8991002", units: [{ name: "bks", factor: 1, price: 3500 }, { name: "5 bks", factor: 5, price: 16500 }, { name: "dus (40)", factor: 40, price: 118000 }] }),
    p("kopi", "Kopi Sachet", "☕", "Sembako", "sachet", 1500, 1050, 9, 20, { barcode: "8991003", units: [{ name: "sachet", factor: 1, price: 1500 }, { name: "renteng (10)", factor: 10, price: 13500 }] }),
    p("sampo", "Sampo Sachet", "🧴", "Sembako", "sachet", 1000, 700, 60, 20, { units: [{ name: "sachet", factor: 1, price: 1000 }, { name: "renteng (12)", factor: 12, price: 11000 }] }),
    p("teh", "Teh Botol", "🧃", "Minuman", "btl", 5000, 3800, 24, 12, { barcode: "8991004", units: [{ name: "btl", factor: 1, price: 5000 }, { name: "dus (24)", factor: 24, price: 108000 }] }),
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
    ], stockMoves: [], shopping: [], advisorEnabled: false, theme: "light",
  };
}

const KEY = "pos-warung-v1";
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
export function setState(fn: (s: State) => Partial<State>) {
  const s = load();
  const patch = fn(s);
  state = { ...s, ...patch, pendingSync: s.mockOffline ? s.pendingSync + 1 : 0 };
  if ("mockOffline" in patch) state.pendingSync = patch.mockOffline ? s.pendingSync : 0;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}
export function resetData() { state = makeSeed(); localStorage.setItem(KEY, JSON.stringify(state)); listeners.forEach((l) => l()); }

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => { listeners.add(l); const sync = (e: StorageEvent) => { if (e.key === KEY) { state = null; listeners.forEach((notify) => notify()); } }; window.addEventListener("storage", sync); return () => { listeners.delete(l); window.removeEventListener("storage", sync); }; },
    () => sel(load()),
    () => sel(serverSeed ??= makeSeed()),
  );
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

function addCash(s: State, amount: number, kind: string, note: string): CashMove[] {
  return [...s.cash, { id: uid(), ts: Date.now(), shiftId: activeShift(s)?.id, amount, kind, note }];
}

function deduct(products: Product[], items: { productId: string; qty: number }[], sign = -1) {
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
  checkout(sale: Omit<Sale, "id" | "ts" | "shiftId">) {
    setState((s) => {
      const sh = activeShift(s);
      const employee = currentEmployee(s);
      if (!sh || !employee || !sh.participants?.includes(employee.id)) throw new Error("Pilih pegawai dan gabung shift terlebih dahulu");
      const payments = sale.payments ?? [{ method: sale.method === "split" ? "tunai" : sale.method, amount: sale.total }];
      validatePayments(s, sale.total, payments, sale.customerId);
      const full: Sale = { ...sale, payments, id: uid(), ts: Date.now(), shiftId: sh.id, cashierId: employee.id, cashierName: employee.nickname, deviceId: deviceId() };
      const patch: Partial<State> = {
        sales: [...s.sales, full],
        products: deduct(s.products, sale.items.map((i) => ({ productId: i.productId, qty: i.qty * i.factor }))),
      };
      const cash = payments.filter((p) => p.method === "tunai").reduce((a, p) => a + p.amount, 0);
      const debt = payments.filter((p) => p.method === "kasbon").reduce((a, p) => a + p.amount, 0);
      if (cash) patch.cash = addCash(s, cash, "penjualan", `Penjualan · ${employee.nickname}`);
      if (debt && sale.customerId)
        patch.ledger = [...s.ledger, { id: uid(), customerId: sale.customerId, ts: Date.now(), desc: sale.items.map((i) => i.name).join(", ").slice(0, 60), debit: debt, credit: 0 }];
      patch.stockMoves = [...s.stockMoves, ...sale.items.filter((i) => !s.products.find((p) => p.id === i.productId)?.digital).map((i) => ({ id: uid(), ts: Date.now(), productId: i.productId, qty: -i.qty * i.factor, reason: "Penjualan", cashierId: employee.id, audit: (patch.products?.find((p) => p.id === i.productId)?.stock ?? 0) < 0 }))];
      return patch;
    });
  },
  retur(productId: string, qtyBase: number, refund: number, note: string) {
    setState((s) => ({ products: deduct(s.products, [{ productId, qty: qtyBase }], 1), cash: refund ? addCash(s, -refund, "retur", note) : s.cash }));
  },
  hold(label: string, items: CartItem[]) { setState((s) => { if (s.held.length >= 5) throw new Error("Maksimal 5 keranjang diparkir"); return { held: [...s.held, { id: uid(), label, ts: Date.now(), items }] }; }); },
  unhold(id: string) { setState((s) => ({ held: s.held.filter((h) => h.id !== id) })); },
  openShift(cashier: string, opening: number) { setState((s) => { const e = currentEmployee(s); if (!e || activeShift(s)) throw new Error("Shift sudah aktif atau pegawai belum masuk"); if (!Number.isFinite(opening) || opening < 0) throw new Error("Modal awal tidak valid"); return { shifts: [...s.shifts, { id: uid(), cashier: e.nickname, cashierId: e.id, participants: [e.id], opening, openedAt: Date.now() }] }; }); },
  joinShift() { setState((s) => { const e = currentEmployee(s); const sh = activeShift(s); if (!e || !sh) throw new Error("Shift belum aktif"); return { shifts: s.shifts.map((x) => x.id === sh.id ? { ...x, participants: [...new Set([...(x.participants ?? []), e.id])] } : x) }; }); },
  closeShift(counted: number, expected: number) {
    setState((s) => { const sh = activeShift(s); if (!sh || currentEmployee(s)?.id !== sh.cashierId) throw new Error("Hanya penanggung jawab dapat menutup laci"); if (s.held.length) throw new Error("Selesaikan keranjang diparkir dahulu"); return { shifts: s.shifts.map((x) => (x.closedAt ? x : { ...x, closedAt: Date.now(), counted, expected: expectedCash(s, x) })) }; });
  },
  saveProduct(pr: Product) { setState((s) => ({ products: s.products.some((x) => x.id === pr.id) ? s.products.map((x) => (x.id === pr.id ? pr : x)) : [...s.products, pr] })); },
  deleteProduct(id: string) { setState((s) => ({ products: s.products.filter((x) => x.id !== id) })); },
  receive(productId: string, qtyBase: number, totalCost: number, tempo?: { supplierId: string; days: number }) {
    setState((s) => {
      const products = s.products.map((x) => x.id === productId ? { ...x, hpp: movingAverage(x.stock, x.hpp, qtyBase, totalCost / qtyBase), stock: x.stock + qtyBase } : x);
      const name = s.products.find((x) => x.id === productId)?.name ?? "";
      if (tempo) return { products, payables: [...s.payables, { id: uid(), supplierId: tempo.supplierId, ts: Date.now(), due: Date.now() + tempo.days * DAY, amount: totalCost, paid: 0, note: `Kulakan ${name}` }] };
      return { products, cash: addCash(s, -totalCost, "kulakan", `Kulakan ${name}`) };
    });
  },
  payPayable(id: string, amount: number) {
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
    setState((s) => ({
      prive: [...s.prive, { ...pv, id: uid(), ts: Date.now() }],
       ...(pv.type === "tunai" ? { cash: addCash(s, -pv.amount, "prive", pv.note) } : pv.productId && pv.qty ? { products: deduct(s.products, [{ productId: pv.productId, qty: pv.qty }]) } : {}),
    }));
  },
  addCash(amount: number, kind: string, note: string) { setState((s) => ({ cash: addCash(s, amount, kind, note) })); },
  toggleOffline() { setState((s) => ({ mockOffline: !s.mockOffline })); },
  setPin(pin: string) { setState(() => ({ pin })); },
};

export function expectedCash(s: State, sh: Shift) {
  return sh.opening + s.cash.filter((c) => c.shiftId === sh.id).reduce((a, c) => a + c.amount, 0);
}
