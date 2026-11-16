import { corsHeaders, json } from "./cors.ts";
import { HttpError, assertMember, authUser, db, isUuid, need, type Ctx } from "./supa.ts";
import { qrisProviderFromEnv, ppobProviderFromEnv, verifyMidtransSignature, mapMidtransStatus, type QrisStatus } from "./providers.ts";
import { buildPrompt, parseAdvice, validateSummary } from "./advisor.ts";

type H = (req: Request, ctx: Ctx) => Promise<Response>;

/** Bungkus handler: CORS, hanya POST, ubah HttpError menjadi respons JSON. */
export function endpoint(handler: H, opts: { cors?: boolean } = {}) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    const cors = opts.cors === false ? {} : corsHeaders(ctx.env);
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json(405, { error: "Gunakan POST" }, cors);
    try {
      const res = await handler(req, ctx);
      Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    } catch (e) {
      if (e instanceof HttpError) return json(e.status, { error: e.message }, cors);
      return json(500, { error: e instanceof Error ? e.message : "Kesalahan server" }, cors);
    }
  };
}

const body = async (req: Request): Promise<Record<string, unknown>> => {
  const text = await req.text();
  if (text.length > 20_000) throw new HttpError(413, "Permintaan terlalu besar");
  try { return JSON.parse(text) as Record<string, unknown>; } catch { throw new HttpError(400, "JSON tidak valid"); }
};

/* ---------------- AI Advisor (Gemini) ---------------- */
export const advisor = endpoint(async (req, ctx) => {
  await authUser(req, ctx);
  const b = await body(req);
  let summary: Record<string, unknown>;
  try { summary = validateSummary(b["summary"]); } catch (e) { throw new HttpError(400, e instanceof Error ? e.message : "Ringkasan tidak valid"); }
  const key = need(ctx, "GEMINI_API_KEY");
  const model = ctx.env("GEMINI_MODEL") || "gemini-2.0-flash";
  const res = await ctx.fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: buildPrompt(summary) }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 700 } }),
  });
  if (!res.ok) throw new HttpError(502, `Layanan AI menolak permintaan (${res.status})`);
  const j = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n") ?? "";
  const advice = parseAdvice(text);
  if (!advice.length) throw new HttpError(502, "AI tidak memberi saran yang bisa dibaca");
  return json(200, { advice });
});

