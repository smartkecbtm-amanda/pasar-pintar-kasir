/**
 * Adapter penyedia pembayaran (QRIS) dan PPOB. Pilih lewat secret QRIS_PROVIDER / PPOB_PROVIDER:
 *   mock (default, untuk uji alur tanpa akun), midtrans (QRIS), digiflazz (PPOB).
 * Adapter nyata ditulis dari dokumentasi publik dan BELUM diuji dengan akun sandbox: uji dulu di sandbox sebelum produksi.
 */
export type QrisStatus = "pending" | "paid" | "expired" | "failed";
export type QrisCreated = { qrString?: string; qrUrl?: string; expiresAt?: string; raw?: unknown };
export interface QrisProvider {
  name: string;
  create(i: { orderId: string; amount: number }): Promise<QrisCreated>;
  status(orderId: string, createdAtMs: number): Promise<QrisStatus>;
}
export type PpobStatus = "pending" | "sukses" | "gagal";
export type PpobResult = { status: PpobStatus; sn?: string; message?: string; price?: number; raw?: unknown };
export interface PpobProvider {
  name: string;
  purchase(i: { refId: string; sku: string; target: string }): Promise<PpobResult>;
}
type F = typeof fetch;

/* ---------------- mock ---------------- */
export function mockQris(payAfterSeconds = 8, now: () => number = Date.now): QrisProvider {
  return {
    name: "mock",
    async create({ orderId, amount }) { return { qrString: `MOCK-QRIS|${orderId}|${amount}`, expiresAt: new Date(now() + 15 * 60_000).toISOString() }; },
    async status(_orderId, createdAtMs) { return now() - createdAtMs >= payAfterSeconds * 1000 ? "paid" : "pending"; },
  };
}
/** Target berakhiran 13 gagal, 99 tertunda, lainnya sukses. */
export function mockPpob(): PpobProvider {
  return {
    name: "mock",
    async purchase({ refId, target }) {
      if (target.endsWith("13")) return { status: "gagal", message: "Simulasi gagal" };
      if (target.endsWith("99")) return { status: "pending", message: "Simulasi tertunda" };
      return { status: "sukses", sn: `MOCK-${refId}`, message: "Simulasi sukses" };
    },
  };
}

