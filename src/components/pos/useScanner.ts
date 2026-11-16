import { useEffect, useRef } from "react";

/**
 * Menangkap scanner barcode USB (mode keyboard) tanpa kasir mengklik kolom cari:
 * karakter yang datang cepat (<50 ms) lalu Enter dianggap hasil scan.
 * Diabaikan bila fokus sedang di kolom input atau dialog terbuka (enabled=false).
 */
export function useScannerCapture(onScan: (code: string) => void, enabled: boolean) {
  const cb = useRef(onScan);
  cb.current = onScan;
  useEffect(() => {
    if (!enabled) return;
    let buf = "";
    let last = 0;
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const now = Date.now();
      if (now - last > 50) buf = "";
      last = now;
      if (e.key === "Enter") {
        if (buf.length >= 4) { e.preventDefault(); cb.current(buf); }
        buf = "";
        return;
      }
      if (e.key.length === 1) buf += e.key;
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [enabled]);
}
