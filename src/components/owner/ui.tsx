import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
export function Card({ title, children, className, action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-sm", className)}>
      {title && <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-lg font-bold">{title}</h3>{action}</div>}
      {children}
    </div>
  );
}
export function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" | "warn" }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn("num-jumbo mt-1 text-2xl md:text-[28px]", tone === "good" && "text-success", tone === "bad" && "text-destructive", tone === "warn" && "text-warning-foreground")}>{value}</div>
    </div>
  );
}
export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block space-y-1 text-sm font-semibold"><span>{label}</span>{children}</label>
);
export const selectCls = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";
