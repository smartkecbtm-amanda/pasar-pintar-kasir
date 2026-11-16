import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { actionsPlus } from "@/lib/store-extra";
import { dayStats } from "@/lib/operations";
import { jam, rp, tgl } from "@/lib/format";
import { Card, Field, Stat, selectCls } from "./ui";

/** Layanan PPOB dan transfer tunai: saldo deposit, isi saldo, tindak lanjut transaksi tertunda, riwayat. */
export function Services() {
  const s = useStore((x) => x);
  const [amount, setAmount] = useState("500000");
  const [via, setVia] = useState<"tunai" | "bank">("bank");
  const [sn, setSn] = useState<Record<string, string>>({});
  const pending = s.ppob.filter((t) => t.status === "pending");
  const hist = s.ppob.slice().reverse().slice(0, 25);
  const day = new Date(); day.setHours(0, 0, 0, 0);
  const margin = dayStats(s, day.getTime(), day.getTime() + 86400000).ppobMargin;
  const run = (fn: () => void, ok: string) => { try { fn(); toast.success(ok); } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); } };

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Card title="💳 Saldo Deposit">
          <div className="grid grid-cols-2 gap-2"><Stat label="Saldo" value={rp(s.deposit)} /><Stat label="Margin hari ini" value={rp(margin)} tone="good" /></div>
          <div className="mt-3 space-y-2">
            <Field label="Isi saldo"><Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            <Field label="Sumber dana"><select className={selectCls} value={via} onChange={(e) => setVia(e.target.value as "tunai" | "bank")}><option value="bank">Transfer bank pemilik</option><option value="tunai">Tunai dari laci</option></select></Field>
            <Button className="w-full" onClick={() => run(() => actionsPlus.topUpDeposit(Number(amount), via), "Saldo deposit bertambah")}>Isi Deposit</Button>
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card title="⏳ Transaksi Tertunda">
          {!pending.length && <p className="text-muted-foreground">Tidak ada.</p>}
          {pending.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm">
              <span>{tgl(t.ts)} {jam(t.ts)} · <b>{t.kind}</b> {t.target} · {rp(t.price)}</span>
              <span className="flex items-center gap-1">
                <Input aria-label="Nomor SN" className="h-8 w-32" placeholder="SN (opsional)" value={sn[t.id] ?? ""} onChange={(e) => setSn({ ...sn, [t.id]: e.target.value })} />
                <Button size="sm" onClick={() => run(() => actionsPlus.settlePpob(t.id, "sukses", sn[t.id] || undefined), "Ditandai sukses")}>Sukses</Button>
                <Button size="sm" variant="destructive" onClick={() => run(() => actionsPlus.settlePpob(t.id, "gagal"), "Gagal: uang pelanggan dan deposit dikembalikan")}>Gagal</Button>
              </span>
            </div>
          ))}
        </Card>
        <Card title="Riwayat Layanan">
          {!hist.length && <p className="text-muted-foreground">Belum ada transaksi layanan.</p>}
          {hist.map((t) => (
            <div key={t.id} className="flex justify-between border-b py-1.5 text-sm last:border-0">
              <span>{tgl(t.ts)} {jam(t.ts)} · {t.kind} {t.target}{t.sn ? ` · SN ${t.sn}` : ""}</span>
              <span><b>{rp(t.price)}</b> <span className={t.status === "gagal" ? "text-destructive" : t.status === "pending" ? "text-warning" : "text-muted-foreground"}>{t.status}</span></span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
