import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Trash2, PauseCircle, RotateCcw, KeyRound, ScanBarcode, Wallet, X, PlayCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AppBar } from "@/components/pos/AppBar";
import { PinDialog } from "@/components/pos/PinDialog";
import { actions, activeShift, bundleStock, customerBalance, getState, productCost, useStore, type CartItem, type Product, type Sale } from "@/lib/store";
import { beep, buzz, chime, jam, num, rp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmployeeAccess } from "@/components/pos/EmployeeAccess";
import { currentEmployee, type Payment } from "@/lib/store";
import { formatStock, kasbonStatus, searchProducts, wholesalePrice } from "@/lib/operations";
import { actionsPlus } from "@/lib/store-extra";
import { printSaleSmart, printerConnected, readStableWeight, useDevices } from "@/lib/devices";
import { PpobDialog } from "@/components/pos/Ppob";
import { CameraScanner } from "@/components/pos/CameraScanner";
import { PriveDialog } from "@/components/pos/PriveDialog";
import { QrisPanel } from "@/components/pos/QrisPanel";
import { PrintPortal, sendReceiptWhatsApp } from "@/components/pos/Receipt";
import { SalesHistory } from "@/components/pos/SalesHistory";
import { useScannerCapture } from "@/components/pos/useScanner";
import { ShiftTab } from "@/components/owner/Shift";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kasir — POS Warung Kelontong" },
      { name: "description", content: "Layar kasir ramah lansia: tombol barang besar, uang warna Rupiah, kembalian otomatis." },
      { property: "og:title", content: "Kasir — POS Warung Kelontong" },
      { property: "og:description", content: "Layar kasir ramah lansia: tombol barang besar, uang warna Rupiah, kembalian otomatis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Kasir,
});

const TABS = ["Curah", "Semua", "Digital"] as const;

