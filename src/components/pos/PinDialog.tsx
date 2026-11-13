import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { buzz, beep } from "@/lib/format";
import { Delete } from "lucide-react";

export function PinPad({ onOk }: { onOk: () => void }) {
  const pin = useStore((s) => s.pin);
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  const press = (d: string) => {
    beep();
    const n = (v + d).slice(0, 4);
    setV(n); setErr(false);
    if (n.length === 4) {
      if (n === pin) { sessionStorage.setItem("owner", "1"); onOk(); }
      else { buzz(); setErr(true); setTimeout(() => setV(""), 300); }
    }
  };
  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="mb-4 flex justify-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`size-5 rounded-full border-2 ${err ? "border-destructive" : "border-primary"} ${i < v.length ? "bg-primary" : ""}`} />
        ))}
      </div>
      <p className="mb-3 h-5 text-center text-sm text-destructive">{err ? "PIN salah, coba lagi" : ""}</p>
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "x"].map((d) =>
          d === "" ? <span key="e" /> : (
            <button key={d} onClick={() => (d === "x" ? setV(v.slice(0, -1)) : press(d))}
              className="num-jumbo flex h-16 items-center justify-center rounded-xl bg-secondary text-2xl active:scale-95">
              {d === "x" ? <Delete /> : d}
            </button>
          ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">PIN contoh: 1234</p>
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
