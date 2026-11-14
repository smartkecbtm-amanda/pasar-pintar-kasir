import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { businessAdvice } from "@/lib/operations";
import { Button } from "@/components/ui/button";

export function AIBusinessAdvisorCard() {
  const s = useStore((s) => s);
  const [tips, setTips] = useState<string[]>([]);
  if (!s.advisorEnabled) return null;
  return <section className="border-y py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold"><Sparkles className="size-5 text-primary" />Penasihat Warung Pintar</h2><p className="text-xs text-muted-foreground">Fitur Opsional · Saran lokal · Tanpa layanan AI terhubung</p></div><Button variant="outline" onClick={() => setTips(businessAdvice(s))}>Minta Analisa & Saran Bisnis</Button></div>{tips.length > 0 && <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>}</section>;
}