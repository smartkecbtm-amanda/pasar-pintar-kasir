import { customerBalance, type Customer, type State } from "./store";
import { dayStats, kasbonStatus, restockRadar, topProducts, validSales } from "./operations";
import { rp } from "./format";
import { callFunction, cloudConfig } from "./cloud";

const DAY = 86400000;

/** Ringkasan agregat untuk AI cloud: tanpa nama pelanggan, nomor telepon, atau data pegawai. */
export function buildAdvisorPayload(s: State, now = Date.now()) {
  const t0 = new Date(now); t0.setHours(0, 0, 0, 0);
  const day = t0.getTime();
  const w = dayStats(s, day - 6 * DAY, day + DAY);
  const m = dayStats(s, day - 29 * DAY, day + DAY);
  const radar = restockRadar(s, now);
  const dead = radar.filter((r) => r.status === "Mati");
  const top = topProducts(s, 30, now);
  const status = s.customers.map((c) => kasbonStatus(s, c, now));
  return {
    periode: { hari7: { omzet: Math.round(w.omzet), laba: Math.round(w.net), transaksi: w.count }, hari30: { omzet: Math.round(m.omzet), laba: Math.round(m.net), transaksi: m.count } },
    barangTerlaris: top.byQty.slice(0, 5).map((x) => ({ nama: x.name, qty: Math.round(x.qty) })),
    barangUntung: top.byProfit.slice(0, 5).map((x) => ({ nama: x.name, laba: Math.round(x.profit) })),
    stok: { kritis: radar.filter((r) => r.status === "Kritis").length, menipis: radar.filter((r) => r.status === "Menipis").length, mati: dead.length, nilaiMati: Math.round(dead.reduce((a, r) => a + r.p.stock * r.p.hpp, 0)) },
    kasbon: { totalPiutang: Math.round(s.customers.reduce((a, c) => a + Math.max(0, customerBalance(s, c.id)), 0)), pelangganMerah: status.filter((x) => x === "merah").length, pelangganKuning: status.filter((x) => x === "kuning").length },
    hutangDagang: Math.round(s.payables.reduce((a, p) => a + Math.max(0, p.amount - p.paid), 0)),
    deposit: Math.round(s.deposit),
  };
}
export type AdvisorPayload = ReturnType<typeof buildAdvisorPayload>;

/** Perkiraan hari besar (kalender hijriah bergeser tiap tahun; cek kalender resmi). */
const EVENTS: { name: string; date: string; hint: string }[] = [
  { name: "Ramadan", date: "2027-02-08", hint: "naikkan stok gula, minyak, tepung, sirup, kurma" },
  { name: "Idulfitri", date: "2027-03-10", hint: "stok sembako, kue kaleng, minuman; siapkan uang kecil untuk kembalian" },
  { name: "Iduladha", date: "2027-05-17", hint: "bumbu dapur, kantong plastik, minyak" },
  { name: "Ramadan", date: "2028-01-28", hint: "naikkan stok gula, minyak, tepung, sirup, kurma" },
  { name: "Natal", date: "2026-12-25", hint: "minuman, camilan, bahan kue" },
  { name: "Tahun Baru", date: "2027-01-01", hint: "minuman, camilan, arang/gas" },
];
export function upcomingEvents(now = Date.now(), horizonDays = 21) {
  return EVENTS.map((e) => ({ ...e, days: Math.ceil((new Date(`${e.date}T00:00:00`).getTime() - now) / DAY) })).filter((e) => e.days >= 0 && e.days <= horizonDays).sort((a, b) => a.days - b.days);
}
/** Awal bulan (gajian): belanja pelanggan naik. */
export function paydayHint(now = Date.now()) {
  const d = new Date(now).getDate();
  return d >= 25 || d <= 5 ? "Mendekati/awal bulan (gajian): siapkan stok beras, minyak, telur, mi instan lebih banyak." : null;
}

