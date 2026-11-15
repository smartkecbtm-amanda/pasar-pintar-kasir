import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectPrinter, disconnectPrinter, printerConnected, printThermal } from "@/lib/printer";
import { setState, useStore } from "@/lib/store";

export function PrinterPanel() {
  const width = useStore((s) => s.printerWidth);
  const [mode, setMode] = useState<"serial" | "bluetooth">("serial");
  const [baud, setBaud] = useState("9600");
  const [service, setService] = useState("0000ffe0-0000-1000-8000-00805f9b34fb");
  const [char, setChar] = useState("0000ffe1-0000-1000-8000-00805f9b34fb");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<void>) {
    setBusy(true); try { await fn(); setConnected(printerConnected()); } catch (e) { toast.error(e instanceof Error ? e.message : "Printer gagal"); } finally { setBusy(false); }
  }
  return <section className="space-y-3 border-t pt-4"><h3 className="text-xl font-bold">Printer Struk ESC/POS</h3><div className="flex flex-wrap gap-2">{(["serial", "bluetooth"] as const).map((m) => <Button key={m} variant={mode === m ? "default" : "secondary"} onClick={() => setMode(m)}>{m === "serial" ? "USB / Serial" : "Bluetooth BLE"}</Button>)}{([58, 80] as const).map((w) => <Button key={w} variant={width === w ? "default" : "outline"} onClick={() => setState(() => ({ printerWidth: w }))}>{w} mm</Button>)}</div>{mode === "serial" ? <label className="block text-sm">Baud rate<select aria-label="Baud rate" className="ml-3 rounded-md border bg-background p-2" value={baud} onChange={(e) => setBaud(e.target.value)}>{[9600, 19200, 38400, 57600, 115200].map((b) => <option key={b}>{b}</option>)}</select></label> : <><label className="block text-sm">Service UUID<Input value={service} onChange={(e) => setService(e.target.value)} /></label><label className="block text-sm">Characteristic UUID<Input value={char} onChange={(e) => setChar(e.target.value)} /></label></>}<div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => run(() => connectPrinter(mode, +baud, service, char))}>Hubungkan Printer</Button><Button variant="outline" disabled={busy} onClick={() => run(() => printThermal("TES CETAK\nPOS Warung\n\n\n"))}>Tes Cetak</Button><Button variant="secondary" disabled={busy} onClick={() => run(disconnectPrinter)}>Putuskan</Button></div><p className="text-sm text-muted-foreground" role="status">{connected ? "Printer terhubung" : "Printer belum terhubung"}</p></section>;
}