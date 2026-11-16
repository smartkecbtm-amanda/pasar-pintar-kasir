import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDeviceMember, cloudBase, cloudConfig, createRemoteStore, getSession, requestOtp, setStoreId, signOut, startCloudSync, stopCloudSync, syncNowIfCloud, useCloudStatus, verifyOtp } from "@/lib/cloud";
import { connectPrinter, connectScale, disconnectPrinter, disconnectScale, kickDrawer, printBytes, supportsDevices, useDevices, type PrinterKind } from "@/lib/devices";
import { linesToEscPos } from "@/lib/escpos";
import { actionsPlus } from "@/lib/store-extra";
import { useStore } from "@/lib/store";
import { jam, num } from "@/lib/format";
import { Card, Field, selectCls } from "./ui";

const msg = (e: unknown, d: string) => (e instanceof Error ? e.message : d);

export function CloudDevices() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CloudCard />
      <div className="space-y-4"><DevicesCard /><CashierSettings /></div>
    </div>
  );
}

function CloudCard() {
  const st = useCloudStatus();
  const base = cloudBase();
  const cfg = cloudConfig();
  const session = getSession();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [storeInput, setStoreInput] = useState("");
  const [device, setDevice] = useState("");
  const full = base ? { ...base, storeId: cfg?.storeId ?? "-" } : null;

  if (!base || !full) {
    return <Card title="☁️ Cloud"><p className="text-sm text-muted-foreground">Mode lokal. Untuk sinkronisasi antar-perangkat, isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> di berkas <code>.env</code> aplikasi lalu bangun ulang (lihat README).</p></Card>;
  }
  if (!session) {
    return (
      <Card title="☁️ Masuk ke Cloud">
        <div className="space-y-2">
          <Field label="Email pemilik"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          {!sent ? <Button className="w-full" disabled={!email.includes("@")} onClick={async () => { try { await requestOtp(full, email.trim()); setSent(true); toast.success("Kode dikirim ke email"); } catch (e) { toast.error(msg(e, "Gagal mengirim kode")); } }}>Kirim Kode</Button>
            : <><Field label="Kode 6 digit dari email"><Input inputMode="numeric" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} /></Field>
              <Button className="w-full" disabled={code.length < 6} onClick={async () => { try { await verifyOtp(full, email.trim(), code.trim()); toast.success("Berhasil masuk"); } catch (e) { toast.error(msg(e, "Kode salah")); } }}>Masuk</Button></>}
        </div>
      </Card>
    );
  }
  if (!cfg) {
    return (
      <Card title="☁️ Pilih Toko">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Masuk sebagai {session.email}. Buat toko baru atau pakai ID toko yang sudah ada (perangkat kedua).</p>
          <Field label="Nama toko baru"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Button className="w-full" disabled={!name.trim()} onClick={async () => { try { setStoreId(await createRemoteStore(base, name.trim())); toast.success("Toko dibuat"); } catch (e) { toast.error(msg(e, "Gagal membuat toko")); } }}>Buat Toko</Button>
          <Field label="atau ID toko yang sudah ada"><Input value={storeInput} onChange={(e) => setStoreInput(e.target.value)} /></Field>
          <Button variant="outline" className="w-full" disabled={storeInput.trim().length < 30} onClick={() => setStoreId(storeInput.trim())}>Pakai ID Ini</Button>
        </div>
      </Card>
    );
  }
  return (
    <Card title="☁️ Cloud" action={<span className={st.online ? "text-sm font-bold text-success" : "text-sm font-bold text-warning"}>{st.enabled ? (st.online ? "Online" : "Offline") : "Berhenti"}</span>}>
      <div className="space-y-2 text-sm">
        <p>Akun: <b>{session.email}</b></p>
        <p className="break-all">ID toko: <b>{cfg.storeId}</b></p>
        <p>Antrean kirim: <b>{num(st.pending)}</b>{st.last ? ` · terakhir sinkron ${jam(st.last)}` : ""}</p>
        {st.error && <p className="text-destructive">{st.error}</p>}
        <div className="flex flex-wrap gap-2">
          {!st.enabled ? <Button onClick={async () => { try { await startCloudSync(); toast.success("Sinkronisasi dimulai"); } catch (e) { toast.error(msg(e, "Gagal memulai")); } }}>Mulai Sinkronisasi</Button> : <><Button variant="outline" onClick={() => void syncNowIfCloud()}>Sinkronkan Sekarang</Button><Button variant="outline" onClick={() => stopCloudSync()}>Hentikan</Button></>}
          <Button variant="ghost" onClick={() => { stopCloudSync(); signOut(); }}>Keluar</Button>
        </div>
        <div className="space-y-2 border-t pt-3">
          <Field label="Undang akun perangkat kasir (email)"><Input type="email" value={device} onChange={(e) => setDevice(e.target.value)} /></Field>
          <Button variant="outline" disabled={!device.includes("@")} onClick={async () => { try { await addDeviceMember(device.trim()); toast.success("Perangkat ditambahkan"); setDevice(""); } catch (e) { toast.error(msg(e, "Gagal menambahkan")); } }}>Tambah Perangkat</Button>
          <p className="text-xs text-muted-foreground">Akun itu harus sudah pernah masuk lewat email. Pegawai tetap masuk dengan PIN, yang diperiksa server saat online.</p>
        </div>
      </div>
    </Card>
  );
}