export function kasbonRisk(s: State, c: Customer, now = Date.now()) {
  const balance = Math.max(0, customerBalance(s, c.id));
  const reasons: string[] = [];
  let score = 0;
  const use = c.limit > 0 ? balance / c.limit : 0;
  if (use >= 0.9) { score += 2; reasons.push("pemakaian limit di atas 90%"); } else if (use >= 0.6) { score += 1; reasons.push("pemakaian limit di atas 60%"); }
  const st = kasbonStatus(s, c, now);
  if (st === "merah") { score += 2; reasons.push("sudah lewat jatuh tempo"); } else if (st === "kuning") { score += 1; reasons.push("jatuh tempo dalam 3 hari"); }
  const recent = s.ledger.filter((l) => l.customerId === c.id && l.ts >= now - 90 * DAY);
  const debit = recent.reduce((a, l) => a + l.debit, 0), credit = recent.reduce((a, l) => a + l.credit, 0);
  if (debit > 0 && credit / debit < 0.3) { score += 1; reasons.push("pembayaran 90 hari terakhir kurang dari 30% dari utang baru"); }
  return { level: (score >= 4 ? "tinggi" : score >= 2 ? "sedang" : "rendah") as "tinggi" | "sedang" | "rendah", score, reasons };
}

/** Saran lokal (tanpa internet): modal tertahan, musiman, kasbon berisiko, kesehatan arus kas. */
export function advisorTips(s: State, now = Date.now()): string[] {
  const tips: string[] = [];
  const p = buildAdvisorPayload(s, now);
  if (p.stok.mati > 0) tips.push(`Ada ${p.stok.mati} barang tidak laku >30 hari dengan modal tertahan ${rp(p.stok.nilaiMati)}. Jadikan paket hemat atau diskon cuci gudang, dan hentikan kulakan barang itu.`);
  if (p.stok.kritis > 0) tips.push(`${p.stok.kritis} barang hampir habis: masukkan ke daftar belanja pasar hari ini.`);
  const hint = paydayHint(now);
  if (hint) tips.push(hint);
  for (const e of upcomingEvents(now)) tips.push(`${e.name} sekitar ${e.days} hari lagi (perkiraan): ${e.hint}.`);
  const risky = s.customers.map((c) => ({ c, r: kasbonRisk(s, c, now) })).filter((x) => x.r.level === "tinggi" && customerBalance(s, x.c.id) > 0);
  if (risky.length) tips.push(`${risky.length} pelanggan kasbon berisiko tinggi: tagih lebih dulu dan tahan penambahan kasbon.`);
  const rasio = p.periode.hari30.omzet > 0 ? p.kasbon.totalPiutang / p.periode.hari30.omzet : 0;
  if (rasio > 0.25) tips.push(`Piutang kasbon ${Math.round(rasio * 100)}% dari omzet 30 hari. Batasi limit baru agar kas operasional tidak seret.`);
  if (p.hutangDagang > 0 && p.hutangDagang > p.periode.hari7.laba * 2) tips.push(`Hutang dagang ${rp(p.hutangDagang)} lebih besar dari dua kali laba mingguan; jadwalkan pelunasan sebelum jatuh tempo.`);
  const top = p.barangTerlaris[0];
  if (top) tips.push(`Barang terlaris 30 hari: ${top.nama}. Jaga stoknya agar tidak pernah kosong.`);
  return tips;
}

/** Minta saran AI cloud (Gemini lewat Edge Function). Hanya ringkasan agregat yang dikirim, bersifat baca-saja. */
export async function askCloudAdvisor(s: State): Promise<string[]> {
  const cfg = cloudConfig();
  if (!cfg) throw new Error("Cloud belum dikonfigurasi");
  const res = await callFunction<{ advice: string[] }>(cfg, "ai-advisor", { summary: buildAdvisorPayload(s) });
  return res.advice;
}
export { validSales };
