"use client";
import { cn } from "@/lib/utils";
type Props<T extends number | string> = { options: { label: string; value: T }[]; onPick: (value: T) => void; tone?: "success" | "neutral"; disabled?: boolean; className?: string };
export function QuickChips<T extends number | string>({ options, onPick, tone = "neutral", disabled, className }: Props<T>) {
  return <div className={cn("flex snap-x gap-2 overflow-x-auto pb-1", className)}>{options.map((option) => <button key={`${option.value}-${option.label}`} type="button" disabled={disabled} onClick={() => onPick(option.value)} className={cn("min-h-11 shrink-0 snap-start rounded-xl border px-4 text-sm font-semibold transition disabled:opacity-50", tone === "success" ? "border-success-500/30 bg-success-500/15 text-emerald-200 hover:bg-success-500/25" : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10")}>{option.label}</button>)}</div>;
}
