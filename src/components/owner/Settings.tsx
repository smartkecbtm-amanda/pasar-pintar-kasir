import { useStore, setState } from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sun, Moon, Contrast } from "lucide-react";

export function Settings() {
  const s = useStore((s) => s);
  return <div className="space-y-6"><h2 className="text-xl font-bold">Pengaturan Toko</h2><div className="flex items-center justify-between gap-3 border-b pb-4"><Label htmlFor="advisor">Penasihat bisnis opsional</Label><Switch id="advisor" checked={s.advisorEnabled} onCheckedChange={(v) => setState(() => ({ advisorEnabled: v }))} /></div><div><Label>Tema layar</Label><ToggleGroup className="mt-3 justify-start" type="single" value={s.theme} onValueChange={(v) => { if (v === "light" || v === "dark" || v === "contrast") setState(() => ({ theme: v })); }}><ToggleGroupItem value="light"><Sun />Terang</ToggleGroupItem><ToggleGroupItem value="dark"><Moon />Gelap</ToggleGroupItem><ToggleGroupItem value="contrast"><Contrast />Kontras Tinggi</ToggleGroupItem></ToggleGroup></div></div>;
}