function Kasir() {
  const s = useStore((s) => s);
  const [employee, setEmployee] = useState<string | null>(null);
  const [access, setAccess] = useState(false);
  const [shiftPanel, setShiftPanel] = useState(false);
  useEffect(() => { setEmployee(currentEmployee()?.id ?? null); }, [s]);
  const products = useStore((s) => s.products);
  const held = useStore((s) => s.held);
  const shift = useStore(activeShift);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Curah");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pay, setPay] = useState(false);
  const [retur, setRetur] = useState(false);
  const [holdList, setHoldList] = useState(false);
  const [pin, setPin] = useState(false);
  const [unitPick, setUnitPick] = useState<Product | null>(null);
  const [history, setHistory] = useState(false);
  const [ppobOpen, setPpobOpen] = useState(false);
  const [camera, setCamera] = useState(false);
  const [priveOpen, setPriveOpen] = useState(false);
  const devices = useDevices();
  const [priceEdit, setPriceEdit] = useState<number | null>(null);
  const [priceVal, setPriceVal] = useState("");
  const navigate = useNavigate();
  const scanRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    let l = products;
    if (tab === "Curah") l = l.filter((p) => p.quick);
    if (tab === "Digital") l = l.filter((p) => p.digital);
    if (tab === "Semua") l = l.filter((p) => !p.digital);
    if (q) l = searchProducts(products, q);
    return l;
  }, [products, tab, q]);

  const add = (p: Product, unitIdx = 0) => {
    const u = p.units[unitIdx];
    if (!u) return;
    const s = getState();
    const avail = p.digital ? Infinity : bundleStock(s, p);
    const inCart = cart.filter((c) => c.productId === p.id).reduce((a, c) => a + c.qty * c.factor, 0);
    if (inCart + u.factor > avail) { buzz(); toast.error(`Stok ${p.name} tinggal ${num(avail)} ${p.baseUnit}`); }
    beep();
    setCart((c) => {
      const i = c.findIndex((x) => x.productId === p.id && x.unit === u.name);
      if (i >= 0) return c.map((x, j) => { if (j !== i) return x; if (x.manual) return { ...x, qty: x.qty + 1 }; const next = { ...x, qty: x.qty + 1, price: u.price }; return { ...next, price: wholesalePrice(p, next) }; });
      return [...c, { productId: p.id, name: p.name, unit: u.name, factor: u.factor, qty: 1, price: u.price, hpp: productCost(s, p) * u.factor }];
    });
  };
  const tapProduct = (p: Product) => (p.units.length > 1 ? setUnitPick(p) : add(p));
  const reprice = (x: CartItem, qty: number): CartItem => {
    if (x.manual) return { ...x, qty };
    const p = products.find((p) => p.id === x.productId);
    const unit = p?.units.find((u) => u.name === x.unit);
    const next = { ...x, qty, price: unit?.price ?? x.price };
    return { ...next, price: p ? wholesalePrice(p, next) : next.price };
  };
  const setQty = (i: number, d: number) => setCart((c) => c.map((x, j) => (j === i ? reprice(x, x.qty + d) : x)).filter((x) => x.qty > 0));
  const setQtyAbs = (i: number, v: number) => setCart((c) => c.map((x, j) => (j === i ? reprice(x, v) : x)));
  const weigh = async (i: number) => {
    try { const kg = await readStableWeight(); setQtyAbs(i, kg); toast.success(`Berat ${num(kg)} kg`); }
    catch (e) { buzz(); toast.error(e instanceof Error ? e.message : "Gagal menimbang"); }
  };
  const openPrice = (i: number) => {
    const role = currentEmployee()?.role;
    if (role !== "Pemilik" && role !== "Supervisor") { buzz(); toast.error("Ubah harga membutuhkan supervisor atau pemilik"); return; }
    setPriceVal(String(cart[i]?.price ?? 0)); setPriceEdit(i);
  };
  const applyPrice = () => {
    const v = Number(priceVal);
    if (priceEdit === null || !Number.isFinite(v) || v < 0) { toast.error("Harga tidak valid"); return; }
    setCart((c) => c.map((x, j) => { if (j !== priceEdit) return x; const list = x.listPrice ?? x.price; return { ...x, listPrice: list, price: v, manual: v !== list }; }));
    setPriceEdit(null);
  };
  const total = cart.reduce((a, c) => a + c.qty * c.price, 0);

  const submitCode = (raw: string) => {
    const code = raw.trim();
    const byCode = products.find((x) => x.barcode === code || x.quickCode === code);
    if (byCode) { add(byCode); return true; }
    const found = searchProducts(products, code);
    if (found.length === 1) { tapProduct(found[0]); return true; }
    buzz(); toast.error("Barang tidak ditemukan");
    return false;
  };
  const onScan = (e: React.FormEvent) => { e.preventDefault(); if (submitCode(q)) setQ(""); };
  useScannerCapture((code) => { submitCode(code); }, !!employee && !!shift && !pay && !retur && !history && !access && !pin && !shiftPanel && !holdList && !unitPick && priceEdit === null && !ppobOpen && !camera && !priveOpen);
  useEffect(() => { scanRef.current?.focus(); }, []);

  const doHold = () => {
    if (!cart.length) return;
    try { actions.hold(`Pembeli ${held.length + 1}`, cart); setCart([]); toast.success("Keranjang diparkir"); } catch (e) { toast.error(e instanceof Error ? e.message : "Parkir penuh"); }
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "F2") { e.preventDefault(); scanRef.current?.focus(); } if (e.key === "F4") { e.preventDefault(); doHold(); } if (e.key === "F8") { e.preventDefault(); if (cart.length && employee && shift) setPay(true); } };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [cart, employee, shift, held]);

  return (
    <div className="cashier-screen flex h-dvh flex-col bg-background">
      <AppBar>
        <Button variant="secondary" onClick={() => setAccess(true)}>{employee ? s.employees.find((e) => e.id === employee)?.nickname : "Masuk Kasir"}</Button>
        {employee && shift && <Button variant="secondary" onClick={() => setShiftPanel(true)}>Laci</Button>}
        <Button onClick={() => (currentEmployee()?.role === "Pemilik" ? navigate({ to: "/pemilik" }) : setPin(true))}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
          <KeyRound className="size-4" /> Pemilik
        </Button>
      </AppBar>
      {!shift && (
        <div className="bg-warning/25 px-4 py-2 text-center font-semibold"><Button variant="ghost" onClick={() => setAccess(true)}>Buka Shift Utama</Button></div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_minmax(340px,40%)]">
        {/* KIRI: barang */}
        <section className="cashier-products flex min-h-0 flex-col gap-3 p-3 md:p-4">
          <form onSubmit={onScan} className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-3 top-1/2 size-6 -translate-y-1/2 text-muted-foreground" />
              <Input ref={scanRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Scan barcode, kode cepat, atau ketik nama…" className="h-14 pl-12 text-lg" />
            </div>
          </form>
          <div className="flex gap-2">
            {TABS.map((t) => (
              <button key={t} onClick={() => { setTab(t); setQ(""); }}
                className={cn("flex-1 rounded-xl py-3 text-lg font-bold", tab === t && !q ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                {t === "Curah" ? "Barang Sering" : t === "Digital" ? "Pulsa & Token" : "Semua"}
              </button>
            ))}
          </div>
          <div className={cn("grid min-h-0 flex-1 content-start gap-3 overflow-y-auto pb-2", tab === "Curah" && !q ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}>
            {list.map((p) => {
              const stock = p.digital ? null : bundleStock(getState(), p);
              const big = tab === "Curah" && !q;
              return (
                <button key={p.id} onClick={() => tapProduct(p)}
                  className={cn("flex flex-col items-center justify-center rounded-2xl border-2 bg-card p-3 text-center shadow-sm transition active:scale-95 hover:border-primary", big ? "min-h-40" : "min-h-28", stock !== null && stock <= p.minStock && "border-warning")}>
                  {p.photo ? <img src={p.photo} alt="" className={cn("rounded-lg object-cover", big ? "size-24" : "size-16")} /> : <span className={big ? "text-6xl" : "text-4xl"}>{p.emoji}</span>}
                  <span className={cn("mt-1 font-bold leading-tight", big ? "text-xl" : "text-base")}>{p.name}</span>
                  <span className="num-jumbo text-lg text-primary">{rp(p.units[0].price)}</span>
                  {stock !== null && <span className="text-xs text-muted-foreground">stok {p.bundle ? `${num(stock)} ${p.baseUnit}` : formatStock({ stock, baseUnit: p.baseUnit, units: p.units })}</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* KANAN: keranjang */}
        <section className="flex min-h-0 flex-col border-t bg-card md:border-l md:border-t-0">
          <div className="flex items-center justify-between px-4 pt-3">
            <h2 className="text-xl font-bold">Belanjaan</h2>
            <div className="flex flex-wrap justify-end gap-1">
              <button onClick={() => setPpobOpen(true)} disabled={!shift} className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold disabled:opacity-40">Layanan</button>
              <button onClick={() => setCamera(true)} className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold"><ScanBarcode className="mr-1 inline size-4" />Kamera</button>
              {currentEmployee()?.role === "Pemilik" && <button onClick={() => setPriveOpen(true)} className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold">Prive</button>}
              <button onClick={() => setHistory(true)} disabled={!shift} className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold disabled:opacity-40">Nota</button>
              <button onClick={() => setHoldList(true)} className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold">
                <PlayCircle className="mr-1 inline size-4" />Parkir ({held.length})
              </button>
              {cart.length > 0 && <button onClick={() => setCart([])} className="rounded-lg px-3 py-2 text-sm font-semibold text-destructive"><X className="inline size-4" /> Kosongkan</button>}
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {!cart.length && <p className="py-10 text-center text-lg text-muted-foreground">Tekan foto barang atau scan barcode</p>}
            {cart.map((c, i) => {
              const kg = products.find((p) => p.id === c.productId)?.baseUnit === "kg" && c.factor === 1;
              return (
                <div key={c.productId + c.unit} className="rounded-xl border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-lg font-bold leading-tight">{c.name}</div>
                      <div className="text-sm text-muted-foreground">{c.unit} · {rp(c.price)}{c.manual && c.listPrice !== undefined ? ` (normal ${rp(c.listPrice)})` : ""}</div>
                    </div>
                    <div className="num-jumbo text-2xl">{rp(c.qty * c.price)}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => setQty(i, -1)} aria-label="Kurangi" className="flex size-12 items-center justify-center rounded-xl bg-secondary">{c.qty === 1 ? <Trash2 className="text-destructive" /> : <Minus />}</button>
                    <span className="num-jumbo w-14 text-center text-3xl">{num(c.qty)}</span>
                    <button onClick={() => setQty(i, 1)} aria-label="Tambah" className="flex size-12 items-center justify-center rounded-xl bg-secondary"><Plus /></button>
                    <button onClick={() => openPrice(i)} className="ml-auto rounded-lg px-2 py-2 text-sm font-semibold text-primary">Ubah harga</button>
                  </div>
                  {kg && (
                    <div className={cn("mt-2 grid gap-2", devices.scale ? "grid-cols-5" : "grid-cols-4")}>
                      {([[0.25, "¼ kg"], [0.5, "½ kg"], [0.75, "¾ kg"], [1, "1 kg"]] as const).map(([v, label]) => (
                        <button key={label} onClick={() => setQtyAbs(i, v)} className={cn("rounded-lg border py-2 font-bold", c.qty === v && "border-primary bg-primary/10")}>{label}</button>
                      ))}
                      {devices.scale && <button onClick={() => void weigh(i)} aria-label="Timbang" className="rounded-lg border-2 border-primary py-2 font-bold">⚖️</button>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="space-y-3 border-t p-4">
            <div className="flex items-end justify-between">
              <span className="text-xl font-semibold">TOTAL</span>
              <span className="num-jumbo text-[36px] leading-none text-primary">{rp(total)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={doHold} disabled={!cart.length} className="flex flex-col items-center rounded-xl bg-secondary py-3 font-bold disabled:opacity-40"><PauseCircle />Parkir</button>
              <Button variant="secondary" onClick={() => { const role = currentEmployee()?.role; if (role === "Pemilik" || role === "Supervisor") setRetur(true); else toast.error("Retur membutuhkan persetujuan supervisor atau pemilik"); }} className="flex h-auto flex-col items-center rounded-xl py-3 font-bold"><RotateCcw />Retur/Tukar</Button>
              <Button onClick={() => { if (!employee || !shift?.participants?.includes(employee)) setAccess(true); else if (cart.length) setPay(true); }} disabled={!cart.length}
                className="flex h-auto flex-col items-center rounded-xl py-3 text-lg font-extrabold disabled:opacity-40"><Wallet />BAYAR</Button>
            </div>
          </div>
        </section>
      </div>

      <EmployeeAccess open={access} onClose={() => { setAccess(false); setEmployee(currentEmployee()?.id ?? null); }} />
      <Dialog open={shiftPanel} onOpenChange={setShiftPanel}><DialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Laci Bersama</DialogTitle></DialogHeader><ShiftTab /><Button variant="outline" onClick={() => { sessionStorage.removeItem("employee"); sessionStorage.removeItem("owner"); setEmployee(null); setShiftPanel(false); }}>Selesai Membantu / Keluar</Button></DialogContent></Dialog>
      <UnitDialog product={unitPick} onClose={() => setUnitPick(null)} onPick={(i) => { if (unitPick) add(unitPick, i); setUnitPick(null); }} />
      <PayDialog open={pay} onOpenChange={setPay} cart={cart} total={total} onDone={() => { setCart([]); setPay(false); scanRef.current?.focus(); }} />
      <ReturDialog open={retur} onOpenChange={setRetur} />
      <SalesHistory open={history} onOpenChange={setHistory} />
      <PpobDialog open={ppobOpen} onOpenChange={setPpobOpen} />
      <PriveDialog open={priveOpen} onOpenChange={setPriveOpen} />
      <CameraScanner open={camera} onOpenChange={setCamera} onCode={(c) => { submitCode(c); }} />
      <Dialog open={priceEdit !== null} onOpenChange={(o) => !o && setPriceEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Ubah Harga</DialogTitle></DialogHeader>
          {priceEdit !== null && cart[priceEdit] && (
            <div className="space-y-3">
              <p className="text-muted-foreground">{cart[priceEdit].name} per {cart[priceEdit].unit}. Harga normal {rp(cart[priceEdit].listPrice ?? cart[priceEdit].price)}. Perubahan tercatat di audit.</p>
              <Input aria-label="Harga baru" type="number" min={0} value={priceVal} onChange={(e) => setPriceVal(e.target.value)} className="h-14 text-xl" />
              <Button className="w-full" onClick={applyPrice}>Terapkan</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={holdList} onOpenChange={setHoldList}>
        <DialogContent>
          <DialogHeader><DialogTitle>Keranjang Diparkir</DialogTitle></DialogHeader>
          {!held.length && <p className="text-muted-foreground">Belum ada keranjang yang diparkir.</p>}
          {held.map((h) => (
            <button key={h.id} onClick={() => {
              if (cart.length && held.length >= 5) { toast.error("Parkir penuh; kosongkan keranjang dahulu"); return; }
              if (cart.length) actions.hold(`Pembeli ${held.length + 1}`, cart);
              setCart(h.items); actions.unhold(h.id); setHoldList(false);
            }} className="flex w-full items-center justify-between rounded-xl border p-4 text-left hover:border-primary">
              <span><b className="text-lg">{h.label}</b><br /><span className="text-sm text-muted-foreground">{jam(h.ts)} · {h.items.length} barang</span></span>
              <span className="num-jumbo text-xl">{rp(h.items.reduce((a, c) => a + c.qty * c.price, 0))}</span>
            </button>
          ))}
        </DialogContent>
      </Dialog>
      <PinDialog open={pin} onOpenChange={setPin} onOk={() => navigate({ to: "/pemilik" })} />
    </div>
  );
}

function UnitDialog({ product, onClose, onPick }: { product: Product | null; onClose: () => void; onPick: (i: number) => void }) {
  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-2xl">{product?.emoji} {product?.name}</DialogTitle></DialogHeader>
        <div className="grid gap-2">
          {product?.units.map((u, i) => (
            <button key={u.name} onClick={() => onPick(i)} className="flex items-center justify-between rounded-xl border-2 p-4 hover:border-primary">
              <span className="text-xl font-bold">{u.name}</span><span className="num-jumbo text-2xl text-primary">{rp(u.price)}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const NOTES = [
  { v: 100000, label: "100rb", cls: "bg-cash-100 text-primary-foreground" },
  { v: 50000, label: "50rb", cls: "bg-cash-50 text-primary-foreground" },
  { v: 20000, label: "20rb", cls: "bg-cash-20 text-primary-foreground" },
  { v: 10000, label: "10rb", cls: "bg-cash-10 text-primary-foreground" },
  { v: 5000, label: "5rb", cls: "bg-cash-5 text-accent-foreground" },
  { v: 2000, label: "2rb", cls: "bg-cash-pas text-primary-foreground" },
  { v: 1000, label: "1rb", cls: "bg-secondary text-secondary-foreground" },
];

function PayDialog({ open, onOpenChange, cart, total, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; cart: CartItem[]; total: number; onDone: () => void }) {
  const customers = useStore((s) => s.customers).filter((c) => c.active !== false);
  const [paid, setPaid] = useState(0);
  const [adj, setAdj] = useState<{ v: number; note: string } | null>(null);
  const [method, setMethod] = useState<"tunai" | "qris" | "kasbon" | "split">("tunai");
  const [splitCash, setSplitCash] = useState(0);
  const [splitOther, setSplitOther] = useState<"qris" | "kasbon">("qris");
  const [cust, setCust] = useState("");
  const [done, setDone] = useState<number | null>(null);
  const [saleDone, setSaleDone] = useState<Sale | null>(null);
  const shop = useStore((s) => s.shopName);
  const step = useStore((s) => s.roundingStep) || 500;
  const paper = useStore((s) => s.paperWidth);
  const [override, setOverride] = useState<{ m: "tunai" | "qris" | "kasbon" | "split"; paidAmt: number } | null>(null);
  const [ovPin, setOvPin] = useState("");
  const final = total + (adj?.v ?? 0);
  const change = paid - final;
  const remainder = total % step;

  const reset = () => { setPaid(0); setAdj(null); setMethod("tunai"); setCust(""); setDone(null); setSaleDone(null); setSplitCash(0); };
  const finish = (m: typeof method, paidAmt: number, ref?: string, overrideBy?: string) => {
    if (m === "kasbon" || (m === "split" && splitOther === "kasbon")) {
      const c = customers.find((x) => x.id === cust);
      if (!c) return toast.error("Pilih nama pelanggan dulu");
      const bal = customerBalance(getState(), c.id);
      if (!overrideBy && bal + (m === "split" ? final - splitCash : final) > c.limit) { buzz(); setOverride({ m, paidAmt }); return toast.error(`Melebihi limit! Sisa limit ${c.name}: ${rp(c.limit - bal)}. Butuh PIN pemilik.`); }
    }
    const payments: Payment[] = m === "split" ? [{ method: "tunai", amount: splitCash }, { method: splitOther, amount: final - splitCash }] : [{ method: m, amount: final, ...(ref ? { ref } : {}) }];
    let sale: Sale | undefined;
    try { sale = actions.checkout({ items: cart, subtotal: total, adjust: adj?.v ?? 0, adjustNote: adj?.note, total: final, paid: paidAmt, change: m === "tunai" ? Math.max(0, paidAmt - final) : 0, method: m, payments, customerId: m === "kasbon" || (m === "split" && splitOther === "kasbon") ? cust : undefined, limitOverrideBy: overrideBy }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Pembayaran gagal"); return; }
    if (!sale) return;
    setSaleDone(sale);
    if (printerConnected()) void printSaleSmart(sale, shop, paper);
    chime();
    const cashChange = m === "tunai" ? Math.max(0, paidAmt - final) : 0;
    setDone(cashChange);
    if ("speechSynthesis" in window && m === "tunai") { const speech = new SpeechSynthesisUtterance(`Kembalian ${cashChange} rupiah`); speech.lang = "id-ID"; window.speechSynthesis.speak(speech); }
  };

  useEffect(() => {
    if (done === null) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Enter" && saleDone) { e.preventDefault(); void printSaleSmart(saleDone, shop, paper); } };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [done, saleDone, shop, paper]);

  return (
    <>
    <Dialog open={!!override} onOpenChange={(o) => { if (!o) { setOverride(null); setOvPin(""); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Melebihi Limit Kasbon</DialogTitle></DialogHeader>
        <p className="text-muted-foreground">Minta pemilik memasukkan PIN untuk menyetujui kasbon ini.</p>
        <Input aria-label="PIN pemilik" type="password" inputMode="numeric" value={ovPin} onChange={(e) => setOvPin(e.target.value)} className="h-14 text-center text-2xl tracking-widest" />
        <Button onClick={async () => { const who = await actionsPlus.verifyOwnerPin(ovPin); if (!who) { buzz(); toast.error("PIN pemilik salah"); return; } const o = override; setOverride(null); setOvPin(""); if (o) finish(o.m, o.paidAmt, undefined, who); }}>Setujui</Button>
      </DialogContent>
    </Dialog>
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { if (done !== null) onDone(); reset(); } }}>
      <DialogContent className="max-h-[95dvh] max-w-2xl overflow-y-auto">
        {done !== null ? (
          <div className="py-6 text-center">
            <div className="text-6xl">✅</div>
            <p className="mt-2 text-2xl font-bold">Transaksi Berhasil</p>
            {method === "tunai" && <><p className="mt-4 text-xl">Kembalian</p><p className="num-jumbo text-6xl text-primary">{rp(done)}</p></>}
            {method === "kasbon" && <p className="mt-4 text-xl">Dicatat di buku kasbon</p>}
            <div className="mt-6 grid grid-cols-3 gap-2">
              <button onClick={() => saleDone && void printSaleSmart(saleDone, shop, paper)} className="rounded-xl bg-secondary py-4 text-lg font-bold">🖨️ Cetak</button>
              <button onClick={() => saleDone && sendReceiptWhatsApp(saleDone, shop)} className="rounded-xl bg-secondary py-4 text-lg font-bold">WhatsApp</button>
              <button onClick={() => { onDone(); reset(); }} className="rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground">Pembeli Baru</button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Tekan Enter untuk mencetak struk.</p>
            <PrintPortal sale={saleDone} shop={shop} width={paper} />
          </div>
        ) : (
          <>
            <DialogHeader><DialogTitle className="text-2xl">Pembayaran</DialogTitle></DialogHeader>
            <div className="flex items-end justify-between rounded-xl bg-muted p-4">
              <div>
                <div className="text-lg">Harus dibayar</div>
                {adj && <div className="text-sm text-muted-foreground">{adj.note} ({adj.v > 0 ? "+" : ""}{rp(adj.v)})</div>}
              </div>
              <div className="num-jumbo text-[36px] leading-none">{rp(final)}</div>
            </div>
            {remainder > 0 && (
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setAdj(adj?.note === "Bulatkan ke bawah" ? null : { v: -remainder, note: "Bulatkan ke bawah" })} className={cn("rounded-xl border-2 p-2 text-sm font-semibold", adj?.note === "Bulatkan ke bawah" && "border-primary")}>⬇️ Bulatkan<br />{rp(total - remainder)}</button>
                <button onClick={() => setAdj(adj?.note === "Ganti permen" ? null : { v: 0, note: "Ganti permen" })} className={cn("rounded-xl border-2 p-2 text-sm font-semibold", adj?.note === "Ganti permen" && "border-primary")}>🍬 Kembalian koin<br />ganti permen</button>
                <button onClick={() => setAdj(adj?.note === "Donasi" ? null : { v: step - remainder, note: "Donasi" })} className={cn("rounded-xl border-2 p-2 text-sm font-semibold", adj?.note === "Donasi" && "border-primary")}>🤲 Donasi<br />{rp(step - remainder)}</button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["tunai", "qris", "kasbon", "split"] as const).map((m) => (
                <Button key={m} variant={method === m ? "default" : "secondary"} onClick={() => setMethod(m)} className="h-14 text-lg font-bold capitalize">{m === "qris" ? "QRIS" : m === "split" ? "Gabungan" : m}</Button>
              ))}
            </div>
            {method === "split" && <div className="space-y-3"><label className="block font-semibold">Bagian Tunai<Input aria-label="Bagian Tunai" type="number" min={0} max={final} value={splitCash} onChange={(e) => setSplitCash(Number(e.target.value))} /></label><div className="flex gap-2">{(["qris", "kasbon"] as const).map((m) => <Button key={m} variant={splitOther === m ? "default" : "secondary"} onClick={() => setSplitOther(m)}>{m.toUpperCase()}</Button>)}</div><p>Sisa {splitOther.toUpperCase()}: <b>{rp(final - splitCash)}</b></p>{splitOther === "kasbon" && <select aria-label="Pelanggan kasbon" className="w-full rounded-md border bg-background p-3" value={cust} onChange={(e) => setCust(e.target.value)}><option value="">Pilih pelanggan</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}<Button className="w-full h-14 text-lg" disabled={splitCash < 0 || splitCash > final || (splitOther === "kasbon" && !cust)} onClick={() => finish("split", splitCash)}>SELESAI GABUNGAN</Button></div>}
            {method === "tunai" && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {NOTES.map((n) => (
                    <button key={n.v} onClick={() => { beep(); setPaid(paid + n.v); }} className={cn("num-jumbo h-20 rounded-xl text-2xl shadow active:scale-95", n.cls)}>{n.label}</button>
                  ))}
                  <button onClick={() => { beep(); setPaid(final); }} className="num-jumbo h-20 rounded-xl bg-cash-pas text-2xl text-primary-foreground shadow active:scale-95">Uang Pas</button>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-lg">Uang diterima: <b className="num-jumbo text-2xl">{rp(paid)}</b></span>
                  <button onClick={() => setPaid(0)} className="text-sm font-semibold text-destructive">Ulangi</button>
                </div>
                <div className={cn("rounded-xl p-4 text-center", change >= 0 ? "bg-success/15" : "bg-destructive/10")}>
                  <div className="text-lg">{change >= 0 ? "Kembalian" : "Kurang"}</div>
                  <div className={cn("num-jumbo text-5xl", change >= 0 ? "text-success" : "text-destructive")}>{rp(Math.abs(change))}</div>
                </div>
                <button disabled={change < 0} onClick={() => finish("tunai", paid)} className="w-full rounded-xl bg-primary py-5 text-2xl font-extrabold text-primary-foreground disabled:opacity-40">SELESAI</button>
              </>
            )}
            {method === "qris" && <QrisPanel amount={final} onPaid={(ref) => finish("qris", final, ref)} onManual={() => finish("qris", final)} />}
            {method === "kasbon" && (
              <div className="space-y-2">
                {customers.map((c) => {
                  const bal = customerBalance(getState(), c.id);
                  return (
                    <button key={c.id} onClick={() => setCust(c.id)} className={cn("flex w-full justify-between rounded-xl border-2 p-3 text-left", cust === c.id && "border-primary")}>
                      <b className="text-lg"><span className={cn("mr-1", kasbonStatus(getState(), c) === "merah" ? "text-destructive" : kasbonStatus(getState(), c) === "kuning" ? "text-warning" : "text-success")}>●</span>{c.name}</b>
                      <span className={cn("text-sm", bal + final > c.limit && "text-destructive")}>utang {rp(bal)} / limit {rp(c.limit)}</span>
                    </button>
                  );
                })}
                <button onClick={() => finish("kasbon", 0)} className="w-full rounded-xl bg-primary py-5 text-2xl font-extrabold text-primary-foreground">CATAT KASBON</button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

function ReturDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const sales = useStore((s) => s.sales);
  const returns = useStore((s) => s.returns);
  const recent = sales.filter((x) => !x.voided && x.method !== "kasbon").slice(-8).reverse();
  const run = (saleId: string, it: CartItem, kind: "retur" | "tukar") => {
    try {
      actions.returnItem(saleId, it.productId, it.unit, kind);
      chime();
      toast.success(kind === "retur" ? `Retur 1 ${it.unit} ${it.name}. Kembalikan ${rp(it.price)}` : `Tukar ${it.name} dengan yang baru; barang rusak dicatat keluar stok`);
    } catch (e) { buzz(); toast.error(e instanceof Error ? e.message : "Retur gagal"); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle className="text-2xl">Retur / Tukar Barang</DialogTitle></DialogHeader>
        <p className="text-muted-foreground">Pilih barang dari transaksi terakhir. Retur: stok kembali dan uang dikembalikan dari laci. Tukar: barang rusak dibuang, stok baru keluar. Jumlah dibatasi sesuai nota.</p>
        {recent.map((s) => (
          <div key={s.id} className="rounded-xl border p-3">
            <div className="mb-2 text-sm text-muted-foreground">{jam(s.ts)} · {rp(s.total)}</div>
            {s.items.map((it) => {
              const left = it.qty - returns.filter((r) => r.saleId === s.id && r.productId === it.productId && r.unit === it.unit).reduce((a, r) => a + r.qty, 0);
              return (
                <div key={it.productId + it.unit} className="flex items-center justify-between gap-2 py-1">
                  <span className="font-semibold">{it.name} <span className="text-sm font-normal">(sisa bisa diretur {num(Math.max(0, left))} {it.unit})</span></span>
                  <div className="flex gap-1">
                    <button disabled={left <= 0} onClick={() => run(s.id, it, "retur")} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-bold text-destructive disabled:opacity-40">Retur 1</button>
                    <button disabled={left <= 0} onClick={() => run(s.id, it, "tukar")} className="rounded-lg bg-secondary px-3 py-2 text-sm font-bold disabled:opacity-40">Tukar</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}
