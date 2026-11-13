import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, activeShift, expectedCash, useStore } from "@/lib/store";
import { jam, rp, tgl } from "@/lib/format";
import { Card, Field, Stat } from "./ui";

const DENOMS = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100];

export function ShiftTab() {
  const s = useStore((x) => x);
  const sh = activeShift(s);
  const [cashier, setCashier] = useState("Bu Sri");
  const [opening, setOpening] = useState("200000");
  const [count, setCount] = useState<Record<number, string>>({});
  const counted = DENOMS.reduce((a, d) => a + d * (Number(count[d]) || 0), 0);
  const expected = sh ? expectedCash(s, sh) : 0;
  const moves = sh ? s.cash.filter((c) => c.shiftId === sh.id) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {!sh ? (
        <Card title="Buka Shift Kasir">
          <div className="space-y-3">
            <Field label="Nama kasir"><Input value={cashier} onChange={(e) => setCashier(e.target.value)} /></Field>
            <Field label="Modal awal di laci (uang receh)"><Input type="number" value={opening} onChange={(e) => setOpening(e.target.value)} /></Field>
            <Button className="w-full" size="lg" onClick={() => { actions.openShift(cashier, Number(opening)); toast.success("Shift dibuka"); }}>Buka Laci</Button>
          </div>
        </Card>
      ) : (
        <>
          <Card title={`Shift aktif · ${sh.cashier}`}>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Modal awal" value={rp(sh.opening)} />
              <Stat label="Seharusnya di laci" value={rp(expected)} />
            </div>
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
              <Stat label="Selisih" value={rp(counted - expected)} tone={counted - expected === 0 ? "good" : "bad"} />
            </div>
            <Button className="mt-3 w-full" size="lg" variant="destructive" onClick={() => { actions.closeShift(counted, expected); setCount({}); toast.success("Shift ditutup & direkap"); }}>Tutup Shift</Button>
          </Card>
        </>
      )}
      <Card title="Riwayat Shift" className="lg:col-span-2">
        {s.shifts.filter((x) => x.closedAt).reverse().map((x) => (
          <div key={x.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm">
            <span>{tgl(x.openedAt)} {jam(x.openedAt)}–{jam(x.closedAt!)} · {x.cashier}</span>
            <span>Seharusnya {rp(x.expected!)} · Dihitung {rp(x.counted!)} · <b className={x.counted === x.expected ? "text-success" : "text-destructive"}>Selisih {rp(x.counted! - x.expected!)}</b></span>
          </div>
        ))}
        {!s.shifts.some((x) => x.closedAt) && <p className="text-muted-foreground">Belum ada shift yang ditutup.</p>}
      </Card>
    </div>
  );
}
