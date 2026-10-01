import type { ReactNode } from "react";
import { Droplets, Syringe, TrendingDown } from "lucide-react";
import { MEDICATION_DISCLAIMER } from "@/types/database";

function Phone({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="mx-auto w-full max-w-[17rem]">
      <div className="rounded-[2rem] border border-glass-border bg-glass p-3 shadow-2xl backdrop-blur-md">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-border" aria-hidden />
        <div className="space-y-3 rounded-[1.4rem] bg-background p-4 text-left">{children}</div>
      </div>
      <figcaption className="mt-3 text-center text-sm font-semibold">{label}</figcaption>
    </figure>
  );
}

const weekWeights = [86.4, 86.1, 85.9, 85.9, 85.6, 85.3, 85.1];

/** Telas ilustrativas do app, feitas com os mesmos tokens da interface real. */
export function AppPreviews() {
  const min = Math.min(...weekWeights);
  const max = Math.max(...weekWeights);
  return (
    <div>
      <div className="grid gap-8 md:grid-cols-3">
        <Phone label="Proteína do dia em destaque">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Hoje</p>
          <p className="text-3xl font-black tracking-tight">faltam 38 g</p>
          <p className="text-sm text-text-secondary">de proteína para a sua meta de 130 g</p>
          <div className="h-3 overflow-hidden rounded-full bg-surface-muted" aria-hidden><div className="h-full w-[71%] rounded-full bg-success-500" /></div>
          <div className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass p-3 text-sm"><Droplets className="size-4 text-brand-strong" aria-hidden />Água: 1,5 de 2,5 L</div>
        </Phone>
        <Phone label="Registro de cada aplicação">
          <div className="flex items-center gap-2 text-sm font-semibold"><Syringe className="size-4 text-brand-strong" aria-hidden />Aplicação registrada</div>
          <dl className="space-y-2 text-sm">
            {[["Data", "Quinta, 08:30"], ["Dose", "conforme prescrita"], ["Local", "Abdômen, lado direito"]].map(([term, value]) => (
              <div key={term} className="flex justify-between gap-3 border-b border-border pb-2"><dt className="text-text-secondary">{term}</dt><dd className="text-right font-medium">{value}</dd></div>
            ))}
          </dl>
          <p className="text-xs leading-relaxed text-text-secondary">{MEDICATION_DISCLAIMER}</p>
        </Phone>
        <Phone label="Peso da semana">
          <div className="flex items-center gap-2 text-sm font-semibold"><TrendingDown className="size-4 text-success" aria-hidden />Últimos 7 dias</div>
          <div className="flex h-24 items-end gap-1.5" aria-hidden>
            {weekWeights.map((weight, index) => <div key={index} className="flex-1 rounded-t-md bg-brand-soft" style={{ height: `${35 + ((weight - min) / (max - min)) * 65}%` }} />)}
          </div>
          <p className="text-sm text-text-secondary">Pesagens registradas e organizadas para levar à consulta.</p>
        </Phone>
      </div>
      <p className="mt-6 text-center text-xs text-text-tertiary">Telas ilustrativas, com dados de exemplo.</p>
    </div>
  );
}
