export const rp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
export const num = (n: number) => (Math.round(n * 100) / 100).toLocaleString("id-ID");
export const tgl = (ts: number) => new Date(ts).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
export const jam = (ts: number) => new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
export const startOfDay = (ts = Date.now()) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

let ctx: AudioContext | null = null;
function tone(freq: number, start: number, dur: number, vol = 0.15) {
  if (typeof window === "undefined") return;
  ctx ??= new AudioContext();
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.frequency.value = freq; o.type = "sine";
  g.gain.setValueAtTime(vol, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + start); o.stop(ctx.currentTime + start + dur);
}
export const beep = () => tone(1400, 0, 0.09);
export const chime = () => { tone(784, 0, 0.25); tone(988, 0.12, 0.25); tone(1319, 0.24, 0.45); };
export const buzz = () => tone(180, 0, 0.3, 0.2);
