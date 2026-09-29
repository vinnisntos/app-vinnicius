"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input } from "@/components/ui/input";
import { QuickChips } from "@/components/ui/quick-chips";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import type { HelpTooltipMap, MealLogUpsert, MealSlot } from "@/types/database";

export const MEAL_LABELS: Record<MealSlot, string> = { cafe_da_manha: "Café", almoco: "Almoço", lanche: "Lanche", jantar: "Jantar", ceia: "Ceia" };
const SLOT_OPTIONS = (Object.entries(MEAL_LABELS) as [MealSlot, string][]).map(([value, label]) => ({ value, label }));
const CALORIE_CHIPS = [50, 100, 200, 300, 500].map((value) => ({ value, label: `+${value}` }));

export type MealEditing = { slot: MealSlot; values: MealLogUpsert };

export function MealEditor({ editing, onChange, onClose, onSave, help }: { editing?: MealEditing; onChange: (editing: MealEditing) => void; onClose: () => void; onSave: (payload: MealLogUpsert) => void; help?: Partial<HelpTooltipMap> }) {
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  if (!editing) return null;
  const update = (patch: Partial<MealLogUpsert>) => onChange({ ...editing, values: { ...editing.values, ...patch } });
  const changeSlot = (slot: MealSlot) => onChange({ slot, values: { ...editing.values, meal_slot: slot } });
  return <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
    <SheetContent side="bottom" className="max-h-[94dvh] overflow-y-auto rounded-t-3xl border-white/10 bg-zinc-950/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2">
      <SheetHeader className="px-0 pb-0"><SheetTitle>Registrar refeição</SheetTitle><SheetDescription>Use os atalhos; digitar é opcional.</SheetDescription></SheetHeader>
      <div className="space-y-4">
        <QuickChips options={SLOT_OPTIONS} onPick={changeSlot} tone="success" />
        <div><div className="mb-2 flex items-center gap-1"><span className="text-sm font-medium text-zinc-200">Calorias</span><HelpHint help={help?.["meal_logs.calories"]} className="size-8" /></div><Stepper value={editing.values.calories ?? 0} onChange={(calories) => update({ calories })} step={10} min={0} max={5000} unit="kcal" label="Calorias" /><QuickChips className="mt-2" options={CALORIE_CHIPS} onPick={(amount) => update({ calories: Math.min(5000, (editing.values.calories ?? 0) + amount) })} /></div>
        <button type="button" className="flex min-h-11 w-full items-center justify-between rounded-xl border border-white/10 px-3 text-sm font-semibold text-zinc-200" aria-expanded={macrosOpen} onClick={() => setMacrosOpen((open) => !open)}>Adicionar macros <ChevronDown className={`size-4 transition ${macrosOpen ? "rotate-180" : ""}`} aria-hidden /></button>
        {macrosOpen ? <div className="grid gap-3 sm:grid-cols-3"><Stepper value={editing.values.protein_g ?? 0} onChange={(protein_g) => update({ protein_g })} step={5} min={0} max={500} unit="g" label="Proteína" /><Stepper value={editing.values.carbs_g ?? 0} onChange={(carbs_g) => update({ carbs_g })} step={5} min={0} max={1000} unit="g" label="Carboidrato" /><Stepper value={editing.values.fat_g ?? 0} onChange={(fat_g) => update({ fat_g })} step={5} min={0} max={500} unit="g" label="Gordura" /></div> : null}
        <button type="button" className="flex min-h-11 w-full items-center justify-between rounded-xl border border-white/10 px-3 text-sm font-semibold text-zinc-200" aria-expanded={descriptionOpen} onClick={() => setDescriptionOpen((open) => !open)}>Adicionar descrição <ChevronDown className={`size-4 transition ${descriptionOpen ? "rotate-180" : ""}`} aria-hidden /></button>
        {descriptionOpen ? <Input aria-label="Descrição opcional" value={editing.values.description ?? ""} onChange={(event) => update({ description: event.target.value || null })} placeholder="Ex.: arroz, feijão e frango" className="h-12" /> : null}
      </div>
      <SheetFooter className="sticky bottom-0 -mx-4 bg-zinc-950/95 px-4 pb-0 pt-3"><Button type="button" data-primary-action="save-meal" className="h-12 w-full bg-success-500 font-bold text-zinc-950 hover:bg-success-500/85" onClick={() => onSave({ ...editing.values, is_completed: true })}>Salvar refeição</Button></SheetFooter>
    </SheetContent>
  </Sheet>;
}
