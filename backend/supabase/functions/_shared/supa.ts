/** Akses Supabase tanpa pustaka tambahan: hanya fetch ke Auth dan PostgREST. */
export type Ctx = { fetch: typeof fetch; env: (k: string) => string | undefined; now: () => number };

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const denoCtx = (): Ctx => ({
  fetch: (...a) => fetch(...a),
  env: (k) => (globalThis as unknown as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get(k),
  now: () => Date.now(),
});

export function need(ctx: Ctx, key: string): string {
  const v = ctx.env(key);
  if (!v) throw new HttpError(500, `Konfigurasi ${key} belum diisi`);
  return v;
}

/** Pengguna dari token Bearer (divalidasi oleh Supabase Auth). */
export async function authUser(req: Request, ctx: Ctx): Promise<{ id: string; email?: string }> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new HttpError(401, "Belum masuk");
  const res = await ctx.fetch(`${need(ctx, "SUPABASE_URL")}/auth/v1/user`, { headers: { apikey: need(ctx, "SUPABASE_ANON_KEY"), Authorization: auth } });
  if (!res.ok) throw new HttpError(401, "Sesi tidak valid");
  const u = (await res.json()) as { id?: string; email?: string };
  if (!u.id) throw new HttpError(401, "Sesi tidak valid");
  return { id: u.id, email: u.email };
}

/** Panggilan PostgREST dengan service role (melewati RLS; selalu cek keanggotaan sendiri). */
export async function db<T = unknown>(ctx: Ctx, method: "GET" | "POST" | "PATCH", path: string, body?: unknown): Promise<T> {
  const key = need(ctx, "SUPABASE_SERVICE_ROLE_KEY");
  const res = await ctx.fetch(`${need(ctx, "SUPABASE_URL")}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new HttpError(500, `Database error (${res.status})`);
  return (await res.json().catch(() => [])) as T;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export async function assertMember(ctx: Ctx, userId: string, storeId: string) {
  if (!isUuid(storeId) || !isUuid(userId)) throw new HttpError(400, "ID tidak valid");
  const rows = await db<unknown[]>(ctx, "GET", `store_members?store_id=eq.${storeId}&user_id=eq.${userId}&select=role`);
  if (!rows.length) throw new HttpError(403, "Bukan anggota toko ini");
}