function DevicesCard() {
  const d = useDevices();
  const sup = supportsDevices();
  const connect = async (kind: PrinterKind) => { try { const n = await connectPrinter(kind); toast.success(`Printer terhubung: ${n}`); } catch (e) { toast.error(msg(e, "Gagal menghubungkan printer")); } };
  return (
    <Card title="🖨️ Printer & Timbangan">
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">Butuh Chrome/Edge lewat HTTPS. Tanpa printer terhubung, struk dicetak lewat dialog cetak browser.</p>
        <div>
          <p className="mb-1 font-semibold">Printer thermal: {d.printer ? `${d.printer.name} (${d.printer.kind})` : "belum terhubung"}</p>
          <div className="flex flex-wrap gap-2">
            {(["bluetooth", "usb", "serial"] as const).map((k) => <Button key={k} size="sm" variant="outline" disabled={!sup[k]} onClick={() => connect(k)}>{k === "bluetooth" ? "Bluetooth" : k === "usb" ? "USB" : "Serial"}</Button>)}
            <Button size="sm" disabled={!d.printer} onClick={() => printBytes(linesToEscPos(["Tes cetak", "Pasar Pintar Kasir", "OK"])).catch((e) => toast.error(msg(e, "Gagal cetak")))}>Tes Cetak</Button>
            <Button size="sm" disabled={!d.printer} onClick={() => kickDrawer().catch((e) => toast.error(msg(e, "Gagal membuka laci")))}>Buka Laci</Button>
            <Button size="sm" variant="ghost" disabled={!d.printer} onClick={() => void disconnectPrinter()}>Putus</Button>
          </div>
        </div>
        <div>
          <p className="mb-1 font-semibold">Timbangan: {d.scale ?? "belum terhubung"}{d.weight ? ` · ${num(d.weight.kg)} kg` : ""}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!sup.serial} onClick={async () => { try { await connectScale(); toast.success("Timbangan terhubung"); } catch (e) { toast.error(msg(e, "Gagal menghubungkan timbangan")); } }}>Hubungkan</Button>
            <Button size="sm" variant="ghost" disabled={!d.scale} onClick={() => void disconnectScale()}>Putus</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CashierSettings() {
  const step = useStore((s) => s.roundingStep);
  const paper = useStore((s) => s.paperWidth);
  const run = (fn: () => void) => { try { fn(); } catch (e) { toast.error(msg(e, "Gagal menyimpan")); } };
  return (
    <Card title="⚙️ Kasir">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Pembulatan koin"><select className={selectCls} value={step} onChange={(e) => run(() => actionsPlus.setRounding(Number(e.target.value) as 100 | 500 | 1000))}>{[100, 500, 1000].map((v) => <option key={v} value={v}>kelipatan {v}</option>)}</select></Field>
        <Field label="Lebar kertas struk"><select className={selectCls} value={paper} onChange={(e) => run(() => actionsPlus.setPaperWidth(Number(e.target.value) as 58 | 80))}><option value={58}>58 mm</option><option value={80}>80 mm</option></select></Field>
      </div>
    </Card>
  );
}
