/** Penyimpanan IndexedDB: snapshot data toko ("kv") dan antrean sinkronisasi ("outbox"). Memakai Map di memori bila IndexedDB tidak ada (mis. saat uji). */
const DB_NAME = "pasar-pintar";
const mem = { kv: new Map<string, unknown>(), outbox: new Map<string, OutboxEvent>() };

export type OutboxEvent = { id: string; entity: string; entity_id: string; op: "upsert" | "delete"; data: unknown; ts: number };

export const idbAvailable = () => typeof indexedDB !== "undefined";

let dbPromise: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}
function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}
async function tx<T>(store: "kv" | "outbox", mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return wrap(fn(db.transaction(store, mode).objectStore(store)));
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  if (!idbAvailable()) return mem.kv.get(key) as T | undefined;
  return (await tx("kv", "readonly", (s) => s.get(key))) as T | undefined;
}
export async function kvSet(key: string, value: unknown): Promise<void> {
  if (!idbAvailable()) { mem.kv.set(key, value); return; }
  await tx("kv", "readwrite", (s) => s.put(value, key));
}
export async function kvDel(key: string): Promise<void> {
  if (!idbAvailable()) { mem.kv.delete(key); return; }
  await tx("kv", "readwrite", (s) => s.delete(key));
}

export async function outboxAdd(events: OutboxEvent[]): Promise<void> {
  if (!events.length) return;
  if (!idbAvailable()) { events.forEach((e) => mem.outbox.set(e.id, e)); return; }
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction("outbox", "readwrite");
    const s = t.objectStore("outbox");
    events.forEach((e) => s.put(e));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
export async function outboxPeek(limit: number): Promise<OutboxEvent[]> {
  const all = idbAvailable() ? ((await tx("outbox", "readonly", (s) => s.getAll())) as OutboxEvent[]) : [...mem.outbox.values()];
  return all.sort((a, b) => a.ts - b.ts).slice(0, limit);
}
export async function outboxCount(): Promise<number> {
  return idbAvailable() ? await tx("outbox", "readonly", (s) => s.count()) : mem.outbox.size;
}
export async function outboxRemove(ids: string[]): Promise<void> {
  if (!idbAvailable()) { ids.forEach((i) => mem.outbox.delete(i)); return; }
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction("outbox", "readwrite");
    ids.forEach((id) => t.objectStore("outbox").delete(id));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
export async function outboxClear(): Promise<void> {
  if (!idbAvailable()) { mem.outbox.clear(); return; }
  await tx("outbox", "readwrite", (s) => s.clear());
}

/** Tulis snapshot dengan jeda singkat agar banyak perubahan beruntun hanya satu kali tulis. */
let timer: ReturnType<typeof setTimeout> | undefined;
let latest: unknown;
export function scheduleSnapshot(value: unknown, done: (ok: boolean) => void, delay = 400) {
  if (!idbAvailable()) { done(false); return; }
  latest = value;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = undefined; kvSet("state", latest).then(() => done(true), () => done(false)); }, delay);
}
