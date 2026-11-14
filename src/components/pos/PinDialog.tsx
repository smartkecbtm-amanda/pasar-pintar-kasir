import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { loginEmployee, useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buzz, beep } from "@/lib/format";
import { Delete } from "lucide-react";

export function PinPad({ onOk }: { onOk: () => void }) {
  const employees = useStore((s) => s.employees);
  const owners = employees.filter((e) => e.active && e.role === "Pemilik");
  const [id, setId] = useState(owners[0]?.id ?? "");
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  const verify = async (value: string) => {
    try { await loginEmployee(id, value, ["Pemilik"]); onOk(); }
    catch { buzz(); setErr(true); setV(""); }
  };
  const press = (d: string) => {
    beep();
    const n = (v + d).slice(0, 6);
    setV(n); setErr(false);
  };
  return (
    <div className="mx-auto w-full max-w-xs">
      <select aria-label="Pemilik" className="mb-3 w-full rounded-md border bg-background p-2" value={id} onChange={(e) => setId(e.target.value)}>{owners.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
      <Input aria-label="PIN pemilik" className="mb-3" type="password" inputMode="numeric" maxLength={6} value={v} onChange={(e) => { setV(e.target.value.replace(/\D/g, "")); setErr(false); }} />
      <div className="mb-4 flex justify-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`size-5 rounded-full border-2 ${err ? "border-destructive" : "border-primary"} ${i < v.length ? "bg-primary" : ""}`} />
        ))}
      </div>
      <p className="mb-3 h-5 text-center text-sm text-destructive">{err ? "PIN salah, coba lagi" : ""}</p>
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "x"].map((d) =>
          d === "" ? <span key="e" /> : (
             <Button key={d} onClick={() => (d === "x" ? setV(v.slice(0, -1)) : press(d))}
              className="num-jumbo flex h-16 items-center justify-center rounded-xl bg-secondary text-2xl active:scale-95">
              {d === "x" ? <Delete /> : d}
             </Button>
          ))}
      </div>
      <Button className="mt-3 w-full" disabled={v.length < 4} onClick={() => verify(v)}>Masuk Pemilik</Button>
      <p className="mt-4 text-center text-xs text-muted-foreground">PIN contoh pemilik: 1234</p>
    </div>
  );
}

export function PinDialog({ open, onOpenChange, onOk }: { open: boolean; onOpenChange: (o: boolean) => void; onOk: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-center text-xl">Masuk Mode Pemilik</DialogTitle></DialogHeader>
        <PinPad onOk={onOk} />
      </DialogContent>
    </Dialog>
  );
}
