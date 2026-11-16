import { DAY, activeShift, addCash, currentEmployee, getState, hashPin, logAudit, moveRows, movingAverage, requireLocalRole, setState, uid, type Customer, type PpobTx, type Product, type Transfer, type TransferItem } from "./store";

function need(ok: unknown, msg: string): asserts ok { if (!ok) throw new Error(msg); }
const POSITIVE = (n: number, name: string) => need(Number.isFinite(n) && n > 0, `${name} harus lebih dari 0`);
const SUP: ("Supervisor" | "Pemilik")[] = ["Supervisor", "Pemilik"];

export type InvoiceLine = { productId: string; unitName: string; qty: number; unitCost: number };
export type InvoicePayment = "tunai_laci" | "bank" | "tempo";

/** Aksi lanjutan Fase 1 dan Fase 5. Semua mutasi stok menulis mutasi stok dan jejak audit. */
export const actionsPlus = {
  /** Pegawai cuti tidak bisa masuk; berbeda dari nonaktif. */
  setLeave(employeeId: string, onLeave: boolean) {
    requireLocalRole(["Pemilik"]);
    setState((s) => {
      const e = s.employees.find((x) => x.id === employeeId);
      need(e, "Pegawai tidak ditemukan");
      need(!(onLeave && e.role === "Pemilik" && s.employees.filter((x) => x.role === "Pemilik" && x.active && !x.onLeave).length < 2), "Pemilik terakhir tidak boleh cuti");
      return { employees: s.employees.map((x) => (x.id === employeeId ? { ...x, onLeave } : x)), audit: logAudit(s, currentEmployee(s), onLeave ? "Pegawai cuti" : "Pegawai kembali", e.name) };
    });
  },

  /** Pemilik lupa PIN: pulihkan dengan PIN utama toko (default tertera di pengaturan). */
  async recoverOwnerPin(masterPin: string, employeeId: string, newPin: string) {
    const s0 = getState();
    need(masterPin === s0.pin, "PIN utama toko salah");
    need(/^\d{4,6}$/.test(newPin), "PIN harus 4–6 digit");
    const hash = await hashPin(newPin);
    need(!getState().employees.some((x) => x.id !== employeeId && x.pinHash === hash), "PIN wajib unik per pegawai");
    setState((s) => {
      const e = s.employees.find((x) => x.id === employeeId && x.role === "Pemilik");
      need(e, "Hanya akun pemilik yang dapat dipulihkan dengan PIN utama");
      return { employees: s.employees.map((x) => (x.id === employeeId ? { ...x, pinHash: hash } : x)), audit: logAudit(s, undefined, "Pemulihan PIN pemilik", e.name) };
    });
  },

  /** Verifikasi PIN pemilik tanpa mengganti sesi (untuk persetujuan limit kasbon). Mengembalikan nama pemilik atau null. */
  async verifyOwnerPin(pin: string): Promise<string | null> {
    const hash = await hashPin(pin);
    return getState().employees.find((x) => x.role === "Pemilik" && x.active && !x.onLeave && x.pinHash === hash)?.nickname ?? null;
  },

  saveSupplier(sp: { id: string; name: string; phone: string }) {
    requireLocalRole(SUP);
    need(sp.name.trim(), "Nama supplier wajib diisi");
    setState((s) => {
      const exists = s.suppliers.some((x) => x.id === sp.id);
      return { suppliers: exists ? s.suppliers.map((x) => (x.id === sp.id ? sp : x)) : [...s.suppliers, sp], audit: logAudit(s, currentEmployee(s), exists ? "Ubah supplier" : "Tambah supplier", sp.name) };
    });
  },

  saveCustomer(c: Customer) {
    requireLocalRole(SUP);
    need(c.name.trim(), "Nama pelanggan wajib diisi");
    need(Number.isFinite(c.limit) && c.limit >= 0, "Limit tidak valid");
    need(!c.payday || (c.payday >= 1 && c.payday <= 31), "Tanggal gajian 1–31");
    setState((s) => {
      const exists = s.customers.some((x) => x.id === c.id);
      return { customers: exists ? s.customers.map((x) => (x.id === c.id ? c : x)) : [...s.customers, c], audit: logAudit(s, currentEmployee(s), exists ? "Ubah pelanggan" : "Tambah pelanggan", `${c.name} · limit ${c.limit}`) };
    });
  },

  /** Kulakan satu nota banyak barang: no. faktur, pembayaran laci/bank/tempo, bayar sebagian, HPP rata-rata bergerak. */
  receiveInvoice(inv: { invoiceNo: string; supplierId?: string; lines: InvoiceLine[]; payment: InvoicePayment; dueDays?: number; paidNow?: number }) {
    requireLocalRole(SUP);
    need(inv.lines.length, "Nota kosong");
    setState((s) => {
      let products = s.products;
      let moves = s.stockMoves;
      let total = 0;
      const emp = currentEmployee(s);
      const now = Date.now();
      for (const l of inv.lines) {
        const pr = products.find((x) => x.id === l.productId);
        need(pr && !pr.digital && !pr.bundle, "Barang tidak dapat dikulak");
        const u = pr.units.find((x) => x.name === l.unitName);
        need(u, "Satuan tidak ditemukan");
        POSITIVE(l.qty, "Jumlah"); need(Number.isFinite(l.unitCost) && l.unitCost >= 0, "Harga beli tidak valid");
        const qtyBase = l.qty * u.factor;
        const cost = l.qty * l.unitCost;
        total += cost;
        products = products.map((x) => (x.id === pr.id ? { ...x, hpp: movingAverage(Math.max(0, x.stock), x.hpp, qtyBase, cost / qtyBase), stock: x.stock + qtyBase } : x));
        moves = [...moves, ...moveRows(s.products, pr.id, qtyBase, `Kulakan · ${inv.invoiceNo || "tanpa faktur"}`, emp?.id, now)];
      }
      const paidNow = inv.payment === "tempo" ? Math.min(total, Math.max(0, inv.paidNow ?? 0)) : total;
      const rest = total - paidNow;
      need(!(inv.payment === "tempo" && rest > 0 && !inv.supplierId), "Pilih supplier untuk hutang tempo");
      const patch: Partial<typeof s> = { products, stockMoves: moves, audit: logAudit(s, emp, "Kulakan", `${inv.invoiceNo || "tanpa faktur"} · ${inv.lines.length} barang · ${Math.round(total)}`) };
      const cashPart = inv.payment === "bank" ? 0 : paidNow;
      if (cashPart > 0) { need(activeShift(s), "Buka shift dahulu untuk membayar dari laci"); patch.cash = addCash(s, -cashPart, "kulakan", `Faktur ${inv.invoiceNo || "-"}`); }
      if (rest > 0) patch.payables = [...s.payables, { id: uid(), supplierId: inv.supplierId as string, ts: now, due: now + (inv.dueDays ?? 7) * DAY, amount: rest, paid: 0, note: `Faktur ${inv.invoiceNo || "-"}` }];
      return patch;
    });
  },

  /** Retur kulakan ke supplier: stok berkurang, hutang dipotong atau uang dikembalikan ke laci. */
  returnPurchase(productId: string, qtyBase: number, unitCostBase: number, mode: "potong_hutang" | "uang_kembali", payableId: string | undefined, note: string) {
    requireLocalRole(SUP);
    POSITIVE(qtyBase, "Jumlah"); need(Number.isFinite(unitCostBase) && unitCostBase >= 0, "Harga tidak valid");
    setState((s) => {
      const pr = s.products.find((x) => x.id === productId);
      need(pr && !pr.digital && !pr.bundle, "Barang tidak dapat diretur");
      const value = qtyBase * unitCostBase;
      const emp = currentEmployee(s);
      const patch: Partial<typeof s> = {
        products: s.products.map((x) => (x.id === productId ? { ...x, stock: x.stock - qtyBase } : x)),
        stockMoves: [...s.stockMoves, ...moveRows(s.products, productId, -qtyBase, `Retur ke supplier${note ? ` · ${note}` : ""}`, emp?.id)],
        audit: logAudit(s, emp, "Retur pembelian", `${pr.name} ${qtyBase} ${pr.baseUnit} senilai ${Math.round(value)} (${mode})`),
      };
      if (mode === "potong_hutang") {
        const pay = s.payables.find((x) => x.id === payableId);
        need(pay, "Pilih hutang yang dipotong");
        patch.payables = s.payables.map((x) => (x.id === payableId ? { ...x, amount: Math.max(x.paid, x.amount - value) } : x));
      } else {
        need(activeShift(s), "Buka shift dahulu untuk mencatat uang kembali");
        patch.cash = addCash(s, value, "retur supplier", `Retur ${pr.name}`);
      }
      return patch;
    });
  },

  /** Repacking curah (mis. karung 50 kg jadi kantong 1 kg). HPP kemasan = (bahan terpakai + plastik) / hasil bungkus; selisih = susut. */
  repack(a: { sourceId: string; targetId: string; sourceQty: number; produced: number; contentPerPack: number; packagingCostPerPack: number }) {
    requireLocalRole(SUP);
    POSITIVE(a.sourceQty, "Jumlah curah"); POSITIVE(a.produced, "Hasil bungkus"); POSITIVE(a.contentPerPack, "Isi per kemasan");
    need(Number.isFinite(a.packagingCostPerPack) && a.packagingCostPerPack >= 0, "Biaya kemasan tidak valid");
    need(a.sourceId !== a.targetId, "Barang asal dan hasil harus berbeda");
    setState((s) => {
      const src = s.products.find((x) => x.id === a.sourceId);
      const dst = s.products.find((x) => x.id === a.targetId);
      need(src && dst && !src.digital && !dst.digital && !src.bundle && !dst.bundle, "Barang tidak valid");
      const used = a.produced * a.contentPerPack;
      need(used <= a.sourceQty + 1e-9, "Isi bungkus melebihi curah yang dipakai");
      const susut = a.sourceQty - used;
      const hppPack = (a.sourceQty * src.hpp + a.packagingCostPerPack * a.produced) / a.produced;
      const emp = currentEmployee(s);
      const now = Date.now();
      return {
        products: s.products.map((x) => (x.id === src.id ? { ...x, stock: x.stock - a.sourceQty } : x.id === dst.id ? { ...x, hpp: movingAverage(Math.max(0, x.stock), x.hpp, a.produced, hppPack), stock: x.stock + a.produced } : x)),
        stockMoves: [...s.stockMoves, ...moveRows(s.products, src.id, -a.sourceQty, "Repacking keluar", emp?.id, now), ...moveRows(s.products, dst.id, a.produced, "Repacking masuk", emp?.id, now)],
        audit: logAudit(s, emp, "Repacking", `${src.name} ${a.sourceQty} → ${dst.name} ${a.produced}; susut ${Math.round(susut * 1000) / 1000} ${src.baseUnit}; HPP kemasan ${Math.round(hppPack)}`),
      };
    });
  },

  /** Titipan masuk: barang masuk stok dan bisa dijual di kasir; HPP = harga setor penitip. */
  receiveConsign(c: { owner: string; phone: string; productId?: string; item: string; received: number; ownerPrice: number; sellPrice: number }) {
    requireLocalRole(SUP);
    POSITIVE(c.received, "Jumlah titipan"); need(c.sellPrice >= c.ownerPrice && c.ownerPrice >= 0, "Harga jual tidak boleh di bawah harga setor");
    need(c.owner.trim() && (c.productId || c.item.trim()), "Isi nama penitip dan barang");
    setState((s) => {
      const emp = currentEmployee(s);
      const now = Date.now();
      let products = s.products;
      let pid = c.productId;
      if (pid) {
        const ex = products.find((x) => x.id === pid);
        need(ex?.consignment, "Barang itu bukan barang titipan");
        products = products.map((x) => (x.id === pid ? { ...x, hpp: c.ownerPrice, units: x.units.map((u, i) => (i === 0 ? { ...u, price: c.sellPrice } : u)) } : x));
      } else {
        pid = uid();
        products = [...products, { id: pid, name: c.item.trim(), emoji: "🥐", category: "Jajan", baseUnit: "pcs", stock: 0, hpp: c.ownerPrice, units: [{ name: "pcs", factor: 1, price: c.sellPrice }], minStock: 0, consignment: true, createdAt: now } satisfies Product];
      }
      const name = products.find((x) => x.id === pid)?.name ?? c.item;
      products = products.map((x) => (x.id === pid ? { ...x, stock: x.stock + c.received } : x));
      return {
        products,
        stockMoves: [...s.stockMoves, ...moveRows(products, pid, c.received, `Titipan masuk · ${c.owner}`, emp?.id, now)],
        consigns: [...s.consigns, { id: uid(), owner: c.owner, phone: c.phone, item: name, date: now, received: c.received, returned: null, sellPrice: c.sellPrice, ownerPrice: c.ownerPrice, sold: 0, settled: false, productId: pid }],
        audit: logAudit(s, emp, "Titipan masuk", `${name} ${c.received} dari ${c.owner}`),
      };
    });
  },

  /** Penyelesaian titipan: terjual = masuk − sisa − basi; bayar penitip = terjual × harga setor. Basi dikembalikan ke penitip. */
  settleConsignment(id: string, sisa: number, basi: number) {
    requireLocalRole(SUP);
    need(Number.isFinite(sisa) && sisa >= 0 && Number.isFinite(basi) && basi >= 0, "Jumlah tidak valid");
    setState((s) => {
      const c = s.consigns.find((x) => x.id === id);
      need(c && c.productId && !c.settled, "Titipan tidak ditemukan atau sudah diselesaikan");
      need(sisa + basi <= c.received, "Sisa + basi melebihi barang yang dititipkan");
      const sold = c.received - sisa - basi;
      const setor = sold * c.ownerPrice;
      const pr = s.products.find((x) => x.id === c.productId);
      need(pr, "Barang titipan tidak ada");
      need(setor === 0 || activeShift(s), "Buka shift dahulu untuk membayar penitip");
      const emp = currentEmployee(s);
      const delta = sisa - pr.stock;
      return {
        consigns: s.consigns.map((x) => (x.id === id ? { ...x, returned: basi, sisa, basi, sold, settled: true } : x)),
        products: s.products.map((x) => (x.id === pr.id ? { ...x, stock: sisa } : x)),
        stockMoves: delta === 0 ? s.stockMoves : [...s.stockMoves, ...moveRows(s.products, pr.id, delta, `Penyelesaian titipan · ${c.owner}`, emp?.id)],
        cash: setor > 0 ? addCash(s, -setor, "setor titipan", `Setor ${c.owner}`) : s.cash,
        audit: logAudit(s, emp, "Penyelesaian titipan", `${c.item}: terjual ${sold}, sisa ${sisa}, basi ${basi}, setor ${Math.round(setor)}`),
      };
    });
  },

  topUpDeposit(amount: number, via: "tunai" | "bank") {
    requireLocalRole(["Pemilik"]);
    POSITIVE(amount, "Nominal");
    setState((s) => {
      need(via !== "tunai" || activeShift(s), "Buka shift dahulu untuk isi deposit dari laci");
      return { deposit: s.deposit + amount, depositMoves: [...s.depositMoves, { id: uid(), ts: Date.now(), amount, note: `Isi deposit via ${via}` }], cash: via === "tunai" ? addCash(s, -amount, "deposit", "Isi deposit PPOB") : s.cash, audit: logAudit(s, currentEmployee(s), "Isi deposit PPOB", `${Math.round(amount)} via ${via}`) };
    });
  },

  /** Catat layanan PPOB/transfer tunai. Uang pelanggan (nominal + admin) masuk laci, saldo deposit berkurang sebesar modal. */
  recordPpob(t: Omit<PpobTx, "id" | "ts" | "cashierId" | "shiftId">): PpobTx {
    const out: { tx?: PpobTx } = {};
    setState((s) => {
      const sh = activeShift(s);
      const emp = currentEmployee(s);
      need(sh && emp && sh.participants?.includes(emp.id), "Gabung ke shift terlebih dahulu");
      need(t.status !== "gagal", "Transaksi gagal tidak dicatat");
      POSITIVE(t.nominal, "Nominal"); need(t.fee >= 0 && t.cost >= 0 && t.price >= 0, "Biaya tidak valid");
      need(/^[\w\-\s+]{3,40}$/.test(t.target), "Nomor tujuan tidak valid");
      const deductDeposit = t.status !== "manual";
      need(!deductDeposit || s.deposit >= t.cost, "Saldo deposit tidak cukup");
      const tx: PpobTx = { ...t, id: uid(), ts: Date.now(), cashierId: emp.id, shiftId: sh.id };
      out.tx = tx;
      return { ppob: [...s.ppob, tx], deposit: deductDeposit ? s.deposit - t.cost : s.deposit, depositMoves: deductDeposit ? [...s.depositMoves, { id: uid(), ts: tx.ts, amount: -t.cost, note: `${t.kind} ${t.target}` }] : s.depositMoves, cash: addCash(s, t.price, "ppob", `${t.kind} ${t.target}`) };
    });
    need(out.tx, "Transaksi gagal disimpan");
    return out.tx;
  },

  /** Tindak lanjut transaksi PPOB tertunda: sukses (isi SN) atau gagal (uang pelanggan dan deposit dikembalikan). */
  settlePpob(id: string, status: "sukses" | "gagal", sn?: string) {
    requireLocalRole(SUP);
    setState((s) => {
      const tx = s.ppob.find((x) => x.id === id);
      need(tx && tx.status === "pending", "Transaksi tidak ditemukan atau bukan tertunda");
      if (status === "sukses") return { ppob: s.ppob.map((x) => (x.id === id ? { ...x, status, sn } : x)) };
      need(activeShift(s), "Buka shift dahulu untuk mengembalikan uang pelanggan");
      return { ppob: s.ppob.map((x) => (x.id === id ? { ...x, status: "gagal" as const } : x)), deposit: s.deposit + tx.cost, depositMoves: [...s.depositMoves, { id: uid(), ts: Date.now(), amount: tx.cost, note: `Gagal ${tx.kind} ${tx.target}` }], cash: addCash(s, -tx.price, "ppob batal", `Gagal ${tx.kind} ${tx.target}`), audit: logAudit(s, currentEmployee(s), "PPOB gagal", `${tx.kind} ${tx.target} dikembalikan`) };
    });
  },

  /** Surat jalan digital: stok toko pengirim berkurang, dokumen berstatus dikirim. */
  createTransfer(t: { fromStore: string; toStore: string; fromName: string; toName: string; note: string; lines: { productId: string; qtyBase: number }[] }): Transfer {
    requireLocalRole(SUP);
    need(t.lines.length && t.fromStore !== t.toStore, "Pilih cabang tujuan dan barang");
    const out: { tr?: Transfer } = {};
    setState((s) => {
      const emp = currentEmployee(s);
      const now = Date.now();
      const trId = uid();
      let moves = s.stockMoves;
      const items: TransferItem[] = t.lines.map((l) => {
        const pr = s.products.find((x) => x.id === l.productId);
        need(pr && !pr.digital && !pr.bundle, "Barang tidak dapat ditransfer");
        POSITIVE(l.qtyBase, "Jumlah"); need(pr.stock >= l.qtyBase, `Stok ${pr.name} tidak cukup`);
        moves = [...moves, ...moveRows(s.products, pr.id, -l.qtyBase, `Transfer keluar · ${t.toName}`, emp?.id, now, `send-${trId}-${pr.id}`)];
        return { productId: pr.id, barcode: pr.barcode, name: pr.name, unit: pr.baseUnit, qtyBase: l.qtyBase, hpp: pr.hpp, price: pr.units[0]?.price };
      });
      const tr: Transfer = { id: trId, ts: now, fromStore: t.fromStore, toStore: t.toStore, fromName: t.fromName, toName: t.toName, status: "dikirim", items, note: t.note };
      out.tr = tr;
      return {
        transfers: [...s.transfers, tr],
        products: s.products.map((x) => { const l = t.lines.find((q) => q.productId === x.id); return l ? { ...x, stock: x.stock - l.qtyBase } : x; }),
        stockMoves: moves,
        audit: logAudit(s, emp, "Transfer keluar", `${items.length} barang ke ${t.toName}`),
      };
    });
    need(out.tr, "Transfer gagal");
    return out.tr;
  },

  /** Cabang tujuan menerima surat jalan: barang dicocokkan lewat barcode atau nama, dibuat bila belum ada. */
  receiveTransfer(transferId: string) {
    requireLocalRole(SUP);
    setState((s) => {
      const tr = s.transfers.find((x) => x.id === transferId);
      need(tr && tr.status === "dikirim", "Surat jalan tidak ditemukan atau sudah diproses");
      const emp = currentEmployee(s);
      const now = Date.now();
      let products = s.products;
      let moves = s.stockMoves;
      for (const it of tr.items) {
        let pr = products.find((x) => (it.barcode && x.barcode === it.barcode) || x.name.toLowerCase() === it.name.toLowerCase());
        if (!pr) {
          pr = { id: uid(), name: it.name, emoji: "📦", category: "Sembako", baseUnit: it.unit, stock: 0, hpp: it.hpp ?? 0, units: [{ name: it.unit, factor: 1, price: it.price ?? 0 }], minStock: 0, barcode: it.barcode, createdAt: now };
          products = [...products, pr];
        }
        const id = pr.id;
        products = products.map((x) => (x.id === id ? { ...x, hpp: movingAverage(Math.max(0, x.stock), x.hpp, it.qtyBase, it.hpp ?? x.hpp), stock: x.stock + it.qtyBase } : x));
        moves = [...moves, ...moveRows(products, id, it.qtyBase, `Transfer masuk · ${tr.fromName}`, emp?.id, now, `recv-${tr.id}-${id}`)];
      }
      return { products, stockMoves: moves, transfers: s.transfers.map((x) => (x.id === transferId ? { ...x, status: "diterima" as const, receivedAt: now } : x)), audit: logAudit(s, emp, "Transfer masuk", `${tr.items.length} barang dari ${tr.fromName}`) };
    });
  },

  cancelTransfer(transferId: string) {
    requireLocalRole(SUP);
    setState((s) => {
      const tr = s.transfers.find((x) => x.id === transferId);
      need(tr && tr.status === "dikirim", "Surat jalan tidak ditemukan atau sudah diproses");
      const emp = currentEmployee(s);
      const now = Date.now();
      let moves = s.stockMoves;
      for (const it of tr.items) moves = [...moves, ...moveRows(s.products, it.productId, it.qtyBase, `Transfer dibatalkan · ${tr.toName}`, emp?.id, now, `cancel-${tr.id}-${it.productId}`)];
      return {
        products: s.products.map((x) => { const it = tr.items.find((q) => q.productId === x.id); return it ? { ...x, stock: x.stock + it.qtyBase } : x; }),
        stockMoves: moves,
        transfers: s.transfers.map((x) => (x.id === transferId ? { ...x, status: "dibatalkan" as const } : x)),
        audit: logAudit(s, emp, "Transfer dibatalkan", tr.id),
      };
    });
  },

  swapDenominations(note: string) {
    setState((s) => ({ audit: logAudit(s, currentEmployee(s), "Tukar pecahan uang", note || "tanpa catatan") }));
  },

  setRounding(step: 100 | 500 | 1000) {
    requireLocalRole(["Pemilik"]);
    setState((s) => ({ roundingStep: step, audit: logAudit(s, currentEmployee(s), "Ubah pembulatan", `kelipatan ${step}`) }));
  },
  setPaperWidth(width: 58 | 80) {
    requireLocalRole(["Pemilik"]);
    setState(() => ({ paperWidth: width }));
  },
};
