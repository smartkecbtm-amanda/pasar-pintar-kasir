import { beforeEach, describe, expect, it } from "vitest";
import { actions, currentEmployee, getState, makeSeed, resetData, setState, validatePayments, type CartItem } from "./store";
import { businessAdvice, expiryStatus, restockRadar, wholesalePrice } from "./operations";
const item: CartItem = { productId: "kopi", name: "Kopi Sachet", unit: "sachet", factor: 1, qty: 10, price: 1500, hpp: 1050 };
describe("Aturan Fase 1", () => {
  beforeEach(() => { resetData(); sessionStorage.clear(); });
  it("auto-grosir 10 sachet menggunakan harga renteng 13.500", () => {
    const p = makeSeed().products.find((p) => p.id === "kopi");
    if (!p) throw new Error("Produk hilang");
    expect(wholesalePrice(p, item) * 10).toBe(13500);
    expect(wholesalePrice(p, { ...item, qty: 9 })).toBe(1500);
  });
  it("kedaluwarsa H-30 kuning dan H-7 merah", () => {
    const now = new Date("2026-11-14T00:00:00").getTime();
    expect(expiryStatus("2026-12-14", now)?.level).toBe("warning");
    expect(expiryStatus("2026-11-21", now)?.level).toBe("danger");
    expect(expiryStatus("2026-12-15", now)?.level).toBe("safe");
  });
  it("ROP = penjualan harian x lead time + stok aman", () => {
    const s = makeSeed(); const now = Date.now();
    s.sales = [{ id: "test", ts: now, items: [{ ...item, qty: 14 }], total: 21000, subtotal: 21000, adjust: 0, paid: 21000, change: 0, method: "tunai" }];
    s.products = s.products.filter((p) => p.id === "kopi").map((p) => ({ ...p, stock: 8, leadTime: 3, safetyStock: 2 }));
    const r = restockRadar(s, now)[0];
    expect(r.daily).toBe(2); expect(r.rop).toBe(8); expect(r.reorder).toBe(true); expect(r.days).toBe(4);
  });
  it("split menolak jumlah tidak seimbang dan hanya sisa kasbon diuji limit", () => {
    const s = makeSeed();
    expect(() => validatePayments(s, 22000, [{ method: "tunai", amount: 10000 }, { method: "qris", amount: 11000 }])).toThrow();
    expect(() => validatePayments(s, 22000, [{ method: "tunai", amount: 10000 }, { method: "kasbon", amount: 12000 }], "c2")).not.toThrow();
    expect(() => validatePayments(s, 22000, [{ method: "kasbon", amount: 22000 }], "c2")).toThrow();
  });
  it("maksimal 5 keranjang hold", () => {
    for (let i = 0; i < 5; i++) actions.hold(String(i), [item]);
    expect(() => actions.hold("6", [item])).toThrow(); expect(getState().held).toHaveLength(5);
  });
  it("tandem tidak membuat shift atau modal baru; split hanya tunai masuk laci", () => {
    sessionStorage.setItem("employee", "e1"); actions.openShift("", 150000);
    sessionStorage.setItem("employee", "e2"); actions.joinShift();
    actions.checkout({ items: [{ ...item, qty: 1 }], total: 1500, subtotal: 1500, adjust: 0, paid: 500, change: 0, method: "split", payments: [{ method: "tunai", amount: 500 }, { method: "qris", amount: 1000 }] });
    const s = getState(); expect(s.shifts).toHaveLength(1); expect(s.shifts[0].opening).toBe(150000); expect(s.cash.at(-1)?.amount).toBe(500); expect(s.sales.at(-1)?.cashierId).toBe("e2");
    expect(() => actions.closeShift(150500, 150500)).toThrow();
  });
  it("saran bisnis tidak mengubah data", () => {
    const s = makeSeed(); const before = JSON.stringify(s); expect(businessAdvice(s)).toHaveLength(3); expect(JSON.stringify(s)).toBe(before);
  });
  it("kasir nonaktif tidak dapat menggunakan identitas tersimpan", () => {
    sessionStorage.setItem("employee", "e2"); setState((s) => ({ employees: s.employees.map((e) => e.id === "e2" ? { ...e, active: false } : e) })); expect(currentEmployee()).toBeUndefined();
  });
});