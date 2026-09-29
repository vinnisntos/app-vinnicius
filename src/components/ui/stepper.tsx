"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type StepperProps = { value: number; onChange: (value: number) => void; step: number; min: number; max: number; unit?: string; format?: (value: number) => string; label: string; className?: string };

export function Stepper({ value, onChange, step, min, max, unit, format, label, className }: StepperProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const repeatRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  useEffect(() => () => { if (repeatRef.current) clearTimeout(repeatRef.current); }, []);
  const clamp = (next: number) => Math.min(max, Math.max(min, Number(next.toFixed(4))));
  const move = (direction: -1 | 1) => { const next = clamp(valueRef.current + direction * step); valueRef.current = next; onChange(next); };
  const stop = () => { if (repeatRef.current) clearTimeout(repeatRef.current); repeatRef.current = null; };
  const start = (direction: -1 | 1) => {
    valueRef.current = value;
    move(direction);
    let delay = 430;
    const repeat = () => { move(direction); delay = Math.max(70, delay * 0.78); repeatRef.current = setTimeout(repeat, delay); };
    repeatRef.current = setTimeout(repeat, delay);
  };
  const commit = () => {
    const parsed = Number(draft.replace(",", "."));
    if (Number.isFinite(parsed)) onChange(clamp(parsed)); else setDraft(String(value));
    setEditing(false);
  };
  return <div className={cn("space-y-2", className)}>
    <span className="block text-sm font-medium text-zinc-200">{label}</span>
    <div className="grid grid-cols-[3rem_1fr_3rem] items-stretch overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <button type="button" className="flex size-12 items-center justify-center text-zinc-200 transition hover:bg-white/10 disabled:text-zinc-500" aria-label={`Diminuir ${label}`} disabled={value <= min} onPointerDown={() => start(-1)} onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop}><Minus className="size-5" aria-hidden /></button>
      <div role="spinbutton" aria-label={label} aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} tabIndex={editing ? -1 : 0} className="flex min-h-12 items-center justify-center border-x border-white/10 text-center font-semibold outline-none focus-visible:ring-2 focus-visible:ring-success-500" onClick={() => { setDraft(String(value)); setEditing(true); }} onKeyDown={(event) => { if (event.key === "ArrowUp") { valueRef.current = value; move(1); } if (event.key === "ArrowDown") { valueRef.current = value; move(-1); } if (event.key === "Enter" || event.key === " ") { setDraft(String(value)); setEditing(true); } }}>
        {editing ? <input autoFocus inputMode="decimal" aria-label={`${label}, digitação manual`} className="h-12 w-full bg-transparent px-2 text-center outline-none" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") commit(); if (event.key === "Escape") { setDraft(String(value)); setEditing(false); } }} /> : <span>{format ? format(value) : value}{unit ? ` ${unit}` : ""}</span>}
      </div>
      <button type="button" className="flex size-12 items-center justify-center text-zinc-200 transition hover:bg-white/10 disabled:text-zinc-500" aria-label={`Aumentar ${label}`} disabled={value >= max} onPointerDown={() => start(1)} onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop}><Plus className="size-5" aria-hidden /></button>
    </div>
  </div>;
}
