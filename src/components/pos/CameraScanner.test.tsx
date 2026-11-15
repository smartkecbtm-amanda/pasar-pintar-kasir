import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CameraScanner } from "./CameraScanner";
describe("Pemindai kamera", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it("meneruskan barcode kamera dan menghentikan kamera saat ditutup", async () => {
    const stop = vi.fn(); const onScan = vi.fn();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop }] }) } });
    class Detector { static async getSupportedFormats() { return ["ean_13"]; } async detect() { return [{ rawValue: "8991002" }]; } }
    vi.stubGlobal("BarcodeDetector", Detector);
    const view = render(<CameraScanner open onScan={onScan} onClose={() => {}} />);
    await waitFor(() => expect(onScan).toHaveBeenCalledWith("8991002"));
    view.rerender(<CameraScanner open={false} onScan={onScan} onClose={() => {}} />);
    expect(stop).toHaveBeenCalledOnce(); expect(onScan).toHaveBeenCalledOnce();
  });
  it("kamera yang izinnya ditolak tidak menghasilkan barcode palsu", async () => {
    const onScan = vi.fn();
    class Detector { static async getSupportedFormats() { return ["ean_13"]; } async detect() { return [{ rawValue: "8991002" }]; } }
    vi.stubGlobal("BarcodeDetector", Detector);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockRejectedValue(new Error("Izin kamera ditolak")) } });
    render(<CameraScanner open onScan={onScan} onClose={() => {}} />);
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledOnce());
    expect(onScan).not.toHaveBeenCalled();
  });
});