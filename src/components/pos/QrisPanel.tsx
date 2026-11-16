import { useEffect, useRef, useState } from "react";
import { cloudConfig, createQris, getSession, qrisStatusOf, type QrisIntent } from "@/lib/cloud";
import { rp } from "@/lib/format";

/**
 * QRIS dinamis per transaksi lewat Edge Function (mock/Midtrans di server) bila cloud aktif.
 * Tanpa cloud, kasir memakai QRIS statis toko dan menekan "Sudah diterima" setelah melihat notifikasi.
 */
export function QrisPanel({ amount, onPaid, onManual }: { amount: number; onPaid: (ref: string) => void; onManual: () => void }) {
  const cloud = !!cloudConfig() && !!getSession();
  const [intent, setIntent] = useState<QrisIntent | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "pending" | "paid" | "expired" | "failed" | "error">("idle");
  const [err, setErr] = useState("");
  const done = useRef(false);
  const cb = useRef(onPaid);
  cb.current = onPaid;

  const create = async () => {
    setStatus("loading"); setErr("");
    try { setIntent(await createQris(amount)); setStatus("pending"); }
    catch (e) { setErr(e instanceof Error ? e.message : "Gagal membuat QRIS"); setStatus("error"); }
  };
  useEffect(() => {
    if (!intent || status !== "pending") return;
    const t = setInterval(() => { qrisStatusOf(intent.intentId).then((s) => { if (s !== "pending") setStatus(s); }).catch(() => undefined); }, 2500);
    return () => clearInterval(t);
  }, [intent, status]);
  useEffect(() => {
    if (status === "paid" && intent && !done.current) { done.current = true; cb.current(intent.orderId); }
  }, [status, intent]);

  if (!cloud) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-lg">Minta pembeli scan QRIS toko, lalu cek notifikasi pembayaran masuk sebesar <b>{rp(amount)}</b>.</p>
        <button onClick={onManual} className="w-full rounded-xl bg-primary py-5 text-2xl font-extrabold text-primary-foreground">SUDAH DITERIMA</button>
      </div>
    );
  }
  return (
    <div className="space-y-3 text-center">
      {status === "idle" && <button onClick={create} className="w-full rounded-xl bg-primary py-5 text-2xl font-extrabold text-primary-foreground">Buat QRIS {rp(amount)}</button>}
      {status === "loading" && <p className="text-lg">Membuat QRIS…</p>}
      {(status === "pending" || status === "paid") && intent && (
        <>
          {intent.qrUrl ? <img src={intent.qrUrl} alt="QRIS pembayaran" className="mx-auto size-56 rounded-xl border bg-white p-2" /> : <code className="mx-auto block max-w-full break-all rounded-xl border bg-muted p-3 text-xs">{intent.qrString}</code>}
          <p className="text-muted-foreground">{intent.provider === "mock" ? "Mode simulasi: pembayaran otomatis dianggap masuk beberapa detik lagi." : "Menunggu pembayaran… halaman ini otomatis lanjut setelah lunas."}</p>
        </>
      )}
      {(status === "expired" || status === "failed") && <div className="space-y-2"><p className="font-semibold text-destructive">{status === "expired" ? "QRIS kedaluwarsa" : "Pembayaran gagal"}</p><button onClick={() => { setIntent(null); done.current = false; void create(); }} className="w-full rounded-xl bg-secondary py-4 text-lg font-bold">Buat QRIS baru</button></div>}
      {status === "error" && <div className="space-y-2"><p className="text-destructive">{err}</p><button onClick={create} className="w-full rounded-xl bg-secondary py-4 text-lg font-bold">Coba lagi</button><button onClick={onManual} className="w-full rounded-xl border py-3 font-semibold">Konfirmasi manual (setelah cek notifikasi)</button></div>}
    </div>
  );
}
