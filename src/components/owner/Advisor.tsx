import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { advisorTips, askCloudAdvisor } from "@/lib/advisor";
import { cloudConfig, getSession } from "@/lib/cloud";
import { Button } from "@/components/ui/button";

/** Penasihat opsional dan baca-saja. Saran lokal tanpa internet; AI cloud hanya menerima ringkasan angka tanpa data pribadi. */
export function AIBusinessAdvisorCard() {
  const s = useStore((s) => s);
  const [tips, setTips] = useState<string[]>([]);
  const [source, setSource] = useState<"lokal" | "ai">("lokal");
  const [busy, setBusy] = useState(false);
  if (!s.advisorEnabled) return null;
  const canAi = !!cloudConfig() && !!getSession();
  return (
    <section className="border-y py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><Sparkles className="size-5 text-primary" />Penasihat Warung Pintar</h2>
          <p className="text-xs text-muted-foreground">Fitur opsional · baca-saja · {source === "ai" ? "Saran AI cloud (ringkasan angka tanpa data pribadi)" : "Saran lokal tanpa internet"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setTips(advisorTips(s)); setSource("lokal"); }}>Saran Lokal</Button>
          {canAi && <Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { setTips(await askCloudAdvisor(s)); setSource("ai"); } catch (e) { toast.error(e instanceof Error ? e.message : "AI tidak tersedia"); } finally { setBusy(false); } }}>{busy ? "Menganalisis…" : "Tanya AI"}</Button>}
        </div>
      </div>
      {!!tips.length && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{tips.map((t) => <li key={t}>{t}</li>)}</ul>}
    </section>
  );
}
