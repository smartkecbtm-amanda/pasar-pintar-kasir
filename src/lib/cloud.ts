import { useSyncExternalStore } from "react";
import { applyRemote, getState, onStateChange, setCloudActive, setPinHooks, type State, type StockMove, type Transfer } from "./store";
import * as P from "./persist";

/* ====================== konfigurasi & transport ====================== */
export type CloudConfig = { url: string; anonKey: string; storeId: string };
export type Transport = (fn: string, args: Record<string, unknown>) => Promise<any>;
export type Row = { seq: number; entity: string; entity_id: string; data: any; deleted: boolean; ts: number };

export function cloudBase(): Pick<CloudConfig, "url" | "anonKey"> | null {
  const env = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {});
  const url = env["VITE_SUPABASE_URL"]; const anonKey = env["VITE_SUPABASE_ANON_KEY"] ?? env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  return url && anonKey ? { url: url.replace(/\/$/, ""), anonKey } : null;
}
export function cloudConfig(): CloudConfig | null {
  const base = cloudBase();
  if (!base) return null;
  const env = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {});
  let stored: string | null = null;
  try { stored = localStorage.getItem("pp-cloud-store"); } catch { /* tanpa penyimpanan */ }
  const storeId = env["VITE_STORE_ID"] || stored || undefined;
  return storeId ? { ...base, storeId } : null;
}

/* ====================== sesi (magic link / OTP email) ====================== */
export type Session = { access_token: string; refresh_token: string; expires_at: number; email: string };
const SESSION_KEY = "pp-cloud-session";
export const getSession = (): Session | null => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null"); } catch { return null; } };
const saveSession = (s: Session | null) => { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); notify(); };

