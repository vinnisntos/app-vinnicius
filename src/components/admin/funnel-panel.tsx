"use client";

import { useEffect, useState } from "react";
import { apiData } from "@/lib/api/client";
import type { BillingPlanId, CancelReason, FunnelResponse } from "@/types/database";

const PERIODS = [7, 30, 90] as const;
const PLAN_LABEL: Record<BillingPlanId, string> = { mensal: "Mensal", anual: "Anual", fundador: "Fundador" };
const REASON_LABEL: Record<CancelReason, string> = {
  preco: "Preço",
  nao_uso: "Não estava usando",
  faltou_recurso: "Faltou um recurso",
  parei_tratamento: "Parou o tratamento",
  problema_tecnico: "Problema técnico",
  outro: "Outro",
};

function Step({ label, value, of }: { label: string; value: number; of?: number }) {
  const percent = of ? Math.round((value / of) * 100) : null;
  return (
    <div className="rounded-2xl border border-glass-border bg-glass p-4">
      <span className="block text-2xl font-black">{value}</span>
      <span className="text-xs text-text-secondary">{label}{percent !== null ? ` · ${percent}%` : ""}</span>
    </div>
  );
}

/** Funil cadastro → ativação → pagamento (só números agregados). */
export function FunnelPanel() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [loaded, setLoaded] = useState<{ days: number; data?: FunnelResponse; error?: string }>();

  useEffect(() => {
    let cancelled = false;
    apiData<FunnelResponse>(`/api/admin/funnel?days=${days}`)
      .then((data) => { if (!cancelled) setLoaded({ days, data }); })
      .catch((cause) => { if (!cancelled) setLoaded({ days, error: cause instanceof Error ? cause.message : "Não foi possível carregar o funil." }); });
    return () => { cancelled = true; };
  }, [days]);

  const current = loaded?.days === days ? loaded : undefined;
  const funnel = current?.data;
  const planEntries = funnel ? (Object.entries(funnel.by_plan) as [BillingPlanId, number][]) : [];
  const reasonEntries = funnel ? (Object.entries(funnel.cancel_reasons) as [CancelReason, number][]) : [];

  return (
    <section className="rounded-2xl border border-glass-border bg-glass p-4 shadow-xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-bold">Funil</h2><p className="text-xs text-text-secondary">Quem se cadastrou no período e até onde chegou.</p></div>
        <div className="flex gap-2">
          {PERIODS.map((period) => (
            <button key={period} type="button" aria-pressed={days === period} onClick={() => setDays(period)} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${days === period ? "border-brand-strong bg-brand-soft text-brand-strong" : "border-glass-border bg-glass text-foreground"}`}>
              {period} dias
            </button>
          ))}
        </div>
      </div>

      {current?.error ? <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{current.error}</p> : null}
      {!current ? <div className="mt-4 h-24 animate-pulse rounded-2xl bg-glass" aria-label="Carregando funil" /> : null}

      {funnel ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Step label="Cadastros" value={funnel.signups} />
            <Step label="Ativados (registraram refeição ou aplicação)" value={funnel.activated} of={funnel.signups} />
            <Step label="Usam medicação" value={funnel.with_medication} of={funnel.signups} />
            <Step label="Assinantes" value={funnel.subscribed} of={funnel.signups} />
            <Step label="Testes em andamento" value={funnel.trials_running} />
            <Step label="Testes encerrados sem assinar" value={funnel.trials_ended} />
            <Step label="Cancelamentos" value={funnel.canceled} />
            <div className="rounded-2xl border border-glass-border bg-glass p-4">
              <span className="block text-2xl font-black">{funnel.trial_conversion_pct === null ? "—" : `${funnel.trial_conversion_pct.toLocaleString("pt-BR")}%`}</span>
              <span className="text-xs text-text-secondary">Conversão do teste</span>
            </div>
          </div>

          <p className="text-sm">Plano fundador: <strong>{funnel.founder.sold}</strong> de {funnel.founder.total} vagas vendidas · restam {funnel.founder.left}.</p>

          {funnel.signups === 0 ? <p className="text-sm text-text-secondary">Nenhum cadastro neste período ainda.</p> : null}

          {planEntries.length ? <p className="text-sm">Assinantes por plano: {planEntries.map(([plan, total]) => `${PLAN_LABEL[plan]} ${total}`).join(" · ")}</p> : null}

          {funnel.by_source.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-text-secondary"><tr><th className="py-2 pr-3 font-semibold">Origem</th><th className="py-2 pr-3 font-semibold">Cadastros</th><th className="py-2 font-semibold">Assinantes</th></tr></thead>
                <tbody>{funnel.by_source.map((row) => <tr key={row.source} className="border-t border-glass-border"><td className="py-2 pr-3">{row.source}</td><td className="py-2 pr-3">{row.signups}</td><td className="py-2">{row.subscribed}</td></tr>)}</tbody>
              </table>
            </div>
          ) : null}

          {reasonEntries.length ? <p className="text-sm">Motivos de cancelamento: {reasonEntries.map(([reason, total]) => `${REASON_LABEL[reason]} ${total}`).join(" · ")}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
