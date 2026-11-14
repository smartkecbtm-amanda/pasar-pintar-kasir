import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, activeShift, currentEmployee, expectedCash, useStore } from "@/lib/store";
import { EmployeeAccess } from "@/components/pos/EmployeeAccess";
import { jam, rp, tgl } from "@/lib/format";
import { Card, Field, Stat } from "./ui";

const DENOMS = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100];

export function ShiftTab() {
  const s = useStore((x) => x);
  const sh = activeShift(s);
  const [access, setAccess] = useState(false);
  const [review, setReview] = useState(false);
  const [count, setCount] = useState<Record<number, string>>({});
  const counted = DENOMS.reduce((a, d) => a + d * (Number(count[d]) || 0), 0);
  const expected = sh ? expectedCash(s, sh) : 0;
  const moves = sh ? s.cash.filter((c) => c.shiftId === sh.id) : [];

  const close = () => { try { actions.closeShift(counted, expected); setCount({}); setReview(false); toast.success("Shift ditutup & direkap"); } catch (e) { toast.error(e instanceof Error ? e.message : "Tidak dapat menutup shift"); } };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {!sh ? (
        <Card title="Buka Shift Kasir">
          <div className="space-y-3">
            <Button className="w-full" size="lg" onClick={() => setAccess(true)}>Buka Laci dengan PIN Pegawai</Button>
          </div>
        </Card>
      ) : (
        <>
          <Card title={`Shift aktif · ${sh.cashier}`}>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Modal awal" value={rp(sh.opening)} />
              <Stat label="Kasir pembantu" value={String((sh.participants?.length ?? 1) - 1)} />
            </div>
            <Button variant="outline" className="mt-3" onClick={() => setAccess(true)}>Gabung ke Shift Aktif</Button>
            {sh.participants?.map((id) => <p className="mt-2 text-sm" key={id}>{s.employees.find((e) => e.id === id)?.nickname} · {s.sales.filter((x) => x.shiftId === sh.id && x.cashierId === id).length} transaksi</p>)}
            <div className="mt-3 max-h-64 overflow-y-auto text-sm">
              {moves.slice().reverse().map((m) => (
                <div key={m.id} className="flex justify-between border-b py-1"><span>{jam(m.ts)} · {m.kind} <span className="text-muted-foreground">{m.note}</span></span><b className={m.amount < 0 ? "text-destructive" : "text-success"}>{rp(m.amount)}</b></div>
              ))}
              {!moves.length && <p className="text-muted-foreground">Belum ada uang keluar-masuk.</p>}
            </div>
          </Card>
          <Card title="Tutup Shift · Hitung Uang Laci">
            <div className="grid grid-cols-2 gap-2">
              {DENOMS.map((d) => (
                <Field key={d} label={rp(d)}><Input type="number" min={0} placeholder="0 lembar" value={count[d] ?? ""} onChange={(e) => setCount({ ...count, [d]: e.target.value })} /></Field>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Stat label="Hasil hitung" value={rp(counted)} />
              {review && <Stat label="Selisih" value={rp(counted - expected)} tone={counted - expected === 0 ? "good" : "bad"} />}
            </div>
            <Button className="mt-3 w-full" size="lg" variant="destructive" disabled={currentEmployee(s)?.id !== sh.cashierId} onClick={() => review ? close() : setReview(true)}>{review ? "Konfirmasi Tutup Shift" : "Selesai Hitung Uang Fisik"}</Button>
          </Card>
        </>
      )}
      <Card title="Riwayat Shift" className="lg:col-span-2">
        {s.shifts.filter((x) => x.closedAt).reverse().map((x) => (
          <div key={x.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm">
            <span>{tgl(x.openedAt)} {jam(x.openedAt)}–{jam(x.closedAt ?? x.openedAt)} · {x.cashier}</span>
            <span>Seharusnya {rp(x.expected ?? 0)} · Dihitung {rp(x.counted ?? 0)} · <b className={x.counted === x.expected ? "text-success" : "text-destructive"}>Selisih {rp((x.counted ?? 0) - (x.expected ?? 0))}</b></span>
          </div>
        ))}
        {!s.shifts.some((x) => x.closedAt) && <p className="text-muted-foreground">Belum ada shift yang ditutup.</p>}
      </Card>
      <EmployeeAccess open={access} onClose={() => setAccess(false)} />
    </div>
  );
}
