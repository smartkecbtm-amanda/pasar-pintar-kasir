import { webcrypto } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { actions, expectedCash, getState, hashPin, resetData, setState, type CartItem } from "./store";
import { coinPlan, repackValues } from "./operations";
import { escPos, receiptText } from "./receipt";
import { connectPrinter, disconnectPrinter, printThermal } from "./printer";
import { dayStats } from "@/components/owner/Dashboard";

const item: CartItem = { productId: "kopi", name: "Kopi", unit: "sachet", factor: 1, qty: 1, price: 1500, hpp: 1050 };
function sale() { actions.checkout({ items: [item], subtotal: 1500, adjust: 0, total: 1500, paid: 1500, change: 0, method: "tunai" }); const x = getState().sales.at(-1); if (!x) throw new Error("Nota hilang"); return x; }
describe("Sisa Fase 1", () => {
  beforeEach(() => { vi.stubGlobal("crypto", webcrypto); resetData(); sessionStorage.clear(); sessionStorage.setItem("employee", "e1"); actions.openShift("Sri", 150000); });
  it("diskon koin Rp1–99 membulatkan ke ratusan bawah", () => {
    expect(coinPlan(15099, 20000, "discount")).toEqual({ discount: 99, donation: 0, candyQty: 0, total: 15000, change: 5000 });
    expect(coinPlan(15001, 20000, "discount").discount).toBe(1);
    expect(coinPlan(15100, 20000, "discount").discount).toBe(0);
  });
  it("donasi kembalian dicatat terpisah dan tidak menambah omzet", () => {
    const plan = coinPlan(15050, 20000, "donation"); expect(plan.donation).toBe(50); expect(plan.change).toBe(4900);
    setState(() => ({ sales: [], cash: [], stockMoves: [], consigns: [] }));
    actions.checkout({ items: [{ ...item, price: 15050 }], subtotal: 15050, adjust: 50, total: plan.total, donation: plan.donation, paid: 20000, change: plan.change, method: "tunai" });
    const s = getState(); expect(s.cash.at(-1)?.amount).toBe(15100); expect(dayStats(s, 0, Date.now() + 1000).omzet).toBe(15050);
  });
  it("permen mengganti koin sesuai harga dan memotong stok", () => {
    const plan = coinPlan(14500, 20000, "candy", 500); expect(plan.candyQty).toBe(1); expect(plan.change).toBe(5000);
    actions.checkout({ items: [{ ...item, price: 14500 }, { ...item, productId: "permen", name: "Permen", price: 500, hpp: 250 }], subtotal: 15000, adjust: 0, total: 15000, paid: 20000, change: 5000, method: "tunai" });
    expect(getState().products.find((p) => p.id === "permen")?.stock).toBe(199);
  });
  it("opname perlu alasan, mencatat susut dan hanya supervisor/pemilik", () => {
    sessionStorage.setItem("employee", "e2"); expect(() => actions.opname("beras", 47, "Susut", "timbang")).toThrow();
    sessionStorage.setItem("employee", "e3"); expect(() => actions.opname("beras", 47, "", "timbang")).toThrow();
    actions.opname("beras", 47, "Susut", "timbang"); expect(getState().products.find((p) => p.id === "beras")?.stock).toBe(47); expect(getState().stockMoves.at(-1)?.cost).toBe(12200);
    expect(() => actions.opname("beras", 46, "Konsumsi Rumah Tangga", "dapur")).toThrow();
  });
  it("opname konsumsi rumah mencatat prive HPP bukan beban kas", () => {
    actions.opname("beras", 46, "Konsumsi Rumah Tangga", "dapur");
    expect(getState().prive.at(-1)?.amount).toBe(24400); expect(getState().stockMoves.at(-1)?.cost).toBe(0);
  });
  it("repacking 50kg ke 49 kemasan 1kg mengaudit susut 1kg", () => {
    expect(repackValues(50, 12200, 50, 49, 1)).toEqual({ loss: 1, outputHpp: 12200, lossCost: 12200 });
    setState((s) => ({ products: [...s.products.map((p) => p.id === "beras" ? { ...p, stock: 50 } : p), { ...s.products[2], id: "beras-pak", name: "Beras kemasan", stock: 0, baseUnit: "pak" }] }));
    actions.repack("beras", "beras-pak", 50, 49, 1);
    expect(getState().products.find((p) => p.id === "beras")?.stock).toBe(0); expect(getState().products.find((p) => p.id === "beras-pak")?.stock).toBe(49);
    expect(getState().stockMoves.at(-2)?.cost).toBe(12200);
    expect(() => repackValues(50, 12200, 50, 51, 1)).toThrow();
  });
  it("retur supplier memotong hutang tanpa menambah kas", () => {
    const cash = getState().cash.length;
    actions.returnSupplier("indomie", 2, 5700, "sp1", "rusak", "py1");
    expect(getState().payables[0].amount).toBe(844300); expect(getState().cash).toHaveLength(cash); expect(getState().products.find((p) => p.id === "indomie")?.stock).toBe(78);
    expect(() => actions.returnSupplier("indomie", 1, 600000, "sp1", "rusak", "py1")).toThrow();
  });
  it("retur supplier tunai menambah kas, tanpa mengubah hutang", () => {
    actions.returnSupplier("indomie", 1, 2850, "sp1", "rusak"); expect(getState().cash.at(-1)?.amount).toBe(2850); expect(getState().payables[0].amount).toBe(850000);
  });
  it("titipan terjual di kasir, sisa/rusak cocok dan setoran tidak menggandakan omzet", () => {
    actions.addConsign({ owner: "Bu Tini", phone: "", item: "Donat", received: 20, sellPrice: 2500, ownerPrice: 2000 });
    const c = getState().consigns.at(-1); if (!c?.productId) throw new Error("Barang titipan hilang");
    actions.checkout({ items: [{ ...item, productId: c.productId, qty: 16, price: 2500, hpp: 2000 }], subtotal: 40000, total: 40000, adjust: 0, paid: 40000, change: 0, method: "tunai" });
    expect(() => actions.settleConsign(c.id, 5)).toThrow(); actions.settleConsign(c.id, 3, 1);
    expect(getState().consigns.at(-1)?.sold).toBe(16); expect(getState().cash.at(-1)?.amount).toBe(-32000);
    expect(getState().cash.filter((x) => x.kind === "konsinyasi")).toHaveLength(0); expect(() => actions.settleConsign(c.id, 3, 1)).toThrow();
  });
  it("void memerlukan PIN supervisor, menjaga identitas kasir dan mengembalikan stok/kas sekali", async () => {
    setState((s) => ({ employees: s.employees.map((e) => e.id === "e3" ? { ...e, pinHash: "" } : e) }));
    const pinHash = await hashPin("7777"); setState((s) => ({ employees: s.employees.map((e) => e.id === "e3" ? { ...e, pinHash } : e) }));
    const x = sale(); sessionStorage.setItem("employee", "e2"); actions.joinShift();
    await expect(actions.voidSale(x.id, "e3", "wrong", "salah barang")).rejects.toThrow();
    await actions.voidSale(x.id, "e3", "7777", "salah barang");
    expect(sessionStorage.getItem("employee")).toBe("e2"); expect(getState().products.find((p) => p.id === "kopi")?.stock).toBe(9);
    expect(expectedCash(getState(), getState().shifts[0])).toBe(150000); expect(getState().sales.at(-1)?.voidBy).toBe("e3");
    await expect(actions.voidSale(x.id, "e3", "7777", "ulang")).rejects.toThrow();
  });
  it("void gabungan membalik hanya kas tunai dan porsi kasbon", async () => {
    const pinHash = await hashPin("7777"); setState((s) => ({ employees: s.employees.map((e) => e.id === "e3" ? { ...e, pinHash } : e) }));
    actions.checkout({ items: [item], subtotal: 1500, adjust: 0, total: 1500, paid: 500, change: 0, method: "split", customerId: "c1", payments: [{ method: "tunai", amount: 500 }, { method: "kasbon", amount: 1000 }] });
    const x = getState().sales.at(-1); if (!x) throw new Error("Nota hilang"); await actions.voidSale(x.id, "e3", "7777", "salah");
    expect(getState().cash.at(-1)?.amount).toBe(-500); expect(getState().ledger.at(-1)?.credit).toBe(1000);
  });
  it("retur pelanggan tidak dapat diulang melebihi kuantitas terjual", () => {
    const x = sale(); actions.returnSaleItem(x.id, 0); expect(getState().cash.at(-1)?.amount).toBe(-1500); expect(() => actions.returnSaleItem(x.id, 0)).toThrow();
  });
  it("struk ESC/POS mengirim init, isi nota dan potong kertas untuk 58/80mm", () => {
    const x = sale(); const text = receiptText("Warung", x, 58); expect(text).toContain(`Nota ${x.id}`);
    expect(text.split("\n").every((l) => l.length <= 32)).toBe(true); expect(receiptText("Warung", x, 80).split("\n").every((l) => l.length <= 48)).toBe(true);
    const bytes = escPos(text); expect([...bytes.slice(0, 2)]).toEqual([27, 64]); expect([...bytes.slice(-3)]).toEqual([29, 86, 0]);
  });
  it("Serial menulis bytes ESC/POS pada printer dan melepas writer", async () => {
    const write = vi.fn(async () => {}); const releaseLock = vi.fn(); const close = vi.fn(async () => {});
    Object.defineProperty(navigator, "serial", { configurable: true, value: { requestPort: async () => ({ open: vi.fn(async () => {}), close, writable: { getWriter: () => ({ write, releaseLock }) } }) } });
    await connectPrinter("serial"); await printThermal("TES\n"); expect(write.mock.calls[0]?.[0]).toEqual(escPos("TES\n")); expect(releaseLock).toHaveBeenCalledOnce(); await disconnectPrinter(); expect(close).toHaveBeenCalledOnce();
  });
});