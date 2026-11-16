/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSyncExternalStore } from "react";
import type { Sale } from "./store";
import { kickDrawerBytes, receiptToEscPos } from "./escpos";
import { parseScaleLine, splitScaleChunk } from "./scale";

/**
 * Driver perangkat di browser: printer thermal ESC/POS (WebSerial / WebUSB / Web Bluetooth) dan timbangan serial.
 * API ini hanya ada di Chrome/Edge (Android dan desktop) lewat HTTPS; Safari/iOS tidak mendukungnya sehingga cetak
 * otomatis jatuh ke dialog cetak browser. Belum diuji dengan perangkat fisik.
 */
export type PrinterKind = "serial" | "usb" | "bluetooth";
type Link = { kind: PrinterKind; name: string; write(data: Uint8Array): Promise<void>; close(): Promise<void> };

const nav = () => navigator as any;
export const supportsDevices = () => typeof navigator !== "undefined" ? { serial: "serial" in navigator, usb: "usb" in navigator, bluetooth: "bluetooth" in navigator } : { serial: false, usb: false, bluetooth: false };

/* ---- status reaktif ---- */
let printer: Link | null = null;
let scaleLink: { name: string; close(): Promise<void> } | null = null;
let lastWeight: { kg: number; ts: number } | null = null;
const subs = new Set<() => void>();
const notify = () => { snapshot = { printer: printer ? { kind: printer.kind, name: printer.name } : null, scale: scaleLink?.name ?? null, weight: lastWeight }; subs.forEach((f) => f()); };
let snapshot: { printer: { kind: PrinterKind; name: string } | null; scale: string | null; weight: { kg: number; ts: number } | null } = { printer: null, scale: null, weight: null };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function useDevices() { return useSyncExternalStore(subscribe, () => snapshot, () => snapshot); }
export const printerConnected = () => !!printer;

/* ---- printer ---- */
const chunks = (d: Uint8Array, n: number) => Array.from({ length: Math.ceil(d.length / n) }, (_, i) => d.slice(i * n, (i + 1) * n));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function openSerial(baudRate: number): Promise<Link> {
  const port = await nav().serial.requestPort();
  await port.open({ baudRate });
  return { kind: "serial", name: "Printer serial", write: async (d) => { const w = port.writable.getWriter(); try { await w.write(d); } finally { w.releaseLock(); } }, close: async () => { await port.close(); } };
}
async function openUsb(): Promise<Link> {
  const dev = await nav().usb.requestDevice({ filters: [] });
  await dev.open();
  if (dev.configuration === null) await dev.selectConfiguration(1);
  let found: { iface: number; ep: number } | null = null;
  for (const i of dev.configuration.interfaces) for (const alt of i.alternates) for (const ep of alt.endpoints) if (!found && ep.direction === "out" && ep.type === "bulk") found = { iface: i.interfaceNumber, ep: ep.endpointNumber };
  if (!found) throw new Error("Printer USB tidak punya jalur kirim data");
  await dev.claimInterface(found.iface);
  const f = found;
  return { kind: "usb", name: dev.productName ?? "Printer USB", write: async (d) => { for (const c of chunks(d, 4096)) await dev.transferOut(f.ep, c); }, close: async () => { await dev.close(); } };
}
const BLE_SERVICES = ["000018f0-0000-1000-8000-00805f9b34fb", "0000ffe0-0000-1000-8000-00805f9b34fb", "0000fff0-0000-1000-8000-00805f9b34fb", "49535343-fe7d-4ae5-8fa9-9fafd205e455", "e7810a71-73ae-499d-8c15-faa9aef0c3f2"];
async function openBluetooth(): Promise<Link> {
  const dev = await nav().bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BLE_SERVICES });
  const server = await dev.gatt.connect();
  let ch: any = null;
  for (const svc of await server.getPrimaryServices()) {
    for (const c of await svc.getCharacteristics()) if (!ch && (c.properties.write || c.properties.writeWithoutResponse)) ch = c;
  }
  if (!ch) { server.disconnect(); throw new Error("Printer Bluetooth tidak punya jalur tulis yang dikenali"); }
  return { kind: "bluetooth", name: dev.name ?? "Printer Bluetooth", write: async (d) => { for (const c of chunks(d, 100)) { if (ch.properties.writeWithoutResponse) await ch.writeValueWithoutResponse(c); else await ch.writeValue(c); await sleep(15); } }, close: async () => { server.disconnect(); } };
}
export async function connectPrinter(kind: PrinterKind, baudRate = 9600) {
  const s = supportsDevices();
  if (!s[kind]) throw new Error(`Browser ini tidak mendukung ${kind === "serial" ? "WebSerial" : kind === "usb" ? "WebUSB" : "Web Bluetooth"}. Gunakan Chrome atau Edge lewat HTTPS.`);
  await disconnectPrinter();
  printer = kind === "serial" ? await openSerial(baudRate) : kind === "usb" ? await openUsb() : await openBluetooth();
  notify();
  return printer.name;
}
export async function disconnectPrinter() { const p = printer; printer = null; notify(); if (p) await p.close().catch(() => undefined); }
export async function printBytes(data: Uint8Array) {
  if (!printer) throw new Error("Printer belum terhubung");
  await printer.write(data);
}
export const kickDrawer = () => printBytes(kickDrawerBytes());

