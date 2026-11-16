import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Wifi, WifiOff, Store } from "lucide-react";
import { actions, useStore, useSaveFailed, activeShift } from "@/lib/store";
import { useCloudStatus } from "@/lib/cloud";
import { cn } from "@/lib/utils";

export function AppBar({ children }: { children?: ReactNode }) {
  const shopName = useStore((s) => s.shopName);
  const mock = useStore((s) => s.mockOffline);
  const pending = useStore((s) => s.pendingSync);
  const shift = useStore(activeShift);
  const failed = useSaveFailed();
  const cloud = useCloudStatus();
  const [net, setNet] = useState(true);
  useEffect(() => {
    const u = () => setNet(navigator.onLine);
    u(); window.addEventListener("online", u); window.addEventListener("offline", u);
    return () => { window.removeEventListener("online", u); window.removeEventListener("offline", u); };
  }, []);
  const online = net && !mock;
  return (
    <header className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2 md:px-4">
      <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-primary md:text-xl">
        <Store className="size-6" /> {shopName}
      </Link>
      <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", shift ? "bg-success/15 text-success" : "bg-warning/25 text-warning-foreground")}>
        {shift ? `Laci buka · ${shift.cashier}` : "Laci belum dibuka"}
      </span>
      {cloud.enabled && <span className={`rounded-full px-3 py-1 text-sm font-bold ${cloud.online ? "bg-success/15 text-success" : "bg-warning/20"}`}>{cloud.online ? "☁ Tersinkron" : "☁ Offline"}{cloud.pending ? ` · ${cloud.pending} antre` : ""}</span>}
      {failed && <span role="alert" className="rounded-full bg-destructive px-3 py-1 text-sm font-bold text-destructive-foreground">Penyimpanan penuh: data terbaru belum tersimpan!</span>}
      <div className="ml-auto flex items-center gap-2">
        {children}
        <button onClick={() => actions.toggleOffline()} title="Simulasi putus internet"
          className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold", online ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
          {online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
          {online ? "Online" : `Offline${pending ? ` · ${pending} antre` : ""}`}
        </button>
      </div>
    </header>
  );
}
