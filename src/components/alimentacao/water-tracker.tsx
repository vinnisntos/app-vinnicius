"use client";

import { useMemo, useState } from "react";
import { Droplet, LoaderCircle, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { apiData, newClientId } from "@/lib/api/client";
import type { HelpTooltipMap, WaterLogInsert, WaterLogRow } from "@/types/database";

const QUICK_AMOUNTS = [200, 300, 500] as const;

export function WaterTracker({
  initialLogs,
  goalMl,
  logDate,
  help,
}: {
  initialLogs: WaterLogRow[];
  goalMl: number;
  logDate: string;
  help?: Partial<HelpTooltipMap>;
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const total = useMemo(() => logs.reduce((sum, log) => sum + log.amount_ml, 0), [logs]);
  const progress = Math.min(100, Math.round((total / Math.max(goalMl, 1)) * 100));

  async function add(amount_ml: number) {
    const payload: WaterLogInsert = { id: newClientId(), log_date: logDate, amount_ml };
    const optimistic: WaterLogRow = { ...payload, user_id: "optimistic", logged_at: new Date().toISOString() };
    setError(undefined);
    setLogs((current) => [...current, optimistic]);
    setPending(true);
    try {
      const saved = await apiData<WaterLogRow>("/api/nutrition/water", { method: "POST", json: payload });
      setLogs((current) => current.map((item) => item.id === payload.id ? saved : item));
    } catch (cause) {
      setLogs((current) => current.filter((item) => item.id !== payload.id));
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar a água.");
    } finally {
      setPending(false);
    }
  }

  async function undo() {
    const last = logs.at(-1);
    if (!last) return;
    setError(undefined);
    setLogs((current) => current.slice(0, -1));
    setPending(true);
    try {
      await apiData<{ deleted: boolean }>(`/api/nutrition/water/${last.id}`, { method: "DELETE" });
    } catch (cause) {
      setLogs((current) => [...current, last]);
      setError(cause instanceof Error ? cause.message : "Não foi possível desfazer.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Droplet className="size-5 text-sky-300" aria-hidden /><h2 className="font-semibold">Água</h2><HelpHint help={help?.["water_logs.amount_ml"]} /></div>
        {pending ? <LoaderCircle className="size-4 animate-spin text-zinc-400" aria-label="Salvando" /> : null}
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight">{(total / 1000).toFixed(1)} L <span className="text-sm font-normal text-zinc-400">de {(goalMl / 1000).toFixed(1)} L</span></p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-brand-500 transition-all" style={{ width: `${progress}%` }} /></div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {QUICK_AMOUNTS.map((amount) => <Button key={amount} type="button" variant="secondary" className="h-11 rounded-xl" disabled={pending} onClick={() => void add(amount)}>+{amount} ml</Button>)}
      </div>
      <Button type="button" variant="ghost" className="mt-2 h-11 w-full text-zinc-400" disabled={pending || !logs.length} onClick={() => void undo()}><Undo2 aria-hidden /> Desfazer último</Button>
      {error ? <p role="alert" className="mt-2 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
