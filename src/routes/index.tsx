import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Trash2, PauseCircle, RotateCcw, KeyRound, ScanBarcode, Wallet, X, PlayCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AppBar } from "@/components/pos/AppBar";
import { PinDialog } from "@/components/pos/PinDialog";
import { actions, activeShift, bundleStock, customerBalance, getState, productCost, useStore, type CartItem, type Product } from "@/lib/store";
import { beep, buzz, chime, jam, num, rp } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kasir — POS Warung Kelontong" },
      { name: "description", content: "Layar kasir ramah lansia: tombol barang besar, uang warna Rupiah, kembalian otomatis." },
      { property: "og:title", content: "Kasir — POS Warung Kelontong" },
      { property: "og:description", content: "Layar kasir ramah lansia: tombol barang besar, uang warna Rupiah, kembalian otomatis." },
    ],
  }),
  component: Kasir,
});

const TABS = ["Curah", "Semua", "Digital"] as const;

function Kasir() {
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
  const navigate = useNavigate();
  const scanRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    let l = products;
    if (tab === "Curah") l = l.filter((p) => p.quick);
    if (tab === "Digital") l = l.filter((p) => p.digital);
    if (tab === "Semua") l = l.filter((p) => !p.digital);
    if (q) l = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.barcode === q);
    return l;
  }, [products, tab, q]);

  const add = (p: Product, unitIdx = 0) => {
    const u = p.units[unitIdx];
    const s = getState();
    const avail = p.digital ? Infinity : bundleStock(s, p);
    const inCart = cart.filter((c) => c.productId === p.id).reduce((a, c) => a + c.qty * c.factor, 0);
    if (inCart + u.factor > avail) { buzz(); toast.error(`Stok ${p.name} tinggal ${num(avail)} ${p.baseUnit}`); }
    beep();
    setCart((c) => {
      const i = c.findIndex((x) => x.productId === p.id && x.unit === u.name);
      if (i >= 0) return c.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x));
      return [...c, { productId: p.id, name: p.name, unit: u.name, factor: u.factor, qty: 1, price: u.price, hpp: productCost(s, p) * u.factor }];
    });
  };
  const tapProduct = (p: Product) => (p.units.length > 1 ? setUnitPick(p) : add(p));
  const setQty = (i: number, d: number) => setCart((c) => c.map((x, j) => (j === i ? { ...x, qty: x.qty + d } : x)).filter((x) => x.qty > 0));
  const total = cart.reduce((a, c) => a + c.qty * c.price, 0);

  const onScan = (e: React.FormEvent) => {
    e.preventDefault();
    const p = products.find((x) => x.barcode === q.trim());
    if (p) { add(p); setQ(""); } else if (list.length === 1) { tapProduct(list[0]); setQ(""); } else { buzz(); toast.error("Barang tidak ditemukan"); }
  };

  const doHold = () => {
    if (!cart.length) return;
    actions.hold(`Pembeli ${held.length + 1}`, cart); setCart([]); toast.success("Keranjang diparkir");
  };

  return (
    <div className="flex h-dvh flex-col bg-background">
      <AppBar>
        <button onClick={() => (sessionStorage.getItem("owner") ? navigate({ to: "/pemilik" }) : setPin(true))}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
          <KeyRound className="size-4" /> Pemilik
        </button>
      </AppBar>
      {!shift && (
        <div className="bg-warning/25 px-4 py-2 text-center font-semibold">Laci kasir belum dibuka. Minta pemilik membuka shift agar uang laci tercatat.</div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_minmax(340px,40%)]">
        {/* KIRI: barang */}
        <section className="flex min-h-0 flex-col gap-3 p-3 md:p-4">
          <form onSubmit={onScan} className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-3 top-1/2 size-6 -translate-y-1/2 text-muted-foreground" />
              <Input ref={scanRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Scan barcode / ketik nama barang…" className="h-14 pl-12 text-lg" />
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
                  <span className={big ? "text-6xl" : "text-4xl"}>{p.emoji}</span>
                  <span className={cn("mt-1 font-bold leading-tight", big ? "text-xl" : "text-base")}>{p.name}</span>
                  <span className="num-jumbo text-lg text-primary">{rp(p.units[0].price)}</span>
                  {stock !== null && <span className="text-xs text-muted-foreground">stok {num(stock)} {p.baseUnit}</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* KANAN: keranjang */}
        <section className="flex min-h-0 flex-col border-t bg-card md:border-l md:border-t-0">
          <div className="flex items-center justify-between px-4 pt-3">
            <h2 className="text-xl font-bold">Belanjaan</h2>
            <div className="flex gap-1">
              <button onClick={() => setHoldList(true)} className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold">
                <PlayCircle className="mr-1 inline size-4" />Parkir ({held.length})
              </button>
              {cart.length > 0 && <button onClick={() => setCart([])} className="rounded-lg px-3 py-2 text-sm font-semibold text-destructive"><X className="inline size-4" /> Kosongkan</button>}
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {!cart.length && <p className="py-10 text-center text-lg text-muted-foreground">Tekan foto barang atau scan barcode</p>}
            {cart.map((c, i) => (
              <div key={c.productId + c.unit} className="rounded-xl border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-bold leading-tight">{c.name}</div>
                    <div className="text-sm text-muted-foreground">{c.unit} · {rp(c.price)}</div>
                  </div>
                  <div className="num-jumbo text-2xl">{rp(c.qty * c.price)}</div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => setQty(i, -1)} className="flex size-12 items-center justify-center rounded-xl bg-secondary">{c.qty === 1 ? <Trash2 className="text-destructive" /> : <Minus />}</button>
                  <span className="num-jumbo w-12 text-center text-3xl">{c.qty}</span>
                  <button onClick={() => setQty(i, 1)} className="flex size-12 items-center justify-center rounded-xl bg-secondary"><Plus /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t p-4">
            <div className="flex items-end justify-between">
              <span className="text-xl font-semibold">TOTAL</span>
              <span className="num-jumbo text-[36px] leading-none text-primary">{rp(total)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={doHold} disabled={!cart.length} className="flex flex-col items-center rounded-xl bg-secondary py-3 font-bold disabled:opacity-40"><PauseCircle />Parkir</button>
              <button onClick={() => setRetur(true)} className="flex flex-col items-center rounded-xl bg-secondary py-3 font-bold"><RotateCcw />Retur/Tukar</button>
              <button onClick={() => cart.length && setPay(true)} disabled={!cart.length}
                className="flex flex-col items-center rounded-xl bg-primary py-3 text-lg font-extrabold text-primary-foreground disabled:opacity-40"><Wallet />BAYAR</button>
            </div>
          </div>
        </section>
      </div>

      <UnitDialog product={unitPick} onClose={() => setUnitPick(null)} onPick={(i) => { add(unitPick!, i); setUnitPick(null); }} />
      <PayDialog open={pay} onOpenChange={setPay} cart={cart} total={total} onDone={() => { setCart([]); setPay(false); scanRef.current?.focus(); }} />
      <ReturDialog open={retur} onOpenChange={setRetur} />
      <Dialog open={holdList} onOpenChange={setHoldList}>
        <DialogContent>
          <DialogHeader><DialogTitle>Keranjang Diparkir</DialogTitle></DialogHeader>
          {!held.length && <p className="text-muted-foreground">Belum ada keranjang yang diparkir.</p>}
          {held.map((h) => (
            <button key={h.id} onClick={() => {
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
];

function PayDialog({ open, onOpenChange, cart, total, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; cart: CartItem[]; total: number; onDone: () => void }) {
  const customers = useStore((s) => s.customers);
  const [paid, setPaid] = useState(0);
  const [adj, setAdj] = useState<{ v: number; note: string } | null>(null);
  const [method, setMethod] = useState<"tunai" | "qris" | "kasbon">("tunai");
  const [cust, setCust] = useState("");
  const [done, setDone] = useState<number | null>(null);
  const final = total + (adj?.v ?? 0);
  const change = paid - final;
  const remainder = total % 500;

  const reset = () => { setPaid(0); setAdj(null); setMethod("tunai"); setCust(""); setDone(null); };
  const finish = (m: typeof method, paidAmt: number) => {
    if (m === "kasbon") {
      const c = customers.find((x) => x.id === cust);
      if (!c) return toast.error("Pilih nama pelanggan dulu");
      const bal = customerBalance(getState(), c.id);
      if (bal + final > c.limit) { buzz(); return toast.error(`Melebihi limit! Sisa limit ${c.name}: ${rp(c.limit - bal)}`); }
    }
    actions.checkout({ items: cart, subtotal: total, adjust: adj?.v ?? 0, adjustNote: adj?.note, total: final, paid: paidAmt, change: Math.max(0, paidAmt - final), method: m, customerId: m === "kasbon" ? cust : undefined });
    chime();
    setDone(Math.max(0, paidAmt - final));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { if (done !== null) onDone(); reset(); } }}>
      <DialogContent className="max-h-[95dvh] max-w-2xl overflow-y-auto">
        {done !== null ? (
          <div className="py-6 text-center">
            <div className="text-6xl">✅</div>
            <p className="mt-2 text-2xl font-bold">Transaksi Berhasil</p>
            {method === "tunai" && <><p className="mt-4 text-xl">Kembalian</p><p className="num-jumbo text-6xl text-primary">{rp(done)}</p></>}
            {method === "kasbon" && <p className="mt-4 text-xl">Dicatat di buku kasbon</p>}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button onClick={() => toast.info("Struk dikirim ke printer (simulasi)")} className="rounded-xl bg-secondary py-4 text-lg font-bold">🖨️ Cetak Struk</button>
              <button onClick={() => { onDone(); reset(); }} className="rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground">Pembeli Baru</button>
            </div>
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
                <button onClick={() => setAdj(adj?.note === "Donasi" ? null : { v: 500 - remainder, note: "Donasi" })} className={cn("rounded-xl border-2 p-2 text-sm font-semibold", adj?.note === "Donasi" && "border-primary")}>🤲 Donasi<br />{rp(500 - remainder)}</button>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {(["tunai", "qris", "kasbon"] as const).map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={cn("rounded-xl py-3 text-lg font-bold capitalize", method === m ? "bg-primary text-primary-foreground" : "bg-secondary")}>{m === "qris" ? "QRIS" : m}</button>
              ))}
            </div>
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
            {method === "qris" && (
              <div className="space-y-3 text-center">
                <div className="mx-auto grid size-48 grid-cols-8 gap-0.5 rounded-xl border-4 border-foreground bg-card p-2">
                  {Array.from({ length: 64 }, (_, i) => <span key={i} className={(i * 7 + (i >> 3)) % 3 ? "bg-foreground" : ""} />)}
                </div>
                <p className="text-muted-foreground">Minta pembeli scan, lalu cek notifikasi masuk.</p>
                <button onClick={() => finish("qris", final)} className="w-full rounded-xl bg-primary py-5 text-2xl font-extrabold text-primary-foreground">SUDAH DITERIMA</button>
              </div>
            )}
            {method === "kasbon" && (
              <div className="space-y-2">
                {customers.map((c) => {
                  const bal = customerBalance(getState(), c.id);
                  return (
                    <button key={c.id} onClick={() => setCust(c.id)} className={cn("flex w-full justify-between rounded-xl border-2 p-3 text-left", cust === c.id && "border-primary")}>
                      <b className="text-lg">{c.name}</b>
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
  );
}

function ReturDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const sales = useStore((s) => s.sales);
  const recent = sales.filter((s) => s.method !== "kasbon").slice(-8).reverse();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle className="text-2xl">Retur / Tukar Barang</DialogTitle></DialogHeader>
        <p className="text-muted-foreground">Pilih barang dari transaksi terakhir. Stok kembali, uang dikembalikan dari laci.</p>
        {recent.map((s) => (
          <div key={s.id} className="rounded-xl border p-3">
            <div className="mb-2 text-sm text-muted-foreground">{jam(s.ts)} · {rp(s.total)}</div>
            {s.items.map((it) => (
              <div key={it.productId + it.unit} className="flex items-center justify-between gap-2 py-1">
                <span className="font-semibold">{it.name} <span className="text-sm font-normal">({it.qty} {it.unit})</span></span>
                <div className="flex gap-1">
                  <button onClick={() => { actions.retur(it.productId, it.factor, it.price, `Retur ${it.name}`); chime(); toast.success(`Retur 1 ${it.unit} ${it.name}. Kembalikan ${rp(it.price)}`); }} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-bold text-destructive">Retur 1</button>
                  <button onClick={() => { actions.retur(it.productId, 0, 0, ""); chime(); toast.success(`Tukar ${it.name} dengan barang yang sama — stok tidak berubah`); }} className="rounded-lg bg-secondary px-3 py-2 text-sm font-bold">Tukar</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}
