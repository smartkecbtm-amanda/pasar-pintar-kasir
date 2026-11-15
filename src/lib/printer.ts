import { escPos } from "./receipt";

type Writer = { write: (bytes: Uint8Array) => Promise<void>; releaseLock: () => void };
type Port = { open: (o: { baudRate: number }) => Promise<void>; close: () => Promise<void>; writable: { getWriter: () => Writer } | null };
type Characteristic = { properties: { write: boolean; writeWithoutResponse: boolean }; writeValueWithResponse: (v: Uint8Array) => Promise<void>; writeValueWithoutResponse: (v: Uint8Array) => Promise<void> };
type Device = { gatt?: { connected: boolean; connect: () => Promise<{ getPrimaryService: (id: string) => Promise<{ getCharacteristic: (id: string) => Promise<Characteristic> }> }>; disconnect: () => void }; addEventListener: (type: string, fn: () => void) => void };
type HardwareNavigator = Navigator & { serial?: { requestPort: () => Promise<Port> }; bluetooth?: { requestDevice: (o: { acceptAllDevices: boolean; optionalServices: string[] }) => Promise<Device> } };
let port: Port | null = null;
let device: Device | null = null;
let characteristic: Characteristic | null = null;
let printing = false;

export function printerConnected() { return Boolean(port?.writable || (characteristic && device?.gatt?.connected)); }
export async function disconnectPrinter() {
  if (printing) throw new Error("Tunggu pencetakan selesai");
  const old = port; port = null; characteristic = null;
  device?.gatt?.disconnect(); device = null;
  await old?.close();
}
export async function connectPrinter(mode: "serial" | "bluetooth", baudRate = 9600, service = "0000ffe0-0000-1000-8000-00805f9b34fb", char = "0000ffe1-0000-1000-8000-00805f9b34fb") {
  await disconnectPrinter();
  const nav = navigator as HardwareNavigator;
  if (mode === "serial") {
    if (!nav.serial) throw new Error("Browser ini tidak mendukung printer Serial; gunakan cetak browser atau Chrome desktop");
    const selected = await nav.serial.requestPort();
    await selected.open({ baudRate }); port = selected;
  } else {
    if (!nav.bluetooth) throw new Error("Browser ini tidak mendukung Bluetooth BLE; gunakan Serial atau cetak browser");
    const selected = await nav.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [service] });
    if (!selected.gatt) throw new Error("Printer harus mendukung Bluetooth BLE GATT, bukan Bluetooth Classic");
    try {
      const server = await selected.gatt.connect();
      const svc = await server.getPrimaryService(service);
      const found = await svc.getCharacteristic(char);
      if (!found.properties.write && !found.properties.writeWithoutResponse) throw new Error("Karakteristik printer tidak dapat ditulis");
      characteristic = found; device = selected;
      selected.addEventListener("gattserverdisconnected", () => { characteristic = null; device = null; });
    } catch (e) { selected.gatt.disconnect(); throw e; }
  }
}
export async function printThermal(text: string) {
  if (printing) throw new Error("Printer sedang mencetak");
  if (!printerConnected()) throw new Error("Hubungkan printer dahulu");
  printing = true;
  const bytes = escPos(text);
  try {
    if (port?.writable) {
      const writer = port.writable.getWriter();
      try { await writer.write(bytes); } finally { writer.releaseLock(); }
    } else if (characteristic) {
      const target = characteristic;
      for (let i = 0; i < bytes.length; i += 20) {
        const chunk = bytes.slice(i, i + 20);
        if (target.properties.write) await target.writeValueWithResponse(chunk);
        else await target.writeValueWithoutResponse(chunk);
      }
    }
  } finally { printing = false; }
}
export function printBrowser(text: string) {
  const popup = window.open("", "_blank", "width=420,height=700");
  if (!popup) throw new Error("Izinkan jendela cetak pada browser");
  popup.document.title = "Struk Warung";
  const pre = popup.document.createElement("pre"); pre.textContent = text; popup.document.body.append(pre);
  popup.focus(); popup.print();
}