/* ---------------- QRIS dinamis ---------------- */
export const qrisCreate = endpoint(async (req, ctx) => {
  const user = await authUser(req, ctx);
  const b = await body(req);
  const storeId = b["storeId"]; const amount = Number(b["amount"]);
  if (!isUuid(storeId)) throw new HttpError(400, "storeId tidak valid");
  if (!Number.isInteger(amount) || amount < 1 || amount > 10_000_000) throw new HttpError(400, "Nominal harus bilangan bulat 1 sampai 10.000.000");
  await assertMember(ctx, user.id, storeId);
  const provider = qrisProviderFromEnv(ctx.env, ctx.fetch, ctx.now);
  const orderId = `PP-${storeId.slice(0, 8)}-${ctx.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const qr = await provider.create({ orderId, amount });
  const rows = await db<{ id: string }[]>(ctx, "POST", "payment_intents", { store_id: storeId, provider: provider.name, order_id: orderId, amount, qr_string: qr.qrString ?? null, qr_url: qr.qrUrl ?? null, expires_at: qr.expiresAt ?? null, raw: qr.raw ?? null });
  return json(200, { intentId: rows[0]?.id, orderId, provider: provider.name, qrString: qr.qrString, qrUrl: qr.qrUrl, expiresAt: qr.expiresAt, amount });
});

type Intent = { id: string; store_id: string; provider: string; order_id: string; amount: number; status: QrisStatus; created_at: string };
export const qrisStatus = endpoint(async (req, ctx) => {
  const user = await authUser(req, ctx);
  const b = await body(req);
  if (!isUuid(b["intentId"])) throw new HttpError(400, "intentId tidak valid");
  const rows = await db<Intent[]>(ctx, "GET", `payment_intents?id=eq.${b["intentId"]}&select=id,store_id,provider,order_id,amount,status,created_at`);
  const it = rows[0];
  if (!it) throw new HttpError(404, "Pembayaran tidak ditemukan");
  await assertMember(ctx, user.id, it.store_id);
  let status = it.status;
  if (status === "pending") {
    const provider = qrisProviderFromEnv(ctx.env, ctx.fetch, ctx.now);
    status = await provider.status(it.order_id, new Date(it.created_at).getTime());
    if (status !== "pending") await db(ctx, "PATCH", `payment_intents?id=eq.${it.id}&status=eq.pending`, { status, paid_at: status === "paid" ? new Date(ctx.now()).toISOString() : null });
  }
  return json(200, { status, amount: Number(it.amount), orderId: it.order_id });
});

/** Notifikasi Midtrans (tanpa login; keabsahan dari signature_key). */
export const qrisWebhook = endpoint(async (req, ctx) => {
  const n = await body(req);
  if (!(await verifyMidtransSignature(n, need(ctx, "MIDTRANS_SERVER_KEY")))) throw new HttpError(401, "Signature tidak valid");
  const orderId = String(n["order_id"] ?? "");
  const rows = await db<Intent[]>(ctx, "GET", `payment_intents?order_id=eq.${encodeURIComponent(orderId)}&select=id,store_id,provider,order_id,amount,status,created_at`);
  const it = rows[0];
  if (!it || it.provider !== "midtrans") throw new HttpError(404, "Pesanan tidak dikenal");
  if (Math.round(Number(n["gross_amount"])) !== Math.round(Number(it.amount))) throw new HttpError(400, "Nominal tidak cocok");
  const status = mapMidtransStatus(String(n["transaction_status"] ?? ""));
  if (status !== "pending" && it.status === "pending") await db(ctx, "PATCH", `payment_intents?id=eq.${it.id}&status=eq.pending`, { status, paid_at: status === "paid" ? new Date(ctx.now()).toISOString() : null });
  return json(200, { ok: true });
}, { cors: false });

/* ---------------- PPOB ---------------- */
const KINDS = ["pulsa", "data", "token", "ewallet", "transfer", "tagihan"];
type Order = { id: string; status: "pending" | "sukses" | "gagal"; sn: string | null; message: string | null };
export const ppobPurchase = endpoint(async (req, ctx) => {
  const user = await authUser(req, ctx);
  const b = await body(req);
  const { storeId, kind, sku, target, refId } = b as Record<string, unknown>;
  if (!isUuid(storeId)) throw new HttpError(400, "storeId tidak valid");
  if (typeof kind !== "string" || !KINDS.includes(kind)) throw new HttpError(400, "Jenis layanan tidak dikenal");
  if (typeof sku !== "string" || !/^[\w.\-]{2,40}$/.test(sku)) throw new HttpError(400, "SKU tidak valid");
  if (typeof target !== "string" || !/^[\w\-]{3,30}$/.test(target)) throw new HttpError(400, "Nomor tujuan tidak valid");
  if (typeof refId !== "string" || !/^[\w\-]{6,60}$/.test(refId)) throw new HttpError(400, "refId tidak valid");
  await assertMember(ctx, user.id, storeId);
  const provider = ppobProviderFromEnv(ctx.env, ctx.fetch);
  const existing = (await db<Order[]>(ctx, "GET", `ppob_orders?ref_id=eq.${encodeURIComponent(refId)}&store_id=eq.${storeId}&select=id,status,sn,message`))[0];
  if (existing && existing.status !== "pending") return json(200, { orderId: existing.id, status: existing.status, sn: existing.sn, message: existing.message });
  const r = await provider.purchase({ refId, sku, target });
  const row = { status: r.status, sn: r.sn ?? null, message: r.message ?? null, price: r.price ?? null, raw: r.raw ?? null, updated_at: new Date(ctx.now()).toISOString() };
  let id = existing?.id;
  if (existing) await db(ctx, "PATCH", `ppob_orders?id=eq.${existing.id}`, row);
  else id = (await db<{ id: string }[]>(ctx, "POST", "ppob_orders", { store_id: storeId, provider: provider.name, ref_id: refId, kind, sku, target, ...row }))[0]?.id;
  return json(200, { orderId: id, status: r.status, sn: r.sn, message: r.message, price: r.price });
});
