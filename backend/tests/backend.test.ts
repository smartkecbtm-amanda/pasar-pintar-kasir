import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { advisor, ppobPurchase, qrisCreate, qrisStatus, qrisWebhook } from "../supabase/functions/_shared/handlers.ts";
import { digiflazz, mapMidtransStatus, md5, midtransQris, verifyMidtransSignature } from "../supabase/functions/_shared/providers.ts";
import { parseAdvice, validateSummary } from "../supabase/functions/_shared/advisor.ts";
import type { Ctx } from "../supabase/functions/_shared/supa.ts";

const S1 = "11111111-1111-4111-8111-111111111111";
const S2 = "22222222-2222-4222-8222-222222222222";
const U1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function setup(envExtra: Record<string, string> = {}) {
  let clock = Date.parse("2026-11-15T10:00:00Z");
  const t: Record<string, any[]> = { store_members: [{ store_id: S1, user_id: U1, role: "owner" }], payment_intents: [], ppob_orders: [] };
  const calls: { url: string; init?: RequestInit }[] = [];
  let geminiStatus = 200;
  const env: Record<string, string | undefined> = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service", GEMINI_API_KEY: "g-key", ...envExtra };
  const fetchFake: typeof fetch = async (input, init) => {
    const url = String(input); calls.push({ url, init });
    const method = init?.method ?? "GET";
    if (url.endsWith("/auth/v1/user")) return (init?.headers as Record<string, string>)?.["Authorization"] === "Bearer good" ? Response.json({ id: U1, email: "a@b.c" }) : new Response("{}", { status: 401 });
    if (url.includes("/rest/v1/")) {
      const [table, qs = ""] = url.split("/rest/v1/")[1].split("?");
      const filters = qs.split("&").filter((p) => p.includes("=eq.")).map((p) => { const [k, v] = p.split("=eq."); return [k, decodeURIComponent(v)] as const; });
      const match = (r: any) => filters.every(([k, v]) => String(r[k]) === v);
      const rows = (t[table] ??= []);
      if (method === "GET") return Response.json(rows.filter(match));
      if (method === "POST") { const row = { id: crypto.randomUUID(), created_at: new Date(clock).toISOString(), status: "pending", ...JSON.parse(String(init?.body)) }; rows.push(row); return Response.json([row]); }
      if (method === "PATCH") { const hit = rows.filter(match); hit.forEach((r) => Object.assign(r, JSON.parse(String(init?.body)))); return Response.json(hit); }
    }
    if (url.startsWith("https://generativelanguage.googleapis.com")) {
      if (geminiStatus !== 200) return new Response("{}", { status: geminiStatus });
      return Response.json({ candidates: [{ content: { parts: [{ text: "Saran:\n- Jadikan paket hemat untuk barang yang tidak laku selama 30 hari.\n- Naikkan stok beras dan minyak menjelang awal bulan.\n**3.** Tagih pelanggan kasbon yang sudah lewat jatuh tempo.\nok" }] } }] });
    }
    if (url.includes("midtrans.com/v2/charge")) return Response.json({ status_code: "201", qr_string: "00020101...", actions: [{ name: "generate-qr-code", url: "https://qr.example/1.png" }], expiry_time: "2026-11-15 17:15:00" });
    if (url.includes("api.digiflazz.com")) return Response.json({ data: { status: "Sukses", sn: "SN123", message: "ok", price: 9800 } });
    return new Response("not found", { status: 404 });
  };
  const ctx: Ctx = { fetch: fetchFake, env: (k) => env[k], now: () => clock };
  const req = (body: unknown, token = "good", method = "POST") => new Request("https://f.test/x", { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: method === "POST" ? JSON.stringify(body) : undefined });
  return { t, ctx, req, calls, advance: (ms: number) => { clock += ms; }, setGemini: (s: number) => { geminiStatus = s; } };
}
const j = async (r: Response) => (await r.json()) as Record<string, any>;

