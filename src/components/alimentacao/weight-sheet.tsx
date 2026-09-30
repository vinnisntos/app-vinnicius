"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
export function WeightSheet({ open, initialWeight = 70, pending, onClose, onSave }: { open: boolean; initialWeight?: number; pending?: boolean; onClose: () => void; onSave: (weight: number) => void }) {
  if (!open) return null;
  return <WeightSheetContent initialWeight={initialWeight} pending={pending} onClose={onClose} onSave={onSave} />;
}
function WeightSheetContent({ initialWeight, pending, onClose, onSave }: { initialWeight: number; pending?: boolean; onClose: () => void; onSave: (weight: number) => void }) {
  const [weight, setWeight] = useState(initialWeight);
  return <Sheet open onOpenChange={(next) => { if (!next) onClose(); }}><SheetContent side="bottom" className="rounded-t-3xl border-glass-border bg-surface-solid p-5 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2"><SheetHeader className="px-0"><SheetTitle>Registrar peso</SheetTitle><SheetDescription>Partimos da sua última pesagem.</SheetDescription></SheetHeader><Stepper value={weight} onChange={setWeight} step={0.1} min={25} max={400} unit="kg" format={(value) => value.toFixed(1)} label="Peso" /><SheetFooter className="px-0 pb-0"><Button data-primary-action="save-weight" className="h-12 w-full bg-success-500 font-bold text-on-bright hover:bg-success-500/85" disabled={pending} onClick={() => onSave(weight)}>{pending ? "Salvando…" : "Salvar peso"}</Button></SheetFooter></SheetContent></Sheet>;
}
