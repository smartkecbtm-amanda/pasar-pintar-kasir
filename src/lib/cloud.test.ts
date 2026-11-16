import { beforeEach, describe, expect, it } from "vitest";
import { actions, getState, loginEmployee, resetData, saveEmployee, setState, type State, type Transfer } from "./store";
import { actionsPlus } from "./store-extra";
import { applyRows, bootstrapEvents, createSyncEngine, diffEvents, emptyOperational, type Row, type Transport } from "./cloud";
import * as P from "./persist";

const LOGS = new Set(["stock_moves", "cash_moves", "ledger", "returns", "audit", "prive", "deposit_moves"]);

/** Server tiruan dengan aturan yang sama seperti fungsi SQL sync_push/sync_pull. */
class FakeServer {
  seq = 0; seen = new Set<string>(); rows = new Map<string, Row>(); down = false;
  transfers = new Map<string, { id: string; status: Transfer["status"]; data: Transfer }>(); pins = new Map<string, string>();
  transport: Transport = async (fn, args) => {
    if (this.down) throw new Error("jaringan putus");
    if (fn === "sync_push") {
      for (const e of args["p_events"] as P.OutboxEvent[]) {
        if (this.seen.has(e.id)) continue;
        this.seen.add(e.id);
        const key = `${e.entity}|${e.entity_id}`; const old = this.rows.get(key);
        if (LOGS.has(e.entity)) { if (!old) this.rows.set(key, { seq: ++this.seq, entity: e.entity, entity_id: e.entity_id, data: e.data, deleted: false, ts: e.ts }); continue; }
        if (old && old.ts > e.ts) continue;
        this.rows.set(key, { seq: ++this.seq, entity: e.entity, entity_id: e.entity_id, data: e.op === "delete" ? null : e.data, deleted: e.op === "delete", ts: e.ts });
      }
      return { accepted: (args["p_events"] as unknown[]).length };
    }
    if (fn === "sync_pull") {
      const since = args["p_since"] as number; const limit = args["p_limit"] as number;
      const rows = [...this.rows.values()].filter((r) => r.seq > since).sort((a, b) => a.seq - b.seq).slice(0, limit);
      return { rows, cursor: rows.length ? rows[rows.length - 1].seq : since };
    }
    if (fn === "sync_status") return { count: this.rows.size };
    if (fn === "list_transfers") return [...this.transfers.values()].filter((t) => t.data.fromStore === args["p_store"] || t.data.toStore === args["p_store"]);
    if (fn === "create_transfer") { const t = args["p_transfer"] as Transfer; if (!this.transfers.has(t.id)) this.transfers.set(t.id, { id: t.id, status: "dikirim", data: t }); return null; }
    if (fn === "receive_transfer") { const t = this.transfers.get(args["p_id"] as string); const ok = !!t && t.status === "dikirim" && t.data.toStore === args["p_store"]; if (ok && t) t.status = "diterima"; return ok; }
    if (fn === "cancel_transfer") { const t = this.transfers.get(args["p_id"] as string); const ok = !!t && t.status === "dikirim" && t.data.fromStore === args["p_store"]; if (ok && t) t.status = "dibatalkan"; return ok; }
    if (fn === "verify_employee_pin") { if (this.down) throw new Error("jaringan putus"); const p = this.pins.get(args["p_employee"] as string); return p === undefined ? null : p === args["p_pin"]; }
    if (fn === "set_employee_pin") { this.pins.set(args["p_employee"] as string, args["p_pin"] as string); return null; }
    throw new Error(`rpc tidak dikenal: ${fn}`);
  };
  all = () => [...this.rows.values()];
}

const as = (id: string) => sessionStorage.setItem("employee", id);
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const sellKopi = (qty: number) => actions.checkout({ items: [{ productId: "kopi", name: "Kopi Sachet", unit: "sachet", factor: 1, qty, price: 1500, hpp: 1050 }], subtotal: qty * 1500, adjust: 0, total: qty * 1500, paid: qty * 1500, change: 0, method: "tunai" });
const stockOf = (s: State, id: string) => s.products.find((p) => p.id === id)?.stock;

