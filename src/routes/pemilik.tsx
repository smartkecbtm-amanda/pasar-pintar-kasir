import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, LogOut } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppBar } from "@/components/pos/AppBar";
import { PinPad } from "@/components/pos/PinDialog";
import { Dashboard } from "@/components/owner/Dashboard";
import { ShiftTab } from "@/components/owner/Shift";
import { Products } from "@/components/owner/Products";
import { Restock } from "@/components/owner/Restock";
import { Consign } from "@/components/owner/Consign";
import { Kasbon } from "@/components/owner/Kasbon";
import { PriveTab } from "@/components/owner/Prive";
import { resetData } from "@/lib/store";

export const Route = createFileRoute("/pemilik")({
  head: () => ({
    meta: [
      { title: "Mode Pemilik — POS Warung Kelontong" },
      { name: "description", content: "Laporan laba, stok, kulakan, kasbon tetangga, titipan, dan prive warung." },
      { property: "og:title", content: "Mode Pemilik — POS Warung Kelontong" },
      { property: "og:description", content: "Laporan laba, stok, kulakan, kasbon tetangga, titipan, dan prive warung." },
    ],
  }),
  component: Owner,
});

const TABS = [
  ["dash", "📊 Dashboard", Dashboard], ["shift", "🗄️ Shift & Laci", ShiftTab], ["produk", "📦 Produk", Products],
  ["kulakan", "🛒 Kulakan", Restock], ["titip", "🧺 Titipan", Consign], ["kasbon", "📒 Kasbon", Kasbon], ["prive", "🏠 Prive & Kas", PriveTab],
] as const;

function Owner() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => setOk(sessionStorage.getItem("owner") === "1"), []);
  if (ok === null) return null;
  if (!ok) return (
    <div className="min-h-dvh bg-background">
      <AppBar />
      <div className="py-10"><h1 className="mb-6 text-center text-2xl font-bold">Masukkan PIN Pemilik</h1><PinPad onOk={() => setOk(true)} /></div>
    </div>
  );
  return (
    <div className="min-h-dvh bg-background">
      <AppBar>
        <Link to="/" className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold"><ArrowLeft className="size-4" /> Kasir</Link>
        <button onClick={() => { sessionStorage.removeItem("owner"); setOk(false); }} className="rounded-full bg-secondary p-2" title="Kunci"><LogOut className="size-4" /></button>
      </AppBar>
      <Tabs defaultValue="dash" className="mx-auto max-w-7xl p-3 md:p-4">
        <TabsList className="mb-3 flex h-auto w-full justify-start overflow-x-auto">
          {TABS.map(([v, l]) => <TabsTrigger key={v} value={v} className="shrink-0 py-2">{l}</TabsTrigger>)}
        </TabsList>
        {TABS.map(([v, , C]) => <TabsContent key={v} value={v}><C /></TabsContent>)}
        <div className="mt-8 text-center">
          <button onClick={() => { if (confirm("Kembalikan semua data ke contoh awal?")) resetData(); }} className="text-xs text-muted-foreground underline">Reset data contoh</button>
        </div>
      </Tabs>
    </div>
  );
}
