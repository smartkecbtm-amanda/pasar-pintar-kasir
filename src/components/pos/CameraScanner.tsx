/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Pemindai barcode lewat kamera (BarcodeDetector: Chrome/Edge Android dan desktop). Cadangan bila scanner USB tidak ada. */
export function CameraScanner({ open, onOpenChange, onCode }: { open: boolean; onOpenChange: (o: boolean) => void; onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const cb = useRef(onCode);
  cb.current = onCode;
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const BD = (window as any).BarcodeDetector;
    if (!BD) { setError("Browser ini belum mendukung pemindai kamera. Pakai Chrome di Android atau scanner USB."); return; }
    setError("");
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const v = video.current;
        if (!v || stopped) return;
        v.srcObject = stream;
        await v.play();
        const detector = new BD({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"] });
        const tick = async () => {
          if (stopped) return;
          try {
            const found = await detector.detect(v);
            if (found.length) { cb.current(String(found[0].rawValue)); onOpenChange(false); return; }
          } catch { /* frame belum siap */ }
          timer = setTimeout(tick, 250);
        };
        void tick();
      } catch { setError("Kamera tidak bisa dibuka. Izinkan akses kamera di pengaturan browser."); }
    })();
    return () => { stopped = true; if (timer) clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-2xl">Scan Barcode Kamera</DialogTitle></DialogHeader>
        {error ? <p className="text-destructive">{error}</p> : <video ref={video} muted playsInline className="w-full rounded-xl bg-black" />}
        <p className="text-sm text-muted-foreground">Arahkan barcode ke tengah kamera.</p>
      </DialogContent>
    </Dialog>
  );
}
