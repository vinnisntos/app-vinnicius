import Link from "next/link";
import { HelpHint } from "@/components/ui/help-hint";
import type { HelpTooltipMap, NutritionMetrics } from "@/types/database";
const MACROS = [{ key: "protein_g", target: "protein_target_g", short: "P", label: "proteína" }, { key: "carbs_g", target: "carbs_target_g", short: "C", label: "carboidrato" }, { key: "fat_g", target: "fat_target_g", short: "G", label: "gordura" }] as const;
const CARD = "rounded-2xl border border-glass-border bg-glass p-4 shadow-xl backdrop-blur-md";

function Ring({ percent, color, label }: { percent: number; color: string; label: string }) {
  return <div aria-label={label} className="relative flex size-20 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${color} ${percent}%, var(--surface-muted) ${percent}% 100%)` }}><div className="flex size-16 items-center justify-center rounded-full bg-surface-solid text-sm font-bold">{percent}%</div></div>;
}

/**
 * Quem usa medicação (focus "proteina"): o destaque é a proteína do dia e as
 * calorias viram informação secundária, sem "déficit". Demais: calorias.
 */
function ProteinFocus({ metrics }: { metrics: NutritionMetrics }) {
  const remaining = Math.max(0, Math.round(metrics.protein_target_g - metrics.protein_g));
  const percent = Math.min(100, Math.round((metrics.protein_g / Math.max(metrics.protein_target_g, 1)) * 100));
  const others = MACROS.filter((macro) => macro.key !== "protein_g");
  return <>
    <div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="text-sm font-semibold text-text-secondary">Proteína de hoje</p><p className="mt-0.5 text-2xl font-black tracking-tight text-success">{remaining === 0 ? "Meta de proteína batida" : `Faltam ${remaining} g de proteína`}</p><p className="mt-1 text-xs text-text-secondary">{Math.round(metrics.protein_g)} de {Math.round(metrics.protein_target_g)} g no dia</p></div><Ring percent={percent} color="var(--success-500)" label={`${percent}% da meta de proteína`} /></div>
    {metrics.low_intake_warning ? <div role="status" className="mt-3 rounded-xl border border-warning-500/40 bg-warning-500/10 p-3"><p className="text-sm font-bold text-warning">Hoje você comeu pouco</p><p className="mt-1 text-xs leading-relaxed text-foreground">Comer muito pouco pode fazer você perder músculo. Tente incluir uma fonte de proteína. Se a falta de apetite persistir, converse com seu médico.</p></div> : null}
    <p className="mt-3 text-xs text-text-secondary">Calorias: {Math.round(metrics.consumed_kcal)} kcal hoje · mínimo diário de {metrics.min_kcal} kcal</p>
    <div className="mt-2 grid gap-2 sm:grid-cols-2">{others.map((macro) => { const macroPercent = Math.min(100, Math.round((metrics[macro.key] / Math.max(metrics[macro.target], 1)) * 100)); return <div key={macro.key}><div className="mb-1 flex justify-between gap-2 text-xs text-text-secondary"><span>{macro.short}</span><span className="truncate">{Math.round(metrics[macro.key])} de {Math.round(metrics[macro.target])} g de {macro.label}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-glass"><div className="h-full rounded-full bg-success-500" style={{ width: `${macroPercent}%` }} /></div></div>; })}</div>
  </>;
}

export function CalorieRemainingCard({ metrics, aboveFold, help }: { metrics: NutritionMetrics | null; aboveFold?: boolean; help?: Partial<HelpTooltipMap> }) {
  if (!metrics) return <section data-above-fold={aboveFold ? "kcal" : undefined} className={CARD}><h2 className="text-lg font-bold">Defina suas metas</h2><p className="mt-1 text-sm text-text-secondary">Configure seu perfil para ver suas metas do dia.</p><Link href="/alimentacao" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-success-500 px-4 text-sm font-bold text-on-bright">Configurar na Alimentação</Link></section>;
  if (metrics.focus === "proteina") return <section data-above-fold={aboveFold ? "protein" : undefined} className={CARD}><ProteinFocus metrics={metrics} /></section>;
  const ratio = metrics.consumed_kcal / Math.max(metrics.recommended_kcal, 1);
  const tone = ratio > 1 ? "danger" : ratio >= 0.85 ? "warning" : "success";
  const color = tone === "danger" ? "var(--danger-500)" : tone === "warning" ? "var(--warning-500)" : "var(--success-500)";
  const percent = Math.min(100, Math.round(ratio * 100));
  return <section data-above-fold={aboveFold ? "kcal" : undefined} className={CARD}>
    <div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="text-sm font-semibold text-text-secondary">Calorias do dia</p><p className={`mt-0.5 text-2xl font-black tracking-tight ${tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-success"}`}>{metrics.remaining_kcal < 0 ? `Passou ${Math.abs(metrics.remaining_kcal)} kcal` : `Restam ${metrics.remaining_kcal} kcal`}</p><p className="mt-1 text-xs text-text-secondary">de {metrics.recommended_kcal} kcal no dia</p></div><Ring percent={percent} color={color} label={`${percent}% da meta de calorias`} /></div>
    <div className="mt-2 flex items-center gap-1"><span className="text-xs font-semibold text-foreground">Macros restantes</span><HelpHint help={help?.["metric.macros"]} /></div><div className="grid gap-2 sm:grid-cols-3">{MACROS.map((macro) => { const remaining = Math.max(0, Math.round(metrics[macro.target] - metrics[macro.key])); const macroPercent = Math.min(100, Math.round((metrics[macro.key] / Math.max(metrics[macro.target], 1)) * 100)); return <div key={macro.key}><div className="mb-1 flex justify-between gap-2 text-xs text-text-secondary"><span>{macro.short}</span><span className="truncate">faltam {remaining} g de {macro.label}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-glass"><div className="h-full rounded-full bg-success-500" style={{ width: `${macroPercent}%` }} /></div></div>; })}</div>
  </section>;
}
