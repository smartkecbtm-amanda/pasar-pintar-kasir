import { beforeEach, describe, expect, it } from "vitest";
import { actions, customerBalance, getState, movingAverage, resetData, type CartItem, type Product } from "./store";
import { dayStats, searchProducts, validSales } from "./operations";
import { sanitizeCell, sanitizeRows } from "./export";
import { receiptText } from "./receipt";

const as = (id: string) => sessionStorage.setItem("employee", id);
const kopi = (qty: number): CartItem => ({ productId: "kopi", name: "Kopi Sachet", unit: "sachet", factor: 1, qty, price: 1500, hpp: 1050 });
const stock = (id: string) => getState().products.find((p) => p.id === id)?.stock ?? NaN;
const all = () => dayStats(getState(), 0, Date.now() + 1000);
const sell = (qty: number, extra: Record<string, unknown> = {}) =>
  actions.checkout({ items: [kopi(qty)], subtotal: qty * 1500, adjust: 0, total: qty * 1500, paid: qty * 1500, change: 0, method: "tunai", ...extra });
const startShift = () => { as("e1"); actions.openShift("", 100000); };

describe("Integritas stok dan kas", () => {
  beforeEach(() => { resetData(); sessionStorage.clear(); });

  it("retur mengembalikan stok, uang laci, mengurangi omzet, dan dibatasi sesuai nota", () => {
    startShift();
    const sale = sell(2);
    const omzetSetelahJual = all().omzet;
    expect(stock("kopi")).toBe(7);
    actions.returnItem(sale.id, "kopi", "sachet", "retur");
    expect(stock("kopi")).toBe(8);
    expect(getState().cash.at(-1)?.amount).toBe(-1500);
    expect(getState().stockMoves.at(-1)?.reason).toBe("Retur pelanggan");
    expect(all().omzet).toBe(omzetSetelahJual - 1500);
    actions.returnItem(sale.id, "kopi", "sachet", "retur");
    expect(stock("kopi")).toBe(9);
    expect(() => actions.returnItem(sale.id, "kopi", "sachet", "retur")).toThrow();
    expect(stock("kopi")).toBe(9);
  });

  it("tukar mengeluarkan stok baru dan mencatat kerugian barang rusak ke laba", () => {
    startShift();
    const sale = sell(2);
    const labaSebelum = all().net;
    actions.returnItem(sale.id, "kopi", "sachet", "tukar");
    expect(stock("kopi")).toBe(6);
    expect(getState().returns[0].loss).toBe(1050);
    expect(getState().returns[0].refund).toBe(0);
    expect(all().net).toBe(labaSebelum - 1050);
  });

  it("retur dan void hanya untuk supervisor atau pemilik", () => {
    startShift();
    const sale = sell(1);
    as("e2"); actions.joinShift();
    expect(() => actions.returnItem(sale.id, "kopi", "sachet", "retur")).toThrow();
    expect(() => actions.voidSale(sale.id, "salah")).toThrow();
  });

  it("void mengembalikan stok, uang tunai, kasbon, dan nota keluar dari laporan", () => {
    startShift();
    const customerId = getState().customers[0].id;
    const saldo = customerBalance(getState(), customerId);
    const omzet = all().omzet;
    const sale = sell(2, { method: "split", paid: 1000, payments: [{ method: "tunai", amount: 1000 }, { method: "kasbon", amount: 2000 }], customerId });
    expect(customerBalance(getState(), customerId)).toBe(saldo + 2000);
    expect(stock("kopi")).toBe(7);
    as("e3");
    expect(() => actions.voidSale(sale.id, "  ")).toThrow();
    actions.voidSale(sale.id, "salah input");
    expect(stock("kopi")).toBe(9);
    expect(customerBalance(getState(), customerId)).toBe(saldo);
    expect(getState().cash.at(-1)?.amount).toBe(-1000);
    expect(validSales(getState()).some((x) => x.id === sale.id)).toBe(false);
    expect(all().omzet).toBe(omzet);
    expect(() => actions.voidSale(sale.id, "lagi")).toThrow();
    expect(getState().audit.at(-1)?.action).toBe("Void nota");
  });

  it("nota yang sudah diretur tidak boleh di-void", () => {
    startShift();
    const sale = sell(2);
    actions.returnItem(sale.id, "kopi", "sachet", "retur");
    expect(() => actions.voidSale(sale.id, "batal")).toThrow();
  });

  it("prive barang dan opname selalu menulis mutasi stok", () => {
    as("e1");
    actions.addPrive({ type: "barang", amount: 24400, note: "dapur", productId: "beras", qty: 2 });
    expect(stock("beras")).toBe(46);
    expect(getState().stockMoves.at(-1)?.reason).toBe("Prive barang");
    expect(getState().stockMoves.at(-1)?.qty).toBe(-2);
    actions.adjustStock("gula", 5, "Selisih hitung", "");
    expect(stock("gula")).toBe(5);
    expect(getState().stockMoves.at(-1)?.reason).toBe("Opname · Selisih hitung");
    actions.adjustStock("beras", 40, "Konsumsi rumah tangga", "");
    expect(getState().prive.at(-1)?.amount).toBe(6 * 12200);
    expect(() => actions.adjustStock("gula", 5, "Selisih hitung", "")).toThrow();
    as("e2");
    expect(() => actions.adjustStock("gula", 1, "Selisih hitung", "")).toThrow();
  });

  it("ubah produk tidak bisa menembus stok; stok awal dan ubah harga tercatat", () => {
    as("e1");
    const old = getState().products.find((p) => p.id === "gula") as Product;
    actions.saveProduct({ ...old, stock: 999, units: [{ ...old.units[0], price: 19000 }, ...old.units.slice(1)] });
    expect(stock("gula")).toBe(old.stock);
    expect(getState().audit.some((a) => a.action === "Ubah harga jual")).toBe(true);
    actions.saveProduct({ ...old, id: "baru", name: "Barang Baru", stock: 10 });
    expect(stock("baru")).toBe(10);
    expect(getState().stockMoves.at(-1)?.reason).toBe("Stok awal");
  });

  it("stok minus tidak memblokir kasir dan ditandai audit", () => {
    startShift();
    sell(12);
    expect(stock("kopi")).toBe(-3);
    expect(getState().stockMoves.at(-1)?.audit).toBe(true);
  });

  it("ubah harga di kasir hanya supervisor atau pemilik, tercatat sebagai diskon dan audit", () => {
    startShift();
    as("e2"); actions.joinShift();
    const manual = { ...kopi(2), price: 1000, listPrice: 1500, manual: true };
    expect(() => actions.checkout({ items: [manual], subtotal: 2000, adjust: 0, total: 2000, paid: 2000, change: 0, method: "tunai" })).toThrow();
    as("e3"); actions.joinShift();
    const sale = actions.checkout({ items: [manual], subtotal: 2000, adjust: 0, total: 2000, paid: 2000, change: 0, method: "tunai" });
    expect(sale.manualDiscount).toBe(1000);
    expect(getState().audit.at(-1)?.action).toBe("Ubah harga di kasir");
  });

  it("tutup shift dengan selisih wajib alasan", () => {
    startShift();
    expect(() => actions.closeShift(1000, 100000)).toThrow();
    actions.closeShift(1000, 100000, "uang kembalian salah");
    expect(getState().shifts.at(-1)?.note).toBe("uang kembalian salah");
  });

  it("rata-rata bergerak HPP", () => {
    expect(movingAverage(10, 1000, 10, 2000)).toBe(1500);
  });
});

