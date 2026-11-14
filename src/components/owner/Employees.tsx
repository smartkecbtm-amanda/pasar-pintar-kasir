import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveEmployee, uid, useStore, type Employee, type Role } from "@/lib/store";
import { rp } from "@/lib/format";
import { Field, selectCls } from "./ui";

export function Employees() {
  const s = useStore((s) => s);
  const [edit, setEdit] = useState<Employee | null>(null);
  const [pin, setPin] = useState("");
  return <div className="space-y-4"><div className="flex justify-between items-center"><h2 className="text-xl font-bold">Pegawai & Audit Laci</h2><Button onClick={() => { setPin(""); setEdit({ id: uid(), name: "", nickname: "", phone: "", role: "Kasir", active: true, pinHash: "" }); }}><Plus />Tambah Pegawai</Button></div>
    {s.employees.map((e) => { const sales = s.sales.filter((x) => x.cashierId === e.id); const shifts = s.shifts.filter((x) => x.cashierId === e.id && x.closedAt); return <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><div><b>{e.name}</b><p className="text-sm text-muted-foreground">{e.nickname} · {e.role} · {e.active ? "Aktif" : "Nonaktif"} · {e.phone || "—"}</p><p className="text-sm">{sales.length} transaksi · {rp(sales.reduce((a, x) => a + x.total, 0))} · Selisih laci tanggung jawab {rp(shifts.reduce((a, x) => a + (x.counted ?? 0) - (x.expected ?? 0), 0))}</p></div><Button variant="outline" size="icon" aria-label={`Edit ${e.name}`} onClick={() => { setPin(""); setEdit(e); }}><Pencil /></Button></div>; })}
    <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}><DialogContent><DialogHeader><DialogTitle>Data Pegawai</DialogTitle></DialogHeader>{edit && <>
      <Field label="Nama lengkap"><Input aria-label="Nama lengkap" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
      <Field label="Nama panggilan di struk"><Input aria-label="Nama panggilan di struk" value={edit.nickname} onChange={(e) => setEdit({ ...edit, nickname: e.target.value })} /></Field>
      <Field label="WhatsApp"><Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
      <Field label="Peran"><select aria-label="Peran" className={selectCls} value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}>{["Kasir", "Supervisor", "Pemilik"].map((r) => <option key={r}>{r}</option>)}</select></Field>
      <Field label="PIN baru (4–6 digit)"><Input aria-label="PIN baru" type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value)} /></Field>
      <label className="flex items-center gap-2"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />Aktif</label>
      <Button onClick={async () => { try { await saveEmployee(edit, pin); setEdit(null); toast.success("Pegawai disimpan"); } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal menyimpan"); } }}>Simpan Pegawai</Button>
    </>}</DialogContent></Dialog>
  </div>;
}