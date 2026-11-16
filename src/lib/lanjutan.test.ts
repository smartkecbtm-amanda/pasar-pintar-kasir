import { beforeEach, describe, expect, it } from "vitest";
import { actions, getState, loginEmployee, resetData, setState, type CartItem, type Product } from "./store";
import { actionsPlus } from "./store-extra";
import { dayStats, formatStock, kasbonDue, kasbonStatus, peakHours, topProducts } from "./operations";

const as = (id: string) => sessionStorage.setItem("employee", id);
const prod = (id: string) => getState().products.find((p) => p.id === id) as Product;
const stock = (id: string) => prod(id).stock;
const item = (productId: string, name: string, qty: number, price: number, hpp: number): CartItem => ({ productId, name, unit: "pcs", factor: 1, qty, price, hpp });
const sellItem = (i: CartItem) => actions.checkout({ items: [i], subtotal: i.qty * i.price, adjust: 0, total: i.qty * i.price, paid: i.qty * i.price, change: 0, method: "tunai" });
const startShift = () => { as("e1"); actions.openShift("", 100000); };
const failed = async (fn: () => Promise<unknown>) => { try { await fn(); return false; } catch { return true; } };

describe("Fase 1 lanjutan", () => {
  beforeEach(() => { resetData(); sessionStorage.clear(); });

  it("pegawai cuti tidak bisa masuk dan pemilik terakhir tidak boleh cuti", async () => {
    as("e1");
    actionsPlus.setLeave("e2", true);
    expect(await failed(() => loginEmployee("e2", "0000"))).toBe(true);
    expect(() => actionsPlus.setLeave("e1", true)).toThrow();
    actionsPlus.setLeave("e2", false);
    expect(getState().employees.find((e) => e.id === "e2")?.onLeave).toBe(false);
  });

  it("pemilik lupa PIN: pulihkan dengan PIN utama toko", async () => {
    expect(await failed(() => actionsPlus.recoverOwnerPin("0000", "e1", "7777"))).toBe(true);
    expect(await failed(() => actionsPlus.recoverOwnerPin("1234", "e2", "7777"))).toBe(true);
    await actionsPlus.recoverOwnerPin("1234", "e1", "7777");
    expect((await loginEmployee("e1", "7777")).id).toBe("e1");
    expect(await actionsPlus.verifyOwnerPin("7777")).not.toBe(null);
    expect(await actionsPlus.verifyOwnerPin("0001")).toBe(null);
  });

  it("kulakan banyak barang: HPP rata-rata, bayar sebagian, sisa jadi hutang tempo", () => {
    startShift();
    const kopi = prod("kopi"), beras = prod("beras");
    actionsPlus.receiveInvoice({
      invoiceNo: "F-001", supplierId: getState().suppliers[0].id, payment: "tempo", dueDays: 14, paidNow: 20000,
      lines: [{ productId: "kopi", unitName: "sachet", qty: 20, unitCost: 1200 }, { productId: "beras", unitName: "kg", qty: 10, unitCost: 13000 }],
    });
    expect(stock("kopi")).toBe(kopi.stock + 20);
    expect(stock("beras")).toBe(beras.stock + 10);
    const hppKopi = (kopi.stock * kopi.hpp + 20 * 1200) / (kopi.stock + 20);
    expect(Math.round(prod("kopi").hpp)).toBe(Math.round(hppKopi));
    expect(getState().cash.at(-1)?.amount).toBe(-20000);
    expect(getState().payables.at(-1)?.amount).toBe(20 * 1200 + 10 * 13000 - 20000);
    actionsPlus.receiveInvoice({ invoiceNo: "F-002", payment: "bank", lines: [{ productId: "kopi", unitName: "sachet", qty: 1, unitCost: 1000 }] });
    expect(getState().cash.at(-1)?.amount).toBe(-20000);
  });

  it("retur ke supplier memotong hutang atau mengembalikan uang ke laci", () => {
    startShift();
    actionsPlus.receiveInvoice({ invoiceNo: "F-9", supplierId: getState().suppliers[0].id, payment: "tempo", lines: [{ productId: "kopi", unitName: "sachet", qty: 10, unitCost: 1000 }] });
    const pay = getState().payables.at(-1)!;
    const before = stock("kopi");
    actionsPlus.returnPurchase("kopi", 4, 1000, "potong_hutang", pay.id, "bocor");
    expect(stock("kopi")).toBe(before - 4);
    expect(getState().payables.at(-1)?.amount).toBe(10000 - 4000);
    actionsPlus.returnPurchase("kopi", 1, 1000, "uang_kembali", undefined, "");
    expect(getState().cash.at(-1)?.amount).toBe(1000);
    expect(() => actionsPlus.returnPurchase("kopi", 1, 1000, "potong_hutang", "tidak-ada", "")).toThrow();
  });

  it("repacking: stok induk turun, stok anak naik, HPP kemasan, susut tercatat", () => {
    as("e1");
    actions.saveProduct({ id: "b1kg", name: "Beras 1 Kg", emoji: "🍚", category: "Sembako", baseUnit: "kantong", stock: 0, hpp: 0, units: [{ name: "kantong", factor: 1, price: 14000 }], minStock: 5 });
    const hppBeras = prod("beras").hpp;
    const awal = stock("beras");
    actionsPlus.repack({ sourceId: "beras", targetId: "b1kg", sourceQty: 10, produced: 9, contentPerPack: 1, packagingCostPerPack: 200 });
    expect(stock("beras")).toBe(awal - 10);
    expect(stock("b1kg")).toBe(9);
    expect(Math.round(prod("b1kg").hpp)).toBe(Math.round((10 * hppBeras + 200 * 9) / 9));
    expect(getState().audit.at(-1)?.detail).toContain("susut 1");
    expect(() => actionsPlus.repack({ sourceId: "beras", targetId: "b1kg", sourceQty: 5, produced: 9, contentPerPack: 1, packagingCostPerPack: 0 })).toThrow();
  });

  it("titipan terhubung stok: dijual di kasir, bayar penitip = (masuk - sisa - basi) x harga setor", () => {
    startShift();
    actionsPlus.receiveConsign({ owner: "Bu Ani", phone: "0812", item: "Roti Goreng", received: 20, ownerPrice: 1500, sellPrice: 2000 });
    const c = getState().consigns.at(-1)!;
    const pid = c.productId!;
    expect(stock(pid)).toBe(20);
    sellItem(item(pid, "Roti Goreng", 12, 2000, 1500));
    expect(stock(pid)).toBe(8);
    const omzetLaba = dayStats(getState(), 0, Date.now() + 1000).net;
    actionsPlus.settleConsignment(c.id, 5, 3);
    expect(getState().cash.at(-1)?.amount).toBe(-12 * 1500);
    expect(stock(pid)).toBe(5);
    expect(getState().consigns.at(-1)?.settled).toBe(true);
    expect(dayStats(getState(), 0, Date.now() + 1000).net).toBe(omzetLaba);
    expect(() => actionsPlus.settleConsignment(c.id, 0, 0)).toThrow();
  });

  it("PPOB dan transfer tunai: uang masuk laci, deposit berkurang, gagal dikembalikan", () => {
    startShift();
    actionsPlus.topUpDeposit(100000, "bank");
    const tx = actionsPlus.recordPpob({ kind: "pulsa", target: "081234567890", nominal: 10000, fee: 2000, cost: 9800, price: 12000, status: "pending" });
    expect(getState().deposit).toBe(100000 - 9800);
    expect(getState().cash.at(-1)?.amount).toBe(12000);
    expect(dayStats(getState(), 0, Date.now() + 1000).ppobMargin).toBe(2200);
    actionsPlus.settlePpob(tx.id, "gagal");
    expect(getState().deposit).toBe(100000);
    expect(getState().cash.at(-1)?.amount).toBe(-12000);
    expect(() => actionsPlus.settlePpob(tx.id, "sukses")).toThrow();
    expect(() => actionsPlus.recordPpob({ kind: "token", target: "5432100", nominal: 50000, fee: 2500, cost: 999999, price: 52500, status: "sukses" })).toThrow();
    const manual = actionsPlus.recordPpob({ kind: "transfer", target: "BCA 1234567", nominal: 100000, fee: 5000, cost: 100000, price: 105000, status: "manual" });
    expect(manual.status).toBe("manual");
    expect(getState().deposit).toBe(100000);
  });

  it("surat jalan: kirim, batalkan, terima di cabang lain", () => {
    startShift();
    const before = stock("kopi");
    const tr = actionsPlus.createTransfer({ fromStore: "A", toStore: "B", fromName: "Cabang A", toName: "Cabang B", note: "", lines: [{ productId: "kopi", qtyBase: 5 }] });
    expect(stock("kopi")).toBe(before - 5);
    expect(() => actionsPlus.createTransfer({ fromStore: "A", toStore: "B", fromName: "A", toName: "B", note: "", lines: [{ productId: "kopi", qtyBase: 9999 }] })).toThrow();
    actionsPlus.cancelTransfer(tr.id);
    expect(stock("kopi")).toBe(before);
    expect(() => actionsPlus.receiveTransfer(tr.id)).toThrow();
    const tr2 = actionsPlus.createTransfer({ fromStore: "A", toStore: "B", fromName: "Cabang A", toName: "Cabang B", note: "", lines: [{ productId: "kopi", qtyBase: 4 }] });
    setState((s) => ({ products: s.products.filter((p) => p.id !== "kopi") }));
    actionsPlus.receiveTransfer(tr2.id);
    const baru = getState().products.find((p) => p.name === "Kopi Sachet")!;
    expect(baru.stock).toBe(4);
    expect(getState().transfers.find((t) => t.id === tr2.id)?.status).toBe("diterima");
    expect(() => actionsPlus.receiveTransfer(tr2.id)).toThrow();
  });

  it("paket dicatat per komponen di mutasi stok", () => {
    startShift();
    actions.saveProduct({ id: "pk1", name: "Paket Ngopi", emoji: "🎁", category: "Paket", baseUnit: "paket", stock: 0, hpp: 0, units: [{ name: "paket", factor: 1, price: 4000 }], minStock: 0, bundle: [{ productId: "kopi", qty: 2 }] });
    const awal = stock("kopi");
    sellItem(item("pk1", "Paket Ngopi", 1, 4000, 2100));
    expect(stock("kopi")).toBe(awal - 2);
    const m = getState().stockMoves.at(-1)!;
    expect(m.productId).toBe("kopi");
    expect(m.qty).toBe(-2);
    expect(m.reason).toContain("paket");
  });

  it("kasbon melebihi limit hanya lolos dengan persetujuan pemilik", () => {
    startShift();
    const c = getState().customers[0];
    actionsPlus.saveCustomer({ ...c, limit: 1000 });
    const base = { items: [item("kopi", "Kopi Sachet", 2, 1500, 1050)], subtotal: 3000, adjust: 0, total: 3000, paid: 0, change: 0, method: "kasbon" as const, customerId: c.id, payments: [{ method: "kasbon" as const, amount: 3000 }] };
    expect(() => actions.checkout(base)).toThrow();
    const sale = actions.checkout({ ...base, limitOverrideBy: "Bu Sri" });
    expect(sale.limitOverrideBy).toBe("Bu Sri");
  });

  it("stok tampil bertingkat", () => {
    const units = [{ name: "bungkus", factor: 1, price: 3100 }, { name: "renceng", factor: 10, price: 30000 }, { name: "dus", factor: 40, price: 118000 }];
    expect(formatStock({ stock: 45, baseUnit: "bungkus", units })).toBe("1 Dus + 0 Renceng".replace(" + 0 Renceng", "") + " + 5 Bungkus");
    expect(formatStock({ stock: 120, baseUnit: "bungkus", units })).toBe("3 Dus");
    expect(formatStock({ stock: 0, baseUnit: "bungkus", units })).toBe("0 Bungkus");
    expect(formatStock({ stock: -3, baseUnit: "bungkus", units })).toBe("-3 Bungkus");
    expect(formatStock({ stock: 7, baseUnit: "kg", units: [{ name: "kg", factor: 1, price: 1 }] })).toBe("7 Kg");
  });

  it("status kasbon: hijau, kuning (3 hari), merah (lewat gajian)", () => {
    const c = { id: "cx", name: "Pak Joko", phone: "", limit: 100000, payday: 25 };
    const d = (m: number, day: number) => new Date(2026, m, day, 10).getTime();
    setState((s) => ({ customers: [...s.customers, c], ledger: [...s.ledger.filter((l) => l.customerId !== "cx"), { id: "l1", customerId: "cx", ts: d(0, 10), desc: "x", debit: 5000, credit: 0 }] }));
    const s = getState();
    expect(new Date(kasbonDue(s, c) ?? 0).getDate()).toBe(25);
    expect(kasbonStatus(s, c, d(0, 15))).toBe("hijau");
    expect(kasbonStatus(s, c, d(0, 23))).toBe("kuning");
    expect(kasbonStatus(s, c, d(1, 1))).toBe("merah");
    setState((st) => ({ ledger: [...st.ledger, { id: "l2", customerId: "cx", ts: d(0, 12), desc: "bayar", debit: 0, credit: 5000 }] }));
    expect(kasbonStatus(getState(), c, d(1, 1))).toBe("hijau");
  });

  it("top 10 dan jam sibuk", () => {
    startShift();
    sellItem(item("kopi", "Kopi Sachet", 5, 1500, 1050));
    sellItem(item("beras", "Beras", 1, 15000, 12200));
    const t = topProducts(getState());
    expect(t.byQty.length).toBeGreaterThan(0);
    expect(t.byQty.length < 11 && t.byProfit.length < 11).toBe(true);
    expect(t.byQty.every((r, i) => i === 0 || t.byQty[i - 1].qty >= r.qty)).toBe(true);
    expect(t.byProfit.every((r, i) => i === 0 || t.byProfit[i - 1].profit >= r.profit)).toBe(true);
    expect((t.byQty.find((r) => r.id === "kopi")?.qty ?? 0) >= 5).toBe(true);
    const h = peakHours(getState());
    expect(h.hours.reduce((a, b) => a + b, 0)).toBeGreaterThan(1);
    expect(h.top.length).toBeGreaterThan(0);
  });
});