describe("Sinkronisasi cloud", () => {
  beforeEach(async () => { resetData(); sessionStorage.clear(); await P.outboxClear(); await P.kvDel("cloud-cursor"); await P.kvDel("cloud-bootstrapped"); });

  it("toko baru: perangkat pertama mengunggah semua data dan stok menjadi saldo awal", async () => {
    const srv = new FakeServer();
    const eng = createSyncEngine({ storeId: "T1" }, srv.transport, { intervalMs: 3_600_000 });
    await eng.start();
    const products = srv.all().filter((r) => r.entity === "products");
    expect(products.length).toBe(getState().products.length);
    expect(products.every((r) => !("stock" in r.data))).toBe(true);
    expect(products.every((r) => !("pinHash" in r.data))).toBe(true);
    expect(srv.all().filter((r) => r.entity === "employees").every((r) => !("pinHash" in r.data))).toBe(true);
    const saldo = srv.all().filter((r) => r.entity === "stock_moves" && r.entity_id.startsWith("init-"));
    expect(saldo.length > 0).toBe(true);
    eng.stop();
  });

  it("perangkat baru menarik semua data dan stok sama persis", async () => {
    const srv = new FakeServer();
    const eng = createSyncEngine({ storeId: "T1" }, srv.transport, { intervalMs: 3_600_000 });
    await eng.start();
    as("e1"); actions.openShift("", 100000);
    sellKopi(3);
    await eng.syncNow();
    const a = getState();
    const b0 = { ...clone(a), ...emptyOperational() } as State;
    const b = { ...b0, ...applyRows(b0, srv.all()) } as State;
    const beda = a.products.filter((p) => stockOf(b, p.id) !== p.stock).map((p) => `${p.id}:${p.stock}/${stockOf(b, p.id)}${p.digital ? " digital" : ""}${p.bundle ? " paket" : ""}`);
    expect(beda).toEqual([]);
    expect(b.sales.length).toBe(a.sales.length);
    expect(b.cash.length).toBe(a.cash.length);
    expect(b.shifts.length).toBe(a.shifts.length);
    eng.stop();
  });

  it("dua perangkat menjual barang sama secara bersamaan: stok = awal - total terjual", async () => {
    const srv = new FakeServer();
    const eng = createSyncEngine({ storeId: "T1" }, srv.transport, { intervalMs: 3_600_000 });
    await eng.start();
    const base = clone(getState());
    const b0 = { ...clone(base), ...emptyOperational() } as State;
    let b = { ...b0, ...applyRows(b0, srv.all()) } as State;
    const awal = stockOf(base, "kopi") as number;
    as("e1"); actions.openShift("", 100000);
    sellKopi(3);
    const bPrev = b;
    b = { ...b, products: b.products.map((p) => (p.id === "kopi" ? { ...p, stock: p.stock - 2 } : p)), stockMoves: [...b.stockMoves, { id: "b-move-1", ts: Date.now(), productId: "kopi", qty: -2, reason: "Penjualan" }] };
    for (const e of diffEvents(bPrev, b)) await srv.transport("sync_push", { p_store: "T1", p_events: [e] });
    await eng.syncNow();
    expect(stockOf(getState(), "kopi")).toBe(awal - 5);
    const since = 0;
    const fromServer = (await srv.transport("sync_pull", { p_store: "T1", p_since: since, p_limit: 10000 })) as { rows: Row[] };
    const bAll = { ...b0, ...applyRows(b0, fromServer.rows) } as State;
    expect(stockOf(bAll, "kopi")).toBe(awal - 5);
    eng.stop();
  });

  it("idempoten: kirim ulang dan tarik ulang tidak menggandakan stok atau uang", async () => {
    const srv = new FakeServer();
    const eng = createSyncEngine({ storeId: "T1" }, srv.transport, { intervalMs: 3_600_000 });
    await eng.start();
    as("e1"); actions.openShift("", 100000);
    sellKopi(2);
    const events = await P.outboxPeek(1000);
    await eng.syncNow();
    await srv.transport("sync_push", { p_store: "T1", p_events: events });
    const stok = stockOf(getState(), "kopi");
    const kas = getState().cash.length;
    await P.kvSet("cloud-cursor", 0);
    await eng.syncNow();
    expect(stockOf(getState(), "kopi")).toBe(stok);
    expect(getState().cash.length).toBe(kas);
    const rows = srv.all();
    const s1 = { ...getState(), ...applyRows(getState(), rows) } as State;
    const s2 = { ...s1, ...applyRows(s1, rows) } as State;
    expect(stockOf(s2, "kopi")).toBe(stok);
    eng.stop();
  });

  it("offline: peristiwa menunggu di outbox lalu terkirim saat jaringan pulih", async () => {
    const srv = new FakeServer();
    const eng = createSyncEngine({ storeId: "T1" }, srv.transport, { intervalMs: 3_600_000 });
    await eng.start();
    srv.down = true;
    as("e1"); actions.openShift("", 100000);
    sellKopi(1);
    await new Promise((r) => setTimeout(r, 30));
    await eng.syncNow();
    expect(await P.outboxCount() > 0).toBe(true);
    expect(getState().pendingSync > 0).toBe(true);
    srv.down = false;
    await eng.syncNow();
    expect(await P.outboxCount()).toBe(0);
    expect(getState().pendingSync).toBe(0);
    expect(srv.all().some((r) => r.entity === "sales")).toBe(true);
    eng.stop();
  });

  it("dokumen: perubahan lebih lama tidak menimpa; shift menggabungkan peserta; nota void tetap void", () => {
    const s = getState();
    const sh = { id: "S1", cashier: "A", cashierId: "e1", participants: ["e1"], openedAt: 1, opening: 1 } as State["shifts"][number];
    const base = { ...s, shifts: [sh], sales: [{ id: "N1", ts: 1, items: [], subtotal: 0, adjust: 0, total: 0, paid: 0, change: 0, method: "tunai", voided: { ts: 2, by: "x", reason: "y" } }] } as unknown as State;
    const patch = applyRows(base, [
      { seq: 1, entity: "shifts", entity_id: "S1", data: { ...sh, participants: ["e2"] }, deleted: false, ts: 5 },
      { seq: 2, entity: "sales", entity_id: "N1", data: { ...base.sales[0], voided: undefined }, deleted: false, ts: 5 },
    ]);
    expect(patch.shifts?.[0].participants?.sort()).toEqual(["e1", "e2"]);
    expect(patch.sales?.[0].voided?.reason).toBe("y");
  });

  it("bootstrapEvents: stok awal = stok sistem dikurangi jumlah mutasi yang sudah ada", () => {
    as("e1");
    const s = getState();
    const ev = bootstrapEvents(s);
    const sums = new Map<string, number>();
    for (const e of ev.filter((x) => x.entity === "stock_moves")) { const d = e.data as { productId: string; qty: number }; sums.set(d.productId, (sums.get(d.productId) ?? 0) + d.qty); }
    for (const p of s.products.filter((q) => !q.digital && !q.bundle)) expect(Math.round((sums.get(p.id) ?? 0) * 1000)).toBe(Math.round(p.stock * 1000));
  });

  it("surat jalan lintas cabang: kirim dari A, terima di B, stok masing-masing sekali", async () => {
    const srv = new FakeServer();
    // cabang A (perangkat ini)
    as("e1"); actions.openShift("", 100000);
    const awal = getState().products.find((p) => p.id === "kopi")!.stock;
    const eA = createSyncEngine({ storeId: "A" }, srv.transport, { intervalMs: 3_600_000 });
    await eA.start();
    const tr = actionsPlus.createTransfer({ fromStore: "A", toStore: "B", fromName: "Cabang A", toName: "Cabang B", note: "", lines: [{ productId: "kopi", qtyBase: 4 }] });
    await eA.syncNow();
    expect(srv.transfers.get(tr.id)?.status).toBe("dikirim");
    expect(getState().products.find((p) => p.id === "kopi")!.stock).toBe(awal - 4);
    eA.stop();
    // cabang B (perangkat lain): data sendiri, tarik surat jalan
    resetData(); sessionStorage.clear(); await P.outboxClear(); await P.kvDel("cloud-cursor"); await P.kvDel("cloud-bootstrapped");
    as("e1"); actions.openShift("", 50000);
    const eB = createSyncEngine({ storeId: "B" }, srv.transport, { intervalMs: 3_600_000 });
    await eB.start();
    const masuk = getState().transfers.find((t) => t.id === tr.id);
    expect(masuk?.status).toBe("dikirim");
    setState((st) => ({ products: st.products.filter((p) => p.id !== "kopi") }));
    actionsPlus.receiveTransfer(tr.id);
    await eB.syncNow();
    expect(srv.transfers.get(tr.id)?.status).toBe("diterima");
    expect(getState().products.find((p) => p.name === "Kopi Sachet")?.stock).toBe(4);
    const ids = getState().stockMoves.filter((m) => m.reason.startsWith("Transfer masuk")).map((m) => m.id);
    expect(ids).toEqual([`recv-${tr.id}-${getState().products.find((p) => p.name === "Kopi Sachet")!.id}`]);
    eB.stop();
  });

  it("PIN diverifikasi server saat online dan memakai hash lokal saat offline", async () => {
    const srv = new FakeServer();
    as("e1");
    const eng = createSyncEngine({ storeId: "A" }, srv.transport, { intervalMs: 3_600_000 });
    await eng.start();
    await saveEmployee({ ...getState().employees.find((e) => e.id === "e2")!, role: "Kasir" }, "4321");
    expect(srv.pins.get("e2")).toBe("4321");
    expect((await loginEmployee("e2", "4321")).id).toBe("e2");
    let ditolak = false;
    try { await loginEmployee("e2", "9999"); } catch { ditolak = true; }
    expect(ditolak).toBe(true);
    // pegawai yang PIN-nya belum pernah disimpan ke server tetap bisa masuk dengan hash lokal
    expect((await loginEmployee("e1", "1234")).id).toBe("e1");
    srv.down = true;
    expect((await loginEmployee("e2", "4321")).id).toBe("e2");
    eng.stop();
  });
});