/** Cetak langsung bila printer terhubung (laci terbuka otomatis untuk transaksi tunai); jika gagal jatuh ke dialog cetak browser. */
export async function printSaleSmart(sale: Sale, shop: string, width: 58 | 80): Promise<"langsung" | "browser"> {
  const cash = (sale.payments ?? [{ method: sale.method, amount: sale.total }]).some((p) => p.method === "tunai" && p.amount > 0);
  if (printer) {
    try { await printBytes(receiptToEscPos(sale, shop, width, { kick: cash })); return "langsung"; } catch { /* lanjut ke dialog cetak */ }
  }
  window.print();
  return "browser";
}

/* ---- timbangan ---- */
let reader: any = null;
export async function connectScale(baudRate = 9600) {
  if (!supportsDevices().serial) throw new Error("Timbangan membutuhkan WebSerial (Chrome/Edge lewat HTTPS)");
  await disconnectScale();
  const port = await nav().serial.requestPort();
  await port.open({ baudRate });
  const dec = new TextDecoder();
  reader = port.readable.getReader();
  const r = reader;
  scaleLink = { name: "Timbangan serial", close: async () => { try { await r.cancel(); } catch { /* sudah tertutup */ } await port.close().catch(() => undefined); } };
  notify();
  void (async () => {
    let rest = "";
    try {
      for (;;) {
        const { value, done } = await r.read();
        if (done) break;
        const out = splitScaleChunk(rest, dec.decode(value));
        rest = out.rest;
        for (const line of out.lines) { const kg = parseScaleLine(line); if (kg !== null) { lastWeight = { kg, ts: Date.now() }; notify(); } }
      }
    } catch { /* port dicabut */ }
    scaleLink = null; reader = null; notify();
  })();
}
export async function disconnectScale() { const l = scaleLink; scaleLink = null; reader = null; lastWeight = null; notify(); if (l) await l.close(); }

/** Tunggu angka stabil (tiga pembacaan sama berturut-turut) lalu kembalikan kg. */
export async function readStableWeight(timeoutMs = 4000): Promise<number> {
  if (!scaleLink) throw new Error("Timbangan belum terhubung");
  const end = Date.now() + timeoutMs;
  let streak = 0; let prev = -1;
  while (Date.now() < end) {
    await sleep(150);
    const w = lastWeight;
    if (!w || Date.now() - w.ts > 1500) { streak = 0; continue; }
    streak = w.kg === prev ? streak + 1 : 1; prev = w.kg;
    if (streak >= 3 && w.kg > 0) return w.kg;
  }
  throw new Error("Berat belum stabil; letakkan barang dan coba lagi");
}
