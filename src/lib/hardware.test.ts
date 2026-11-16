import { beforeEach, describe, expect, it } from "vitest";
import { actions, getState, resetData } from "./store";
import { EscPos, KICK_DRAWER, ascii, columnsFor, kickDrawerBytes, linesToEscPos, receiptToEscPos } from "./escpos";
import { parseScaleLine, splitScaleChunk } from "./scale";
import { settlementLines, transferLines } from "./receipt";
import { advisorTips, buildAdvisorPayload, kasbonRisk, paydayHint, upcomingEvents } from "./advisor";

const as = (id: string) => sessionStorage.setItem("employee", id);
const text = (b: Uint8Array) => Array.from(b, (x) => (x >= 0x20 && x < 0x7f ? String.fromCharCode(x) : x === 0x0a ? "\n" : "")).join("");

describe("ESC/POS", () => {
  beforeEach(() => { resetData(); sessionStorage.clear(); });

  it("perintah buka laci ESC p 0 25 250 dan potong kertas", () => {
    expect(Array.from(KICK_DRAWER)).toEqual([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    expect(Array.from(kickDrawerBytes())).toEqual([0x1b, 0x40, 0x1b, 0x70, 0x00, 0x19, 0xfa]);
  });

  it("karakter non-ASCII disederhanakan", () => {
    expect(ascii("Café Ñandú")).toBe("Cafe Nandu");
    expect(ascii("Kopi ☕")).toBe("Kopi ?");
  });

  it("dua kolom selalu selebar kolom printer", () => {
    for (const w of [58, 80] as const) {
      const c = columnsFor(w);
      const out = text(new EscPos().cols("Indomie Goreng Spesial Pedas Level 5 Ekstra", "Rp12.000", c).build());
      expect(out.trimEnd().length).toBe(c);
    }
  });

  it("struk berisi total, pembayaran, perintah potong, dan buka laci hanya bila diminta", () => {
    as("e1"); actions.openShift("", 100000);
    const sale = actions.checkout({ items: [{ productId: "kopi", name: "Kopi Sachet", unit: "sachet", factor: 1, qty: 2, price: 1500, hpp: 1050 }], subtotal: 3000, adjust: 0, total: 3000, paid: 5000, change: 2000, method: "tunai" });
    const a = receiptToEscPos(sale, "Warung Bu Sri", 58);
    const t = text(a);
    expect(t).toContain("TOTAL");
    expect(t).toContain("3.000");
    expect(t).toContain("Kembalian");
    expect(Array.from(a.slice(0, 2))).toEqual([0x1b, 0x40]);
    const hasCut = (b: Uint8Array) => b.some((x, i) => x === 0x1d && b[i + 1] === 0x56);
    const hasKick = (b: Uint8Array) => b.some((x, i) => x === 0x1b && b[i + 1] === 0x70 && b[i + 2] === 0x00);
    expect(hasCut(a)).toBe(true);
    expect(hasKick(a)).toBe(false);
    expect(hasKick(receiptToEscPos(sale, "Warung Bu Sri", 80, { kick: true }))).toBe(true);
    expect(Array.from(linesToEscPos(["Bukti setor", "Total Rp1.000"])).length).toBeGreaterThan(10);
  });
});

describe("Timbangan serial", () => {
  it("mengurai format umum menjadi kilogram", () => {
    expect(parseScaleLine("ST,GS,   0.250kg")).toBe(0.25);
    expect(parseScaleLine("  1.500 kg")).toBe(1.5);
    expect(parseScaleLine("+000.250 kg")).toBe(0.25);
    expect(parseScaleLine("  250 g")).toBe(0.25);
    expect(parseScaleLine("ww001,250kg")).toBe(1.25);
    expect(parseScaleLine("US,GS,   0.250kg")).toBe(null);
    expect(parseScaleLine("")).toBe(null);
    expect(parseScaleLine("ERR 12")).toBe(null);
  });

  it("memecah potongan data serial menjadi baris utuh", () => {
    const a = splitScaleChunk("", "ST,GS,  0.2");
    expect(a.lines).toEqual([]);
    const b = splitScaleChunk(a.rest, "50kg\r\nST,GS,  0.300kg\r\nST,G");
    expect(b.lines).toEqual(["ST,GS,  0.250kg", "ST,GS,  0.300kg"]);
    expect(b.rest).toBe("ST,G");
  });
});

describe("Penasihat bisnis", () => {
  beforeEach(() => { resetData(); sessionStorage.clear(); });

  it("ringkasan untuk AI cloud tidak memuat nama atau nomor pelanggan dan pegawai", () => {
    const s = getState();
    const json = JSON.stringify(buildAdvisorPayload(s));
    for (const c of s.customers) { expect(json).not.toContain(c.name); if (c.phone) expect(json).not.toContain(c.phone); }
    for (const e of s.employees) expect(json).not.toContain(e.name);
    expect(json).toContain("periode");
  });

  it("hari besar dan gajian", () => {
    const ev = upcomingEvents(new Date(2027, 1, 1).getTime());
    expect(ev[0].name).toBe("Ramadan");
    expect(ev[0].days).toBe(7);
    expect(paydayHint(new Date(2026, 10, 27).getTime())).not.toBe(null);
    expect(paydayHint(new Date(2026, 10, 15).getTime())).toBe(null);
  });

  it("risiko kasbon naik bila limit hampir habis dan lewat jatuh tempo", () => {
    const c = { id: "r1", name: "X", phone: "", limit: 10000, payday: 25 };
    const old = new Date(2026, 0, 10).getTime();
    const s = { ...getState(), customers: [c], ledger: [{ id: "l", customerId: "r1", ts: old, desc: "x", debit: 9500, credit: 0 }] };
    const r = kasbonRisk(s, c, new Date(2026, 1, 20).getTime());
    expect(r.level).toBe("tinggi");
    expect(r.reasons.length).toBeGreaterThan(1);
    const ok = kasbonRisk({ ...s, ledger: [] }, c, new Date(2026, 1, 20).getTime());
    expect(ok.level).toBe("rendah");
  });

  it("saran lokal tidak mengubah data", () => {
    const before = JSON.stringify(getState());
    expect(advisorTips(getState()).length).toBeGreaterThan(0);
    expect(JSON.stringify(getState())).toBe(before);
  });
});

describe("Bukti setor dan surat jalan", () => {
  it("bukti setor memuat rumus terjual dan total setor", () => {
    const l = settlementLines({ owner: "Bu Ani", item: "Roti Goreng", received: 20, sold: 12, sisa: 5, basi: 3, ownerPrice: 1500, sellPrice: 2000, date: new Date(2026, 10, 15).getTime() }, "Warung Bu Sri").join("\n");
    expect(l).toContain("Bu Ani");
    expect(l).toContain("Terjual : 12");
    expect(l).toContain("18.000");
    expect(l).toContain("6.000");
  });
  it("surat jalan memuat barang dan kolom tanda tangan", () => {
    const l = transferLines({ id: "T1", ts: Date.now(), fromName: "Cabang A", toName: "Cabang B", note: "", items: [{ name: "Kopi Sachet", unit: "sachet", qtyBase: 40 }] }).join("\n");
    expect(l).toContain("Cabang B");
    expect(l).toContain("Kopi Sachet  40 sachet");
    expect(l).toContain("Penerima");
  });
});
