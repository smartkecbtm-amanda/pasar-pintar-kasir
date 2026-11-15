import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Detector = { detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorClass = { new (o: { formats: string[] }): Detector; getSupportedFormats: () => Promise<string[]> };
export function CameraScanner({ open, onClose, onScan }: { open: boolean; onClose: () => void; onScan: (value: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const callback = useRef(onScan); callback.current = onScan;
  useEffect(() => {
    if (!open) return;
    let stopped = false; let stream: MediaStream | undefined; let timer: ReturnType<typeof setTimeout> | undefined;
    setError("");
    async function start() {
      try {
        const ctor = (window as Window & { BarcodeDetector?: DetectorClass }).BarcodeDetector;
        if (!ctor || !navigator.mediaDevices?.getUserMedia) throw new Error("Scan kamera tidak tersedia di browser ini. Gunakan kode barcode atau scanner fisik.");
        const formats = (await ctor.getSupportedFormats()).filter((f) => ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"].includes(f));
        if (!formats.length) throw new Error("Format barcode tidak didukung");
        const detector = new ctor({ formats });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (!video.current) throw new Error("Kamera belum siap");
        video.current.srcObject = stream; await video.current.play();
        async function detect() {
          if (stopped || !video.current) return;
          try { const codes = await detector.detect(video.current); if (codes[0]?.rawValue) { callback.current(codes[0].rawValue); return; } } catch { /* retry next frame */ }
          timer = setTimeout(detect, 250);
        }
        void detect();
      } catch (e) { stream?.getTracks().forEach((t) => t.stop()); if (!stopped) setError(e instanceof Error ? e.message : "Kamera tidak bisa dibuka"); }
    }
    void start();
    return () => { stopped = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [open]);
  return <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}><DialogContent><DialogHeader><DialogTitle>Scan Barcode Kamera</DialogTitle></DialogHeader><video ref={video} muted playsInline className="aspect-[4/3] w-full rounded-md bg-muted object-cover" />{error && <p role="alert" className="text-destructive">{error}</p>}<form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) onScan(manual.trim()); }}><Input aria-label="Kode barcode manual" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Kode barcode" /><Button type="submit">Cari</Button></form></DialogContent></Dialog>;
}