async function auth(cfg: CloudConfig, path: string, body: unknown, bearer?: string) {
  const res = await fetch(`${cfg.url}/auth/v1/${path}`, { method: "POST", headers: { apikey: cfg.anonKey, "Content-Type": "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.msg ?? json.error_description ?? json.message ?? `Auth gagal (${res.status})`);
  return json;
}
const toSession = (j: any, email: string): Session => ({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in ?? 3600) * 1000, email });
/** Kirim kode masuk ke email pemilik. */
export async function requestOtp(cfg: CloudConfig, email: string) { await auth(cfg, "otp", { email, create_user: true }); }
export async function verifyOtp(cfg: CloudConfig, email: string, token: string) {
  const s = toSession(await auth(cfg, "verify", { type: "email", email, token }), email);
  saveSession(s); return s;
}
export function signOut() { saveSession(null); }
export const setStoreId = (id: string) => { localStorage.setItem("pp-cloud-store", id); notify(); };
/** Pemilik membuat toko/cabang baru di cloud; ID tersimpan di perangkat ini. */
export async function createRemoteStore(cfg: Pick<CloudConfig, "url" | "anonKey">, name: string): Promise<string> {
  const t = httpTransport({ ...cfg, storeId: "-" });
  const id = (await t("create_store", { p_name: name })) as string;
  return id;
}
async function freshToken(cfg: CloudConfig): Promise<string> {
  const s = getSession();
  if (!s) throw new Error("Belum masuk ke cloud");
  if (s.expires_at - Date.now() > 60_000) return s.access_token;
  const next = toSession(await auth(cfg, "token?grant_type=refresh_token", { refresh_token: s.refresh_token }), s.email);
  saveSession(next); return next.access_token;
}
export function httpTransport(cfg: CloudConfig): Transport {
  return async (fn, args) => {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: cfg.anonKey, Authorization: `Bearer ${await freshToken(cfg)}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error((json && (json.message ?? json.hint)) || `RPC ${fn} gagal (${res.status})`);
    return json;
  };
}
/** Panggil Edge Function (AI, QRIS, PPOB) dengan sesi pengguna. */
export async function callFunction<T = any>(cfg: CloudConfig, name: string, body: unknown): Promise<T> {
  const res = await fetch(`${cfg.url}/functions/v1/${name}`, { method: "POST", headers: { apikey: cfg.anonKey, Authorization: `Bearer ${await freshToken(cfg)}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Fungsi ${name} gagal (${res.status})`);
  return json as T;
}

/* ====================== status untuk antarmuka ====================== */
export type CloudStatus = { enabled: boolean; online: boolean; last?: number; pending: number; error?: string };
let status: CloudStatus = { enabled: false, online: false, pending: 0 };
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());
const setStatus = (p: Partial<CloudStatus>) => { status = { ...status, ...p }; notify(); };
export const getCloudStatus = () => status;
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function useCloudStatus(): CloudStatus {
  return useSyncExternalStore(subscribe, () => status, () => status);
}

/* ====================== peta entitas ====================== */
type Kind = "doc" | "log";
type Def = { key: keyof State; entity: string; kind: Kind; strip?: string[] };
export const ENTITIES: Def[] = [
  { key: "products", entity: "products", kind: "doc", strip: ["stock"] },
  { key: "customers", entity: "customers", kind: "doc" },
  { key: "suppliers", entity: "suppliers", kind: "doc" },
  { key: "employees", entity: "employees", kind: "doc", strip: ["pinHash"] },
  { key: "shifts", entity: "shifts", kind: "doc" },
  { key: "payables", entity: "payables", kind: "doc" },
  { key: "consigns", entity: "consigns", kind: "doc" },
  { key: "sales", entity: "sales", kind: "doc" },
  { key: "ppob", entity: "ppob", kind: "doc" },
  { key: "stockMoves", entity: "stock_moves", kind: "log" },
  { key: "cash", entity: "cash_moves", kind: "log" },
  { key: "ledger", entity: "ledger", kind: "log" },
  { key: "returns", entity: "returns", kind: "log" },
  { key: "audit", entity: "audit", kind: "log" },
  { key: "prive", entity: "prive", kind: "log" },
  { key: "depositMoves", entity: "deposit_moves", kind: "log" },
];
const BY_ENTITY = new Map(ENTITIES.map((d) => [d.entity, d]));
const ORDER = (e: string) => (e === "settings" ? 0 : BY_ENTITY.get(e)?.kind === "doc" ? 1 : 2);
const SETTINGS_KEYS = ["shopName", "roundingStep", "paperWidth"] as const;

const strip = (def: Def, item: any) => { if (!def.strip) return item; const c = { ...item }; def.strip.forEach((k) => delete c[k]); return c; };
const settingsOf = (s: State) => Object.fromEntries(SETTINGS_KEYS.map((k) => [k, s[k]]));
const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/* ====================== perubahan lokal → peristiwa ====================== */
export function diffEvents(prev: State, next: State, ts = Date.now()): P.OutboxEvent[] {
  const out: P.OutboxEvent[] = [];
  for (const def of ENTITIES) {
    const a = prev[def.key] as unknown as { id: string }[]; const b = next[def.key] as unknown as { id: string }[];
    if (a === b) continue;
    const before = new Map(a.map((x) => [x.id, x]));
    for (const item of b) {
      const old = before.get(item.id);
      if (old === item) continue;
      if (def.kind === "log" && old) continue;
      out.push({ id: newId(), entity: def.entity, entity_id: item.id, op: "upsert", data: strip(def, item), ts });
    }
    if (def.kind === "doc") {
      const now = new Set(b.map((x) => x.id));
      for (const id of before.keys()) if (!now.has(id)) out.push({ id: newId(), entity: def.entity, entity_id: id, op: "delete", data: null, ts });
    }
  }
  if (JSON.stringify(settingsOf(prev)) !== JSON.stringify(settingsOf(next))) out.push({ id: newId(), entity: "settings", entity_id: "main", op: "upsert", data: settingsOf(next), ts });
  return out;
}

/** Mutasi "Saldo awal" agar stok dan deposit = jumlah mutasi. Ditambahkan juga ke data lokal supaya tidak terhitung dua kali saat ditarik kembali. */
export function bootstrapPatch(s: State, ts = Date.now()): Partial<State> {
  const stockMoves: StockMove[] = [...s.stockMoves];
  for (const pr of s.products) {
    if (pr.digital || pr.bundle) continue;
    const sum = s.stockMoves.filter((m) => m.productId === pr.id).reduce((a, m) => a + m.qty, 0);
    if (Math.abs(pr.stock - sum) > 1e-9) stockMoves.push({ id: `init-${pr.id}`, ts, productId: pr.id, qty: pr.stock - sum, reason: "Saldo awal sinkronisasi" });
  }
  const depSum = s.depositMoves.reduce((a, m) => a + m.amount, 0);
  const depositMoves = Math.abs(s.deposit - depSum) > 1e-9 ? [...s.depositMoves, { id: "init-deposit", ts, amount: s.deposit - depSum, note: "Saldo awal sinkronisasi" }] : s.depositMoves;
  return { stockMoves, depositMoves };
}
/** Saat toko baru pertama kali tersambung: seluruh data lokal diunggah. */
export function bootstrapEvents(s: State, ts = Date.now()): P.OutboxEvent[] {
  const empty = { ...s, ...Object.fromEntries(ENTITIES.map((d) => [d.key, []])), shopName: "", roundingStep: 0, paperWidth: 0 } as unknown as State;
  return diffEvents(empty, { ...s, ...bootstrapPatch(s, ts) }, ts);
}

/* ====================== peristiwa server → data lokal ====================== */
function mergeDoc(entity: string, local: any, remote: any) {
  if (entity === "shifts") {
    const participants = [...new Set([...(local.participants ?? []), ...(remote.participants ?? [])])];
    const closed = remote.closedAt ? remote : local.closedAt ? local : remote;
    return { ...remote, participants, ...(closed.closedAt ? { closedAt: closed.closedAt, counted: closed.counted, expected: closed.expected, note: closed.note } : {}) };
  }
  if (entity === "sales") return { ...remote, voided: local.voided ?? remote.voided };
  return remote;
}
const fromRemote = (entity: string, existing: any, data: any) => (entity === "products" ? { ...data, stock: existing?.stock ?? 0 } : entity === "employees" ? { ...data, pinHash: existing?.pinHash ?? "" } : data);

export function applyRows(s: State, rows: Row[]): Partial<State> {
  const patch: Record<string, any> = {};
  const get = (k: keyof State) => ((patch[k as string] ?? s[k]) as any[]);
  const addedMoves: StockMove[] = [];
  const newProducts = new Set<string>();
  let depositDelta = 0;
  for (const r of [...rows].sort((a, b) => ORDER(a.entity) - ORDER(b.entity) || a.seq - b.seq)) {
    if (r.entity === "settings") { SETTINGS_KEYS.forEach((k) => { if (r.data && r.data[k] !== undefined) patch[k] = r.data[k]; }); continue; }
    const def = BY_ENTITY.get(r.entity);
    if (!def) continue;
    const list = get(def.key);
    const i = list.findIndex((x) => x.id === r.entity_id);
    if (r.deleted) { if (i >= 0) patch[def.key] = list.filter((x) => x.id !== r.entity_id); continue; }
    if (def.kind === "log") {
      if (i >= 0) continue;
      patch[def.key] = [...list, r.data];
      if (def.entity === "stock_moves") addedMoves.push(r.data);
      if (def.entity === "deposit_moves") depositDelta += Number(r.data.amount) || 0;
      continue;
    }
    if (i < 0) { patch[def.key] = [...list, fromRemote(def.entity, undefined, r.data)]; if (def.entity === "products") newProducts.add(r.entity_id); }
    else patch[def.key] = list.map((x, j) => (j === i ? fromRemote(def.entity, x, mergeDoc(def.entity, x, r.data)) : x));
  }
  if (addedMoves.length || newProducts.size) {
    const moves = (patch["stockMoves"] ?? s.stockMoves) as StockMove[];
    patch["products"] = ((patch["products"] ?? s.products) as State["products"]).map((p) => {
      if (newProducts.has(p.id)) return { ...p, stock: moves.filter((m) => m.productId === p.id).reduce((a, m) => a + m.qty, 0) };
      const d = addedMoves.filter((m) => m.productId === p.id).reduce((a, m) => a + m.qty, 0);
      return d ? { ...p, stock: p.stock + d } : p;
    });
  }
  if (depositDelta) patch["deposit"] = s.deposit + depositDelta;
  return patch as Partial<State>;
}
/** Data operasional dikosongkan sebelum menarik data toko dari server (perangkat baru). */
export function emptyOperational(): Partial<State> {
  return { ...Object.fromEntries(ENTITIES.map((d) => [d.key, []])), deposit: 0 } as Partial<State>;
}

/* ====================== mesin sinkronisasi ====================== */
export function createSyncEngine(cfg: Pick<CloudConfig, "storeId">, transport: Transport, opts: { intervalMs?: number; batch?: number } = {}) {
  const batch = opts.batch ?? 200;
  let timer: ReturnType<typeof setInterval> | undefined;
  let unsub: (() => void) | undefined;
  let running = false;
  let queued = false;
  let alive = false;

  const refreshPending = async () => { const n = await P.outboxCount(); applyRemote(() => ({ pendingSync: n })); setStatus({ pending: n }); };

  async function push() {
    for (;;) {
      const events = await P.outboxPeek(batch);
      if (!events.length) break;
      await transport("sync_push", { p_store: cfg.storeId, p_events: events });
      await P.outboxRemove(events.map((e) => e.id));
    }
  }
  async function pull() {
    for (;;) {
      const since = (await P.kvGet<number>("cloud-cursor")) ?? 0;
      // tarik ulang 200 nomor urut terakhir: baris yang baru ter-commit dengan seq lebih rendah tidak terlewat (penerapan idempoten)
      const res = (await transport("sync_pull", { p_store: cfg.storeId, p_since: Math.max(0, since - 200), p_limit: 500 })) as { rows: Row[]; cursor: number };
      if (!alive) return;
      if (res.rows.length) applyRemote((s) => applyRows(s, res.rows));
      await P.kvSet("cloud-cursor", Math.max(since, res.cursor));
      if (res.rows.length < 500 || res.cursor <= since) break;
    }
  }
  /** Surat jalan lintas cabang: kirim yang baru, teruskan status terima/batal, tarik dokumen dari cabang lain. */
  async function syncTransfers() {
    const remote = (await transport("list_transfers", { p_store: cfg.storeId })) as { id: string; status: Transfer["status"]; data: Transfer }[];
    const byId = new Map(remote.map((r) => [r.id, r]));
    for (const t of getState().transfers) {
      const r = byId.get(t.id);
      if (!r && t.fromStore === cfg.storeId) await transport("create_transfer", { p_transfer: t });
      else if (r?.status === "dikirim" && t.status === "diterima" && t.toStore === cfg.storeId) await transport("receive_transfer", { p_id: t.id, p_store: cfg.storeId });
      else if (r?.status === "dikirim" && t.status === "dibatalkan" && t.fromStore === cfg.storeId) await transport("cancel_transfer", { p_id: t.id, p_store: cfg.storeId });
    }
    if (!remote.length) return;
    applyRemote((s) => {
      let list = s.transfers; let changed = false;
      for (const r of remote) {
        const i = list.findIndex((x) => x.id === r.id);
        const doc: Transfer = { ...r.data, status: r.status };
        if (i < 0) { list = [...list, doc]; changed = true; }
        else if (list[i].status === "dikirim" && r.status !== "dikirim") { list = list.map((x, j) => (j === i ? { ...x, status: r.status } : x)); changed = true; }
      }
      return changed ? { transfers: list } : {};
    });
  }
  async function bootstrap() {
    if (await P.kvGet<boolean>("cloud-bootstrapped")) return;
    const st = (await transport("sync_status", { p_store: cfg.storeId })) as { count: number };
    if (st.count > 0) { applyRemote(() => emptyOperational()); await P.outboxClear(); await P.kvSet("cloud-cursor", 0); }
    else { applyRemote((s) => bootstrapPatch(s)); await P.outboxAdd(bootstrapEvents(getState())); }
    await P.kvSet("cloud-bootstrapped", true);
  }
  async function syncNow() {
    if (!alive) return;
    if (running) { queued = true; return; }
    running = true;
    try {
      if (getState().mockOffline) { setStatus({ online: false }); return; }
      await bootstrap(); await push(); await pull(); await syncTransfers(); await refreshPending();
      setStatus({ online: true, last: Date.now(), error: undefined });
    } catch (e) { setStatus({ online: false, error: e instanceof Error ? e.message : "Sinkronisasi gagal" }); await refreshPending().catch(() => undefined); }
    finally { running = false; if (queued) { queued = false; void syncNow(); } }
  }
  return {
    syncNow,
    async start() {
      alive = true; setCloudActive(true); setStatus({ enabled: true });
      setPinHooks({
        verify: async (employeeId, pin) => { try { const r = await transport("verify_employee_pin", { p_store: cfg.storeId, p_employee: employeeId, p_pin: pin }); return r === null || r === undefined ? null : Boolean(r); } catch (e) { if (e instanceof Error && /terkunci/.test(e.message)) throw e; return null; } },
        set: async (employeeId, pin) => { await transport("set_employee_pin", { p_store: cfg.storeId, p_employee: employeeId, p_pin: pin }); },
      });
      unsub = onStateChange((prev, next) => { const ev = diffEvents(prev, next); if (ev.length) void P.outboxAdd(ev).then(refreshPending).then(() => syncNow()); });
      await refreshPending(); await syncNow();
      timer = setInterval(() => { if (typeof document === "undefined" || document.visibilityState !== "hidden") void syncNow(); }, opts.intervalMs ?? 4000);
    },
    stop() { alive = false; setPinHooks(null); unsub?.(); if (timer) clearInterval(timer); setCloudActive(false); setStatus({ enabled: false, online: false }); },
  };
}

let engine: ReturnType<typeof createSyncEngine> | null = null;
/** Mulai sinkronisasi bila VITE_SUPABASE_* terisi dan pemilik sudah masuk; aman dipanggil berulang. */
export async function startCloudSync(): Promise<boolean> {
  const cfg = cloudConfig();
  if (!cfg || !getSession()) return false;
  if (!engine) engine = createSyncEngine(cfg, httpTransport(cfg));
  await engine.start();
  return true;
}
export function stopCloudSync() { engine?.stop(); engine = null; }
export const syncNowIfCloud = () => engine?.syncNow();

/** Cabang lain milik pemilik yang sama (untuk surat jalan). */
export async function listBranches(): Promise<{ id: string; name: string }[]> {
  const cfg = cloudConfig();
  if (!cfg || !getSession()) return [];
  return ((await httpTransport(cfg)("list_group_stores", { p_store: cfg.storeId })) as { id: string; name: string }[]) ?? [];
}

/** QRIS dinamis lewat Edge Function (mock/Midtrans, sesuai konfigurasi server). */
export type QrisIntent = { intentId: string; orderId: string; provider: string; qrString?: string; qrUrl?: string; expiresAt?: string; amount: number };
export async function createQris(amount: number): Promise<QrisIntent> {
  const cfg = cloudConfig();
  if (!cfg || !getSession()) throw new Error("Cloud belum aktif");
  return callFunction<QrisIntent>(cfg, "qris-create", { storeId: cfg.storeId, amount: Math.round(amount) });
}
export async function qrisStatusOf(intentId: string): Promise<"pending" | "paid" | "expired" | "failed"> {
  const cfg = cloudConfig();
  if (!cfg) throw new Error("Cloud belum aktif");
  return (await callFunction<{ status: "pending" | "paid" | "expired" | "failed" }>(cfg, "qris-status", { intentId })).status;
}
/** PPOB lewat Edge Function; refId harus stabil per transaksi agar aman diulang. */
export async function purchasePpob(a: { kind: string; sku: string; target: string; refId: string }): Promise<{ status: "sukses" | "pending" | "gagal"; sn?: string; message?: string; price?: number }> {
  const cfg = cloudConfig();
  if (!cfg || !getSession()) throw new Error("Cloud belum aktif");
  return callFunction(cfg, "ppob-purchase", { storeId: cfg.storeId, ...a });
}

/** Pemilik mengundang akun perangkat kasir (email harus sudah pernah masuk). */
export async function addDeviceMember(email: string) {
  const cfg = cloudConfig();
  if (!cfg) throw new Error("Cloud belum aktif");
  await httpTransport(cfg)("add_device_member", { p_store: cfg.storeId, p_email: email });
}
