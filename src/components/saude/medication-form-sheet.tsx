"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { apiData } from "@/lib/api/client";
import { getTodayIsoDate } from "@/lib/date";
import { DOSE_UNITS, MEDICATION_CATEGORIES, MEDICATION_DISCLAIMER, MEDICATION_FREQUENCIES, MEDICATION_ROUTES, type DoseUnit, type HelpTooltipMap, type MedicationCategory, type MedicationFrequency, type MedicationRoute, type MedicationRow, type MedicationUpsert } from "@/types/database";

const CATEGORIES: Record<MedicationCategory, string> = { glp1: "GLP-1", peptideo: "Peptídeo", hormonal: "Hormonal", outro: "Outro" };
const ROUTES: Record<MedicationRoute, string> = { subcutanea: "Subcutânea", oral: "Oral", intramuscular: "Intramuscular", topica: "Tópica", outra: "Outra" };
const FREQUENCIES: Record<MedicationFrequency, string> = { diaria: "Diária", semanal: "Semanal", quinzenal: "Quinzenal", personalizada: "Personalizada" };
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
type Props = { open: boolean; medication?: MedicationRow | null; onClose: () => void; onSaved: () => void | Promise<void>; help?: Partial<HelpTooltipMap> };
export function MedicationFormSheet({ open, medication, onClose, onSaved, help }: Props) {
  if (!open) return null;
  return <Content key={medication?.id ?? "new"} medication={medication} onClose={onClose} onSaved={onSaved} help={help} />;
}
function Content({ medication, onClose, onSaved, help }: Omit<Props, "open">) {
  const [name, setName] = useState(medication?.name ?? "");
  const [category, setCategory] = useState<MedicationCategory>(medication?.category ?? "glp1");
  const [route, setRoute] = useState<MedicationRoute>(medication?.route ?? "subcutanea");
  const [unit, setUnit] = useState<DoseUnit>(medication?.dose_unit ?? "mg");
  const [dose, setDose] = useState(medication?.dose_amount ?? 0);
  const [doseTouched, setDoseTouched] = useState(false);
  const [frequency, setFrequency] = useState<MedicationFrequency>(medication?.frequency ?? "semanal");
  const [days, setDays] = useState<number[]>(medication?.days_of_week ?? []);
  const [started, setStarted] = useState(medication?.started_on ?? getTodayIsoDate());
  const [prescriber, setPrescriber] = useState(medication?.prescribed_by ?? "");
  const [pending, setPending] = useState(false); const [error, setError] = useState<string>();
  const save = async () => {
    if (!name.trim()) { setError("Informe o nome da medicação."); return; }
    if (doseTouched && dose <= 0) { setError("Informe uma dose prescrita válida."); return; }
    if ((frequency === "semanal" || frequency === "quinzenal") && !days.length) { setError("Escolha ao menos um dia da semana."); return; }
    if (medication && (dose !== (medication.dose_amount ?? 0) || unit !== medication.dose_unit) && !window.confirm("Você alterou a dose. Faça isso somente com orientação médica.")) return;
    const payload: MedicationUpsert = { name: name.trim(), category, route, dose_unit: unit, frequency, days_of_week: days.length ? days : null, started_on: started || null, prescribed_by: prescriber.trim() || null, ...(doseTouched ? { dose_amount: dose > 0 ? dose : null } : {}) };
    setPending(true); setError(undefined);
    try { await apiData<MedicationRow>(medication ? `/api/medications/${medication.id}` : "/api/medications", { method: medication ? "PATCH" : "POST", json: payload }); await onSaved(); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar."); }
    finally { setPending(false); }
  };
  const step = unit === "mg" ? 0.05 : unit === "ui" || unit === "ml" ? 0.5 : 1;
  const choice = <T extends string>(values: readonly T[], labels: Record<T, string>, current: T, change: (value: T) => void) => <div className="flex flex-wrap gap-2">{values.map((value) => <button key={value} type="button" onClick={() => change(value)} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${current === value ? "border-success-500 bg-success-500 text-zinc-950" : "border-white/20 text-zinc-200"}`}>{labels[value]}</button>)}</div>;
  return <Sheet open onOpenChange={(value) => { if (!value) onClose(); }}><SheetContent side="bottom" className="max-h-[94dvh] overflow-y-auto rounded-t-3xl border-white/10 bg-zinc-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2"><SheetHeader className="px-0"><SheetTitle>{medication ? "Editar medicação" : "Cadastrar medicação"}</SheetTitle></SheetHeader>
    <div className="space-y-4"><p className="rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-zinc-200">{MEDICATION_DISCLAIMER}</p><div><p className="mb-2 text-sm font-semibold">Nome</p><div className="mb-2 flex flex-wrap gap-2">{["Semaglutida", "Tirzepatida", "Liraglutida", "Outro"].map((value) => <button key={value} type="button" onClick={() => setName(value === "Outro" ? "" : value)} className="min-h-11 rounded-xl border border-white/20 px-3 text-sm">{value}</button>)}</div><Input aria-label="Nome da medicação" value={name} onChange={(event) => setName(event.target.value)} className="h-12" maxLength={80} /></div>
    <div><p className="mb-2 text-sm font-semibold">Categoria</p>{choice(MEDICATION_CATEGORIES, CATEGORIES, category, setCategory)}</div>
    <div><p className="mb-2 text-sm font-semibold">Via</p>{choice(MEDICATION_ROUTES, ROUTES, route, setRoute)}</div>
    <div><div className="flex items-center gap-1"><p className="text-sm font-semibold">Dose prescrita pelo seu médico</p><HelpHint help={help?.["medications.dose_amount"]} /></div><Stepper value={dose} onChange={(value) => { setDose(value); setDoseTouched(true); }} step={step} min={0} max={10000} unit={unit} label="Dose prescrita" /><div className="mt-2 flex flex-wrap gap-2">{DOSE_UNITS.map((value) => <button key={value} type="button" onClick={() => setUnit(value)} className={`min-h-11 rounded-xl border px-3 text-sm ${unit === value ? "border-success-500 bg-success-500 text-zinc-950" : "border-white/20"}`}>{value}</button>)}</div>{!doseTouched && !medication ? <p className="mt-1 text-xs text-zinc-300">0 significa dose não informada; registre apenas o valor da sua prescrição.</p> : null}</div>
    <div><p className="mb-2 text-sm font-semibold">Frequência</p>{choice(MEDICATION_FREQUENCIES, FREQUENCIES, frequency, setFrequency)}</div>
    {(frequency === "semanal" || frequency === "quinzenal" || frequency === "personalizada") ? <div><p className="mb-2 text-sm font-semibold">Dias da semana</p><div className="grid grid-cols-7 gap-1">{DAYS.map((label, value) => <button key={label} type="button" aria-pressed={days.includes(value)} onClick={() => setDays((current) => current.includes(value) ? current.filter((day) => day !== value) : [...current, value])} className={`min-h-11 rounded-xl border text-xs ${days.includes(value) ? "border-success-500 bg-success-500 text-zinc-950" : "border-white/20"}`}>{label}</button>)}</div></div> : null}
    <div><label htmlFor="medication-start" className="mb-2 block text-sm font-semibold">Data de início</label><Input id="medication-start" type="date" value={started} onChange={(event) => setStarted(event.target.value)} className="h-12" /></div>
    <div><label htmlFor="prescriber" className="mb-2 block text-sm font-semibold">Prescrito por (opcional)</label><Input id="prescriber" value={prescriber} onChange={(event) => setPrescriber(event.target.value)} maxLength={120} className="h-12" /></div>
    {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}</div><div className="sticky bottom-0 -mx-4 mt-4 bg-zinc-950 px-4 pt-3"><Button className="h-12 w-full bg-success-500 font-bold text-zinc-950 hover:bg-success-500/85" disabled={pending} onClick={() => void save()}>{pending ? "Salvando…" : "Salvar medicação"}</Button></div>
  </SheetContent></Sheet>;
}




