import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { actions, activeShift, loginEmployee, useStore } from "@/lib/store";
import { Field, selectCls } from "@/components/owner/ui";

export function EmployeeAccess({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore((s) => s);
  const shift = activeShift(s);
  const [id, setId] = useState(s.employees[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [opening, setOpening] = useState("150000");
  const [busy, setBusy] = useState(false);
  async function start() {
    setBusy(true);
    try { await loginEmployee(id, pin); if (shift) actions.joinShift(); else actions.openShift("", Number(opening)); setPin(""); onClose(); toast.success(shift ? "Bergabung ke laci bersama" : "Shift dibuka"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Tidak dapat masuk"); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={(v) => !v && onClose()}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{shift ? "Gabung ke Shift Aktif" : "Buka Shift Utama"}</DialogTitle></DialogHeader>
    <Field label="Pegawai"><select aria-label="Pegawai" className={selectCls} value={id} onChange={(e) => setId(e.target.value)}>{s.employees.filter((e) => e.active).map((e) => <option key={e.id} value={e.id}>{e.name} · {e.role}</option>)}</select></Field>
    <Field label="PIN pribadi"><Input aria-label="PIN pribadi" type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} /></Field>
    {!shift && <Field label="Modal awal laci"><Input aria-label="Modal awal laci" type="number" min={0} value={opening} onChange={(e) => setOpening(e.target.value)} /></Field>}
    <Button size="lg" disabled={busy || pin.length < 4} onClick={start}>{shift ? "Gabung ke Shift Aktif (Laci Bersama)" : "Mulai Shift"}</Button>
  </DialogContent></Dialog>;
}