describe("Ekspor, pencarian, struk", () => {
  it("sanitasi CSV: teks berbahaya diberi petik, angka negatif tetap angka", () => {
    expect(sanitizeCell(-5)).toBe(-5);
    expect(sanitizeCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(sanitizeCell("+62812")).toBe("'+62812");
    expect(sanitizeCell("@cmd")).toBe("'@cmd");
    expect(sanitizeCell("Beras")).toBe("Beras");
    const out = sanitizeRows([{ Jumlah: -5, Barang: "-rm" }]);
    expect(out[0].Jumlah).toBe(-5);
    expect(out[0].Barang).toBe("'-rm");
  });

  it("pencarian toleran singkatan dan kode cepat", () => {
    const list = [
      { id: "a", name: "Indomie Goreng", category: "Sembako", quickCode: "07" },
      { id: "b", name: "Teh Botol", category: "Minuman", barcode: "8990001" },
    ] as Product[];
    expect(searchProducts(list, "ind grg")[0].id).toBe("a");
    expect(searchProducts(list, "07")[0].id).toBe("a");
    expect(searchProducts(list, "8990001")[0].id).toBe("b");
    expect(searchProducts(list, "teh")[0].id).toBe("b");
    expect(searchProducts(list, "zzz")).toHaveLength(0);
    expect(searchProducts(list, "")).toHaveLength(2);
  });

  it("teks struk WhatsApp memuat toko, nota, dan total", () => {
    resetData(); sessionStorage.clear(); startShift();
    const sale = sell(2);
    const text = receiptText(sale, "Warung Bu Sri");
    expect(text).toContain("Warung Bu Sri");
    expect(text).toContain(sale.id);
    expect(text).toContain("3.000");
  });
});
