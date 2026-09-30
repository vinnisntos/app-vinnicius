"use client";
import { formatDecimal } from "@/lib/format";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiData, newClientId } from "@/lib/api/client";
import { INJECTION_SITES, MEDICATION_DISCLAIMER, SIDE_EFFECTS, type HelpTooltipMap, type InjectionSite, type MedicationLogInsert, type MedicationLogRow, type MedicationOverview, type SideEffect } from "@/types/database";

export const SITE_LABELS: Record<InjectionSite, string> = { abdomen_esq: "Abdômen esq.", abdomen_dir: "Abdômen dir.", coxa_esq: "Coxa esq.", coxa_dir: "Coxa dir.", braco_esq: "Braço esq.", braco_dir: "Braço dir.", gluteo_esq: "Glúteo esq.", gluteo_dir: "Glúteo dir." };
export const EFFECT_LABELS: Record<SideEffect, string> = { nausea: "Náusea", vomito: "Vômito", diarreia: "Diarreia", constipacao: "Constipação", azia: "Azia", dor_abdominal: "Dor abdominal", fadiga: "Fadiga", dor_cabeca: "Dor de cabeça", tontura: "Tontura", perda_apetite: "Perda de apetite", reacao_local: "Reação local", outro: "Outro" };
export const SEVERE_NOTICE = "Efeitos fortes ou persistentes: procure seu médico.";
type Props = { overview: MedicationOverview | null; date: string; onClose: () => void; onSaved: (strong: boolean) => void | Promise<void>; help?: Partial<HelpTooltipMap> };
export function MedicationLogSheet({ overview, date, onClose, onSaved, help }: Props) {
  if (!overview) return null;
  return <Content key={overview.medication.id} overview={overview} date={date} onClose={onClose} onSaved={onSaved} help={help} />;
}
function Content({ overview, date, onClose, onSaved, help }: Omit<Props, "overview"> & { overview: MedicationOverview }) {
  const medication = overview.medication;
  const injectable = medication.route === "subcutanea" || medication.route === "intramuscular";
  const [site, setSite] = useState<InjectionSite | null>(injectable ? overview.suggested_site : null);
  const [effects, setEffects] = useState<SideEffect[]>([]); const [severity, setSeverity] = useState<0 | 1 | 2 | 3>(0);
  const [pending, setPending] = useState(false); const [error, setError] = useState<string>();
  const save = async () => { setPending(true); setError(undefined); const payload: MedicationLogInsert = { id: newClientId(), log_date: date, injection_site: injectable ? site : null, side_effects: effects, severity }; try { await apiData<MedicationLogRow>(`/api/medications/${medication.id}/logs`, { method: "POST", json: payload }); await onSaved(severity === 3); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível registrar."); } finally { setPending(false); } };
  return <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}><SheetContent side="bottom" className="max-h-[94dvh] overflow-y-auto rounded-t-3xl border-glass-border bg-surface-solid p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2"><SheetHeader className="px-0"><SheetTitle>Registrar aplicação</SheetTitle></SheetHeader>
    <p className="rounded-xl border border-glass-border bg-glass p-3 text-sm text-foreground">{MEDICATION_DISCLAIMER}</p>
    <p className="mt-3 text-sm font-semibold">{medication.name} · {medication.dose_amount == null ? "Dose não informada" : `${formatDecimal(medication.dose_amount)} ${medication.dose_unit} conforme prescrição`}</p>
    {injectable ? <section className="mt-4"><div className="flex items-center gap-1"><h3 className="text-sm font-semibold">Local de aplicação</h3><HelpHint help={help?.["medication_logs.injection_site"]} /></div>{overview.last_log?.injection_site ? <p className="text-xs text-text-secondary">Último local: {SITE_LABELS[overview.last_log.injection_site]}</p> : null}<div className="mt-2 grid grid-cols-2 gap-2">{INJECTION_SITES.map((value) => <button key={value} type="button" onClick={() => setSite(value)} className={`min-h-12 rounded-xl border px-2 text-sm font-semibold ${site === value ? "border-success-500 bg-success-500 text-on-bright" : "border-glass-border text-foreground"}`}>{SITE_LABELS[value]}{overview.suggested_site === value ? <span className="block text-xs">sugerido para rodízio</span> : null}</button>)}</div></section> : null}
    <section className="mt-4"><div className="flex items-center gap-1"><h3 className="text-sm font-semibold">Como você se sentiu?</h3><HelpHint help={help?.["medication_logs.side_effects"]} /></div><div className="mt-2 flex flex-wrap gap-2">{SIDE_EFFECTS.map((value) => <button key={value} type="button" aria-pressed={effects.includes(value)} onClick={() => { setEffects((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]); if (severity === 0) setSeverity(1); }} className={`min-h-11 rounded-xl border px-3 text-sm ${effects.includes(value) ? "border-success-500 bg-success-500/15 text-success" : "border-glass-border text-foreground"}`}>{EFFECT_LABELS[value]}</button>)}</div><p className="mt-3 text-sm font-semibold">Intensidade</p><div className="mt-2 grid grid-cols-4 gap-1" role="group" aria-label="Intensidade dos efeitos">{(["Nenhum", "Leve", "Moderado", "Forte"] as const).map((label, value) => <button key={label} type="button" aria-pressed={severity === value} onClick={() => { setSeverity(value as 0 | 1 | 2 | 3); if (value === 0) setEffects([]); }} className={`min-h-12 rounded-xl border px-1 text-xs font-semibold ${severity === value ? value === 3 ? "border-danger-500 bg-danger-500/20 text-danger" : "border-success-500 bg-success-500/20 text-success" : "border-glass-border text-foreground"}`}>{label}</button>)}</div></section>
    {error ? <p role="alert" className="mt-3 text-sm text-danger">{error}</p> : null}<div className="sticky bottom-0 -mx-4 mt-4 bg-surface-solid px-4 pt-3"><Button data-primary-action="log-dose" className="h-12 w-full bg-success-500 font-bold text-on-bright hover:bg-success-500/85" disabled={pending} onClick={() => void save()}>{pending ? "Salvando…" : "Salvar aplicação"}</Button></div>
  </SheetContent></Sheet>;
}