describe("kriptografi dan adapter", () => {
  it("MD5 sesuai vektor uji standar", () => {
    expect(md5("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(md5("abc")).toBe("900150983cd24fb0d6963f7d28e17f72");
    expect(md5("The quick brown fox jumps over the lazy dog")).toBe("9e107d9d372bb6826bd81d3542a419d6");
    expect(md5("a".repeat(100))).toBe(createHash("md5").update("a".repeat(100)).digest("hex"));
  });

  it("signature Midtrans: benar diterima, salah ditolak", async () => {
    const n = { order_id: "PP-1", status_code: "200", gross_amount: "10000.00", signature_key: "" };
    n.signature_key = createHash("sha512").update(`PP-1200` + `10000.00` + "SK").digest("hex");
    expect(await verifyMidtransSignature(n, "SK")).toBe(true);
    expect(await verifyMidtransSignature(n, "KUNCI-LAIN")).toBe(false);
    expect(await verifyMidtransSignature({ ...n, gross_amount: "1.00" }, "SK")).toBe(false);
    expect(await verifyMidtransSignature({ ...n, signature_key: "" }, "SK")).toBe(false);
  });

  it("Midtrans: permintaan charge dan pemetaan status", async () => {
    const s = setup();
    const p = midtransQris({ serverKey: "SK", sandbox: true }, s.ctx.fetch);
    const r = await p.create({ orderId: "PP-9", amount: 15000 });
    const call = s.calls[0];
    expect(call.url).toBe("https://api.sandbox.midtrans.com/v2/charge");
    expect((call.init?.headers as Record<string, string>)["Authorization"]).toBe(`Basic ${btoa("SK:")}`);
    const sent = JSON.parse(String(call.init?.body));
    expect(sent.payment_type).toBe("qris");
    expect(sent.transaction_details.gross_amount).toBe(15000);
    expect(r.qrUrl).toBe("https://qr.example/1.png");
    expect(r.expiresAt).toBe("2026-11-15T10:15:00.000Z");
    expect(mapMidtransStatus("settlement")).toBe("paid");
    expect(mapMidtransStatus("expire")).toBe("expired");
    expect(mapMidtransStatus("deny")).toBe("failed");
    expect(mapMidtransStatus("pending")).toBe("pending");
  });

  it("Digiflazz: tanda tangan = md5(username + apiKey + refId)", async () => {
    const s = setup();
    const p = digiflazz({ username: "user1", apiKey: "key1", testing: true }, s.ctx.fetch);
    const r = await p.purchase({ refId: "REF-0001", sku: "xld10", target: "081234567890" });
    const sent = JSON.parse(String(s.calls[0].init?.body));
    expect(sent.sign).toBe(md5("user1key1REF-0001"));
    expect(sent.buyer_sku_code).toBe("xld10");
    expect(sent.testing).toBe(true);
    expect(r.status).toBe("sukses");
    expect(r.sn).toBe("SN123");
  });

  it("validasi ringkasan AI dan pembersih saran", () => {
    expect(() => validateSummary({ periode: {}, phone: "0812" })).toThrow();
    expect(() => validateSummary({ foo: 1 })).toThrow();
    expect(() => validateSummary("x")).toThrow();
    expect(validateSummary({ periode: { hari7: { omzet: 1 } } })).toBeTruthy();
    expect(parseAdvice("- Saran pertama yang cukup panjang.\n1) Saran kedua yang cukup panjang.\npendek").length).toBe(2);
  });
});

describe("Edge Functions", () => {
  it("wajib login dan hanya POST; CORS preflight", async () => {
    const s = setup();
    expect((await qrisCreate(s.req({}, "salah"), s.ctx)).status).toBe(401);
    expect((await qrisCreate(new Request("https://f.test/x", { method: "POST", body: "{}" }), s.ctx)).status).toBe(401);
    const g = await qrisCreate(s.req({}, "good", "GET"), s.ctx);
    expect(g.status).toBe(405);
    const o = await qrisCreate(new Request("https://f.test/x", { method: "OPTIONS" }), s.ctx);
    expect(o.status).toBe(200);
    expect(o.headers.get("Access-Control-Allow-Headers")).toContain("authorization");
    const restricted = setup({ ALLOWED_ORIGIN: "https://kasir.example" });
    expect((await qrisCreate(restricted.req({}, "good", "GET"), restricted.ctx)).headers.get("Access-Control-Allow-Origin")).toBe("https://kasir.example");
  });

  it("QRIS mock: buat, belum bayar, lalu lunas setelah waktu simulasi", async () => {
    const s = setup({ MOCK_PAY_AFTER_SECONDS: "8" });
    expect((await qrisCreate(s.req({ storeId: S2, amount: 5000 }), s.ctx)).status).toBe(403);
    expect((await qrisCreate(s.req({ storeId: S1, amount: 0 }), s.ctx)).status).toBe(400);
    expect((await qrisCreate(s.req({ storeId: S1, amount: 1.5 }), s.ctx)).status).toBe(400);
    expect((await qrisCreate(s.req({ storeId: "bukan-uuid", amount: 5000 }), s.ctx)).status).toBe(400);
    const c = await j(await qrisCreate(s.req({ storeId: S1, amount: 5000 }), s.ctx));
    expect(c["provider"]).toBe("mock");
    expect(c["qrString"]).toContain("5000");
    expect(s.t["payment_intents"].length).toBe(1);
    expect((await j(await qrisStatus(s.req({ intentId: c["intentId"] }), s.ctx)))["status"]).toBe("pending");
    s.advance(9000);
    const paid = await j(await qrisStatus(s.req({ intentId: c["intentId"] }), s.ctx));
    expect(paid["status"]).toBe("paid");
    expect(s.t["payment_intents"][0].status).toBe("paid");
    expect(s.t["payment_intents"][0].paid_at).toBeTruthy();
    expect((await qrisStatus(s.req({ intentId: crypto.randomUUID() }), s.ctx)).status).toBe(404);
  });

  it("webhook Midtrans: signature, nominal, dan status", async () => {
    const s = setup({ QRIS_PROVIDER: "midtrans", MIDTRANS_SERVER_KEY: "SK" });
    s.t["payment_intents"].push({ id: crypto.randomUUID(), store_id: S1, provider: "midtrans", order_id: "PP-A", amount: 10000, status: "pending", created_at: new Date().toISOString() });
    const sig = (n: Record<string, string>) => createHash("sha512").update(`${n["order_id"]}${n["status_code"]}${n["gross_amount"]}SK`).digest("hex");
    const mk = (over: Record<string, string> = {}) => { const n: Record<string, string> = { order_id: "PP-A", status_code: "200", gross_amount: "10000.00", transaction_status: "settlement", ...over }; n["signature_key"] = over["signature_key"] ?? sig(n); return n; };
    const hook = (n: unknown) => new Request("https://f.test/w", { method: "POST", body: JSON.stringify(n) });
    expect((await qrisWebhook(hook(mk({ signature_key: "palsu" })), s.ctx)).status).toBe(401);
    expect((await qrisWebhook(hook({ ...mk(), gross_amount: "9999.00" }), s.ctx)).status).toBe(401);
    const nilaiBeda = mk({ gross_amount: "5000.00" });
    expect((await qrisWebhook(hook(nilaiBeda), s.ctx)).status).toBe(400);
    expect(s.t["payment_intents"][0].status).toBe("pending");
    expect((await qrisWebhook(hook(mk()), s.ctx)).status).toBe(200);
    expect(s.t["payment_intents"][0].status).toBe("paid");
    expect((await qrisWebhook(hook(mk({ transaction_status: "expire" })), s.ctx)).status).toBe(200);
    expect(s.t["payment_intents"][0].status).toBe("paid");
    expect((await qrisWebhook(hook(mk({ order_id: "TIDAK-ADA" })), s.ctx)).status).toBe(404);
  });

  it("PPOB mock: sukses, gagal, tertunda, idempoten, dan validasi", async () => {
    const s = setup();
    const base = { storeId: S1, kind: "pulsa", sku: "xld10", target: "081234567890", refId: "REF-000001" };
    const a = await j(await ppobPurchase(s.req(base), s.ctx));
    expect(a["status"]).toBe("sukses");
    expect(a["sn"]).toBe("MOCK-REF-000001");
    const again = await j(await ppobPurchase(s.req(base), s.ctx));
    expect(again["orderId"]).toBe(a["orderId"]);
    expect(s.t["ppob_orders"].length).toBe(1);
    expect((await j(await ppobPurchase(s.req({ ...base, refId: "REF-000002", target: "081234567813" }), s.ctx)))["status"]).toBe("gagal");
    const pend = await j(await ppobPurchase(s.req({ ...base, refId: "REF-000003", target: "081234567899" }), s.ctx));
    expect(pend["status"]).toBe("pending");
    expect(s.t["ppob_orders"].length).toBe(3);
    expect((await ppobPurchase(s.req({ ...base, kind: "judi" }), s.ctx)).status).toBe(400);
    expect((await ppobPurchase(s.req({ ...base, target: "; drop table" }), s.ctx)).status).toBe(400);
    expect((await ppobPurchase(s.req({ ...base, storeId: S2 }), s.ctx)).status).toBe(403);
  });

  it("PPOB Digiflazz memakai kredensial dari secret", async () => {
    const s = setup({ PPOB_PROVIDER: "digiflazz", DIGIFLAZZ_USERNAME: "u", DIGIFLAZZ_API_KEY: "k" });
    const r = await j(await ppobPurchase(s.req({ storeId: S1, kind: "token", sku: "pln20", target: "5432100123", refId: "REF-DIGI-01" }), s.ctx));
    expect(r["status"]).toBe("sukses");
    expect(s.calls.some((c) => c.url.includes("api.digiflazz.com"))).toBe(true);
    const bad = setup({ PPOB_PROVIDER: "digiflazz" });
    expect((await ppobPurchase(bad.req({ storeId: S1, kind: "token", sku: "pln20", target: "5432100123", refId: "REF-DIGI-02" }), bad.ctx)).status).toBe(500);
  });

  it("AI Advisor: hanya ringkasan agregat; saran dibersihkan; galat layanan ditangani", async () => {
    const s = setup();
    const summary = { periode: { hari7: { omzet: 1000000, laba: 200000, transaksi: 80 } }, stok: { mati: 3, nilaiMati: 450000 } };
    const ok = await j(await advisor(s.req({ summary }), s.ctx));
    expect(ok["advice"].length).toBe(3);
    const sent = JSON.parse(String(s.calls.find((c) => c.url.includes("generativelanguage"))?.init?.body));
    expect(sent.contents[0].parts[0].text).toContain("hanya beri saran");
    const gHeaders = s.calls.find((c) => c.url.includes("generativelanguage"))?.init?.headers as Record<string, string>;
    expect(gHeaders["x-goog-api-key"]).toBe("g-key");
    expect(s.calls.find((c) => c.url.includes("generativelanguage"))?.url).not.toContain("g-key");
    expect((await advisor(s.req({ summary: { periode: {}, phone: "0812" } }), s.ctx)).status).toBe(400);
    s.setGemini(429);
    expect((await advisor(s.req({ summary }), s.ctx)).status).toBe(502);
    const nokey = setup({ GEMINI_API_KEY: "" });
    expect((await advisor(nokey.req({ summary }), nokey.ctx)).status).toBe(500);
  });
});