/* ---------------- midtrans (QRIS) ---------------- */
export const midtransBase = (sandbox: boolean) => (sandbox ? "https://api.sandbox.midtrans.com" : "https://api.midtrans.com");
const basic = (serverKey: string) => `Basic ${btoa(`${serverKey}:`)}`;
export function midtransQris(cfg: { serverKey: string; sandbox: boolean }, f: F = fetch): QrisProvider {
  const base = midtransBase(cfg.sandbox);
  return {
    name: "midtrans",
    async create({ orderId, amount }) {
      const res = await f(`${base}/v2/charge`, {
        method: "POST",
        headers: { Authorization: basic(cfg.serverKey), "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ payment_type: "qris", transaction_details: { order_id: orderId, gross_amount: amount }, qris: { acquirer: "gopay" } }),
      });
      const j = (await res.json().catch(() => ({}))) as Record<string, any>;
      if (!res.ok || (j["status_code"] && !["200", "201"].includes(String(j["status_code"])))) throw new Error(`Midtrans menolak pembuatan QRIS: ${j["status_message"] ?? res.status}`);
      const qr = (j["actions"] as { name: string; url: string }[] | undefined)?.find((a) => a.name === "generate-qr-code");
      return { qrString: j["qr_string"] as string | undefined, qrUrl: qr?.url, expiresAt: j["expiry_time"] ? new Date(String(j["expiry_time"]).replace(" ", "T") + "+07:00").toISOString() : undefined, raw: j };
    },
    async status(orderId) {
      const res = await f(`${base}/v2/${encodeURIComponent(orderId)}/status`, { headers: { Authorization: basic(cfg.serverKey), Accept: "application/json" } });
      const j = (await res.json().catch(() => ({}))) as Record<string, any>;
      return mapMidtransStatus(String(j["transaction_status"] ?? ""));
    },
  };
}
export function mapMidtransStatus(s: string): QrisStatus {
  if (s === "settlement" || s === "capture") return "paid";
  if (s === "expire") return "expired";
  if (s === "cancel" || s === "deny" || s === "failure") return "failed";
  return "pending";
}
export async function sha512Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
/** signature_key = SHA512(order_id + status_code + gross_amount + serverKey) */
export async function verifyMidtransSignature(n: Record<string, unknown>, serverKey: string): Promise<boolean> {
  const sig = String(n["signature_key"] ?? "");
  if (!sig) return false;
  const expected = await sha512Hex(`${n["order_id"]}${n["status_code"]}${n["gross_amount"]}${serverKey}`);
  return sig.length === expected.length && sig === expected;
}

/* ---------------- digiflazz (PPOB) ---------------- */
export function md5(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  const len = bytes.length;
  const total = Math.ceil((len + 9) / 64) * 64;
  const buf = new Uint8Array(total);
  buf.set(bytes); buf[len] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(total - 8, (len * 8) >>> 0, true);
  view.setUint32(total - 4, Math.floor((len * 8) / 2 ** 32), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let off = 0; off < total; off += 64) {
    const M = Array.from({ length: 16 }, (_, i) => view.getUint32(off + i * 4, true));
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + (((F << S[i]) | (F >>> (32 - S[i]))) >>> 0)) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const hex = (n: number) => Array.from({ length: 4 }, (_, i) => ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, "0")).join("");
  return hex(a0) + hex(b0) + hex(c0) + hex(d0);
}
export function digiflazz(cfg: { username: string; apiKey: string; testing: boolean }, f: F = fetch): PpobProvider {
  return {
    name: "digiflazz",
    async purchase({ refId, sku, target }) {
      const res = await f("https://api.digiflazz.com/v1/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cfg.username, buyer_sku_code: sku, customer_no: target, ref_id: refId, sign: md5(`${cfg.username}${cfg.apiKey}${refId}`), ...(cfg.testing ? { testing: true } : {}) }),
      });
      const j = (await res.json().catch(() => ({}))) as { data?: Record<string, any> };
      const d = j.data ?? {};
      const st = String(d["status"] ?? "").toLowerCase();
      const status: PpobStatus = st === "sukses" ? "sukses" : st === "gagal" ? "gagal" : "pending";
      return { status, sn: d["sn"] ? String(d["sn"]) : undefined, message: d["message"] ? String(d["message"]) : undefined, price: typeof d["price"] === "number" ? d["price"] : undefined, raw: d };
    },
  };
}

export function qrisProviderFromEnv(env: (k: string) => string | undefined, f: F = fetch, now: () => number = Date.now): QrisProvider {
  const name = env("QRIS_PROVIDER") || "mock";
  if (name === "midtrans") {
    const serverKey = env("MIDTRANS_SERVER_KEY");
    if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY belum diisi");
    return midtransQris({ serverKey, sandbox: env("MIDTRANS_SANDBOX") !== "false" }, f);
  }
  if (name === "mock") return mockQris(Number(env("MOCK_PAY_AFTER_SECONDS") ?? 8), now);
  throw new Error(`QRIS_PROVIDER tidak dikenal: ${name}`);
}
export function ppobProviderFromEnv(env: (k: string) => string | undefined, f: F = fetch): PpobProvider {
  const name = env("PPOB_PROVIDER") || "mock";
  if (name === "digiflazz") {
    const username = env("DIGIFLAZZ_USERNAME"), apiKey = env("DIGIFLAZZ_API_KEY");
    if (!username || !apiKey) throw new Error("DIGIFLAZZ_USERNAME / DIGIFLAZZ_API_KEY belum diisi");
    return digiflazz({ username, apiKey, testing: env("DIGIFLAZZ_TESTING") !== "false" }, f);
  }
  if (name === "mock") return mockPpob();
  throw new Error(`PPOB_PROVIDER tidak dikenal: ${name}`);
}
