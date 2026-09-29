"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Apple, CalendarDays, Check, ChevronLeft, ChevronRight, LoaderCircle, Pencil, RefreshCw, Scale, Share2, Utensils } from "lucide-react";
import { WaterTracker } from "@/components/alimentacao/water-tracker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { HelpHint } from "@/components/ui/help-hint";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError, apiData, apiFetch, newClientId } from "@/lib/api/client";
import { getTodayIsoDate } from "@/lib/date";
import type { ActivityLevel, HelpTooltipMap, MealLogRow, MealLogUpsert, MealSlot, NutritionDay, NutritionGoal, Sex, WeightLogRow } from "@/types/database";

const QUEUE_KEY_PREFIX = "lifeos.nutrition.mealQueue";
const MEAL_LABELS: Record<MealSlot, string> = { cafe_da_manha: "Café da manhã", almoco: "Almoço", lanche: "Lanche", jantar: "Jantar", ceia: "Ceia" };
const ACTIVITY_LABELS: Record<ActivityLevel, string> = { sedentario: "Sedentário", leve: "Levemente ativo", moderado: "Moderadamente ativo", ativo: "Ativo", muito_ativo: "Muito ativo" };
const GOAL_LABELS: Record<NutritionGoal, string> = { emagrecer: "Emagrecer", manter: "Manter peso", ganhar: "Ganhar peso" };

function shiftDate(date: string, delta: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + delta));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

function networkFailure(error: unknown) {
  return !navigator.onLine || !(error instanceof ApiClientError);
}

function readQueue(queueKey: string): MealLogUpsert[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(queueKey) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed as MealLogUpsert[] : [];
  } catch { return []; }
}

function writeQueue(queueKey: string, items: MealLogUpsert[]) {
  try { localStorage.setItem(queueKey, JSON.stringify(items)); } catch { /* armazenamento indisponível */ }
}

export function NutritionDashboard({ userId }: { userId: string }) {
  const queueKey = `${QUEUE_KEY_PREFIX}:${userId}`;
  const today = getTodayIsoDate();
  const [date, setDate] = useState(today);
  const [day, setDay] = useState<NutritionDay>();
  const [help, setHelp] = useState<Partial<HelpTooltipMap>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [toast, setToast] = useState<string>();
  const [editing, setEditing] = useState<{ slot: MealSlot; values: MealLogUpsert }>();

  const load = useCallback(async () => {
    setLoading(true); setError(undefined);
    try {
      const envelope = await apiFetch<NutritionDay>(`/api/nutrition/day?date=${date}`);
      setDay(envelope.data); setHelp(envelope.help ?? {});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar seu dia.");
    } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { const id = setTimeout(() => void load(), 0); return () => clearTimeout(id); }, [load]);
  useEffect(() => {
    async function flushQueue() {
      const queue = readQueue(queueKey);
      if (!queue.length) return;
      const remaining: MealLogUpsert[] = [];
      let discarded = 0;
      let synced = 0;
      for (let index = 0; index < queue.length; index += 20) {
        const batch = queue.slice(index, index + 20);
        try {
          await apiData<MealLogRow[]>("/api/nutrition/meals", { method: "PUT", json: batch });
          synced += batch.length;
        } catch (cause) {
          if (cause instanceof ApiClientError && cause.status >= 400 && cause.status < 500) {
            discarded += batch.length;
          } else {
            remaining.push(...queue.slice(index));
            break;
          }
        }
      }
      writeQueue(queueKey, remaining);
      if (discarded) setToast(`${discarded} ${discarded === 1 ? "alteração offline não pôde" : "alterações offline não puderam"} ser salvas`);
      else if (synced) setToast("Alterações offline sincronizadas.");
      if (synced) void load();
    }
    window.addEventListener("online", flushQueue);
    if (navigator.onLine) void flushQueue();
    return () => window.removeEventListener("online", flushQueue);
  }, [load, queueKey]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(undefined), 3500); return () => clearTimeout(id); }, [toast]);

  function mealPayload(slot: MealSlot, meal: MealLogRow | null, patch: Partial<MealLogUpsert>): MealLogUpsert {
    return { id: meal?.id ?? newClientId(), log_date: date, meal_slot: slot, description: meal?.description ?? null, calories: meal?.calories ?? null, protein_g: meal?.protein_g ?? null, carbs_g: meal?.carbs_g ?? null, fat_g: meal?.fat_g ?? null, is_completed: meal?.is_completed ?? false, ...patch };
  }

  function optimisticMeal(payload: MealLogUpsert): MealLogRow {
    const now = new Date().toISOString();
    return { id: payload.id, user_id: "optimistic", log_date: payload.log_date, meal_slot: payload.meal_slot, description: payload.description ?? null, calories: payload.calories ?? null, protein_g: payload.protein_g ?? null, carbs_g: payload.carbs_g ?? null, fat_g: payload.fat_g ?? null, is_completed: payload.is_completed ?? false, completed_at: payload.is_completed ? now : null, created_at: now, updated_at: now };
  }

  async function saveMeal(payload: MealLogUpsert) {
    if (!day) return;
    const previous = day;
    const currentMeal = day.meals.find((item) => item.meal_slot === payload.meal_slot)?.meal;
    const previousCalories = currentMeal?.is_completed ? (currentMeal.calories ?? 0) : 0;
    const nextCalories = payload.is_completed ? (payload.calories ?? 0) : 0;
    const delta = nextCalories - previousCalories;
    setDay({
      ...day,
      meals: day.meals.map((item) => item.meal_slot === payload.meal_slot ? { ...item, meal: optimisticMeal(payload) } : item),
      metrics: day.metrics ? {
        ...day.metrics,
        consumed_kcal: day.metrics.consumed_kcal + delta,
        remaining_kcal: day.metrics.remaining_kcal - delta,
      } : null,
    });
    try {
      const rows = await apiData<MealLogRow[]>("/api/nutrition/meals", { method: "PUT", json: payload });
      const saved = rows[0];
      if (saved) setDay((current) => current ? { ...current, meals: current.meals.map((item) => item.meal_slot === payload.meal_slot ? { ...item, meal: saved } : item) } : current);
    } catch (cause) {
      if (networkFailure(cause)) {
        const queue = readQueue(queueKey).filter((item) => !(item.log_date === payload.log_date && item.meal_slot === payload.meal_slot));
        writeQueue(queueKey, [...queue, payload]); setToast("Sem internet: alteração salva para sincronizar.");
      } else {
        setDay(previous); setToast(cause instanceof Error ? cause.message : "Alteração desfeita.");
      }
    }
  }

  if (loading) return <NutritionLoading />;
  if (error || !day) return <ErrorState message={error ?? "Dia indisponível."} onRetry={() => void load()} />;
  if (!day.metrics) return <Onboarding date={date} help={help} onComplete={load} />;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Alimentação</p><h1 className="mt-1 text-3xl font-black tracking-tight">Seu dia em equilíbrio</h1></div>
        <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-md">
          <Button variant="ghost" size="icon-lg" aria-label="Dia anterior" onClick={() => setDate(shiftDate(date, -1))}><ChevronLeft aria-hidden /></Button>
          <label className="relative"><CalendarDays className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden /><Input aria-label="Selecionar data" type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} className="h-10 w-36 pl-8" /></label>
          <Button variant="ghost" size="icon-lg" aria-label="Dia seguinte" disabled={date >= today} onClick={() => setDate(shiftDate(date, 1))}><ChevronRight aria-hidden /></Button>
        </div>
      </header>

      <CalorieCard day={day} help={help} />
      <div className="grid gap-5 lg:grid-cols-2">
        <WaterTracker key={date} initialLogs={day.water_logs} goalMl={day.metrics.water_goal_ml} logDate={date} help={help} />
        <WeightCard date={date} latest={day.latest_weight} onSaved={load} />
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl backdrop-blur-md">
        <div className="mb-4 flex items-center gap-2"><Utensils className="size-5 text-brand-300" aria-hidden /><h2 className="font-semibold">Refeições</h2></div>
        <div className="space-y-2">
          {day.meals.map(({ meal_slot, meal }) => {
            const payload = mealPayload(meal_slot, meal, { is_completed: !(meal?.is_completed ?? false) });
            return (
              <div key={meal_slot} className={`flex min-h-16 items-center gap-3 rounded-2xl border p-3 transition ${meal?.is_completed ? "border-emerald-400/25 bg-emerald-500/10" : "border-white/10 bg-black/15"}`}>
                <Checkbox checked={meal?.is_completed ?? false} aria-label={`Marcar ${MEAL_LABELS[meal_slot]} como concluída`} onCheckedChange={() => void saveMeal(payload)} className="size-5" />
                <button type="button" className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500" onClick={() => setEditing({ slot: meal_slot, values: mealPayload(meal_slot, meal, {}) })}>
                  <span className="block font-medium">{MEAL_LABELS[meal_slot]}</span>
                  <span className="block truncate text-xs text-zinc-400">{meal?.description || "Toque para adicionar"}{meal?.calories != null ? ` · ${meal.calories} kcal` : ""}</span>
                </button>
                <Button variant="ghost" size="icon-lg" aria-label={`Editar ${MEAL_LABELS[meal_slot]}`} onClick={() => setEditing({ slot: meal_slot, values: mealPayload(meal_slot, meal, {}) })}><Pencil aria-hidden /></Button>
                {meal?.is_completed ? <Button asChild variant="ghost" size="icon-lg"><Link href={`/comunidade?meal=${meal.id}&date=${date}`} aria-label={`Compartilhar ${MEAL_LABELS[meal_slot]}`}><Share2 aria-hidden /></Link></Button> : null}
              </div>
            );
          })}
        </div>
      </section>

      <MealEditor editing={editing} setEditing={setEditing} onSave={(payload) => { setEditing(undefined); void saveMeal(payload); }} help={help} />
      {toast ? <div role="status" className="fixed bottom-24 left-1/2 z-[90] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-900/95 p-4 text-center text-sm shadow-2xl backdrop-blur-xl md:bottom-6">{toast}</div> : null}
    </div>
  );
}

function CalorieCard({ day, help }: { day: NutritionDay; help: Partial<HelpTooltipMap> }) {
  const metrics = day.metrics!;
  const percent = Math.min(100, Math.round((metrics.consumed_kcal / Math.max(metrics.recommended_kcal, 1)) * 100));
  const over = metrics.remaining_kcal < 0;
  return (
    <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl backdrop-blur-md sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="relative mx-auto flex size-40 items-center justify-center rounded-full" style={{ background: `conic-gradient(${over ? "#ef4444" : "#a855f7"} ${percent}%, rgba(255,255,255,.08) ${percent}% 100%)` }}>
        <div className="flex size-32 flex-col items-center justify-center rounded-full bg-zinc-950"><span className="text-3xl font-black">{metrics.consumed_kcal}</span><span className="text-xs text-zinc-400">de {metrics.recommended_kcal} kcal</span></div>
      </div>
      <div>
        <p className={`text-xl font-bold ${over ? "text-red-300" : "text-emerald-300"}`}>{over ? `Passou ${Math.abs(metrics.remaining_kcal)} kcal` : `${metrics.remaining_kcal} kcal restantes`}</p>
        <p className="mt-1 text-sm text-zinc-400">Progresso calórico do dia</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-center justify-between"><span className="text-xs text-zinc-400">TDEE</span><HelpHint help={help["metric.tdee"]} className="size-8" /></div><strong>{metrics.tdee_kcal} kcal</strong></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-center justify-between"><span className="text-xs text-zinc-400">BMR</span><HelpHint help={help["metric.bmr"]} className="size-8" /></div><strong>{metrics.bmr_kcal} kcal</strong></div>
        </div>
      </div>
    </section>
  );
}

function MealEditor({ editing, setEditing, onSave, help }: { editing?: { slot: MealSlot; values: MealLogUpsert }; setEditing: (value: undefined | { slot: MealSlot; values: MealLogUpsert }) => void; onSave: (payload: MealLogUpsert) => void; help: Partial<HelpTooltipMap> }) {
  if (!editing) return null;
  const update = (patch: Partial<MealLogUpsert>) => setEditing({ ...editing, values: { ...editing.values, ...patch } });
  const number = (value: string) => value === "" ? null : Number(value);
  return (
    <Sheet open onOpenChange={(open) => { if (!open) setEditing(undefined); }}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl border-white/10 bg-zinc-950/95 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2">
        <SheetHeader className="px-0"><SheetTitle>Editar {MEAL_LABELS[editing.slot]}</SheetTitle><SheetDescription>Registre a refeição e seus macros.</SheetDescription></SheetHeader>
        <div className="space-y-4">
          <Field label="Descrição"><Input className="h-11" value={editing.values.description ?? ""} onChange={(e) => update({ description: e.target.value || null })} placeholder="Ex.: arroz, feijão e frango" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calorias (kcal)" hint={<HelpHint help={help["meal_logs.calories"]} className="size-8" />}><Input className="h-11" type="number" min={0} value={editing.values.calories ?? ""} onChange={(e) => update({ calories: number(e.target.value) })} /></Field>
            <Field label="Proteína (g)"><Input className="h-11" type="number" min={0} step="0.1" value={editing.values.protein_g ?? ""} onChange={(e) => update({ protein_g: number(e.target.value) })} /></Field>
            <Field label="Carboidrato (g)"><Input className="h-11" type="number" min={0} step="0.1" value={editing.values.carbs_g ?? ""} onChange={(e) => update({ carbs_g: number(e.target.value) })} /></Field>
            <Field label="Gordura (g)"><Input className="h-11" type="number" min={0} step="0.1" value={editing.values.fat_g ?? ""} onChange={(e) => update({ fat_g: number(e.target.value) })} /></Field>
          </div>
        </div>
        <SheetFooter className="px-0"><Button className="h-12 w-full" onClick={() => onSave(editing.values)}>Salvar refeição</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: React.ReactNode; error?: string[]; children: React.ReactNode }) {
  return <div className="space-y-1.5"><div className="flex min-h-8 items-center"><Label>{label}</Label>{hint}</div>{children}{error?.map((message) => <p key={message} className="text-xs text-red-300">{message}</p>)}</div>;
}

function Onboarding({ date, help, onComplete }: { date: string; help: Partial<HelpTooltipMap>; onComplete: () => Promise<void> }) {
  const [values, setValues] = useState({ sex: "M" as Sex, birth_date: "", height_cm: 170, activity_level: "moderado" as ActivityLevel, goal: "emagrecer" as NutritionGoal, target_weight_kg: "", weight_kg: "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<Record<string, string[]>>({});
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError(undefined); setFields({});
    try {
      await apiData("/api/nutrition/profile", { method: "PUT", json: { sex: values.sex, birth_date: values.birth_date, height_cm: values.height_cm, activity_level: values.activity_level, goal: values.goal, target_weight_kg: values.target_weight_kg ? Number(values.target_weight_kg) : null, calorie_goal: 2000, water_goal_ml: 3000 } });
      await apiData<WeightLogRow>("/api/nutrition/weight", { method: "POST", json: { logged_at: date, weight_kg: Number(values.weight_kg) } });
      await onComplete();
    } catch (cause) {
      if (cause instanceof ApiClientError) setFields(cause.fields ?? {});
      setError(cause instanceof Error ? cause.message : "Não foi possível criar seu perfil.");
    } finally { setPending(false); }
  }
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300"><Apple aria-hidden /></div>
      <h1 className="text-3xl font-black tracking-tight">Vamos personalizar suas metas</h1><p className="mt-2 text-sm text-zinc-400">Leva menos de dois minutos. Use dados atuais para receber uma recomendação mais útil.</p>
      <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl backdrop-blur-md">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sexo biológico" error={fields.sex}><Select value={values.sex} onValueChange={(sex) => setValues((v) => ({ ...v, sex: sex as Sex }))}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem></SelectContent></Select></Field>
          <Field label="Data de nascimento" error={fields.birth_date}><Input className="h-11" type="date" required value={values.birth_date} onChange={(e) => setValues((v) => ({ ...v, birth_date: e.target.value }))} /></Field>
          <Field label="Altura (cm)" error={fields.height_cm}><Input className="h-11" type="number" min={80} max={260} required value={values.height_cm} onChange={(e) => setValues((v) => ({ ...v, height_cm: Number(e.target.value) }))} /></Field>
          <Field label="Nível de atividade" hint={<HelpHint help={help["nutrition_profile.activity_level"]} className="size-8" />} error={fields.activity_level}><Select value={values.activity_level} onValueChange={(activity_level) => setValues((v) => ({ ...v, activity_level: activity_level as ActivityLevel }))}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ACTIVITY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Objetivo" error={fields.goal}><Select value={values.goal} onValueChange={(goal) => setValues((v) => ({ ...v, goal: goal as NutritionGoal }))}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(GOAL_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Peso-alvo (kg, opcional)" error={fields.target_weight_kg}><Input className="h-11" type="number" min={25} max={400} step="0.1" value={values.target_weight_kg} onChange={(e) => setValues((v) => ({ ...v, target_weight_kg: e.target.value }))} /></Field>
          <Field label="Peso atual (kg)" error={fields.weight_kg}><Input className="h-11" type="number" min={25} max={400} step="0.1" required value={values.weight_kg} onChange={(e) => setValues((v) => ({ ...v, weight_kg: e.target.value }))} /></Field>
        </div>
        {error ? <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
        <Button className="h-12 w-full" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Check aria-hidden />}{pending ? "Criando suas metas…" : "Começar meu plano"}</Button>
      </form>
    </div>
  );
}

function WeightCard({ date, latest, onSaved }: { date: string; latest: WeightLogRow | null; onSaved: () => Promise<void> }) {
  const [weight, setWeight] = useState(""); const [pending, setPending] = useState(false); const [error, setError] = useState<string>(); const [fields, setFields] = useState<Record<string, string[]>>({});
  async function submit(event: React.FormEvent) { event.preventDefault(); setPending(true); setError(undefined); setFields({}); try { await apiData<WeightLogRow>("/api/nutrition/weight", { method: "POST", json: { logged_at: date, weight_kg: Number(weight) } }); setWeight(""); await onSaved(); } catch (cause) { if (cause instanceof ApiClientError) setFields(cause.fields ?? {}); setError(cause instanceof Error ? cause.message : "Não foi possível registrar."); } finally { setPending(false); } }
  return <section className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl backdrop-blur-md"><div className="flex items-center gap-2"><Scale className="size-5 text-brand-300" aria-hidden /><h2 className="font-semibold">Peso</h2></div><p className="mt-4 text-3xl font-black">{latest ? `${latest.weight_kg.toFixed(1)} kg` : "—"}</p><p className="text-xs text-zinc-400">Última pesagem disponível</p><form onSubmit={submit} className="mt-4 flex gap-2"><div className="flex-1"><Input aria-label="Peso em quilogramas" className="h-11" type="number" min={25} max={400} step="0.1" required value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Peso do dia" />{fields.weight_kg?.map((message) => <p key={message} className="mt-1 text-xs text-red-300">{message}</p>)}</div><Button className="h-11" variant="secondary" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" aria-hidden /> : "Registrar"}</Button></form>{error ? <p role="alert" className="mt-2 text-xs text-red-300">{error}</p> : null}</section>;
}

function NutritionLoading() { return <div className="space-y-5" aria-label="Carregando alimentação"><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /><div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-60 rounded-2xl" /><Skeleton className="h-60 rounded-2xl" /></div><Skeleton className="h-96 rounded-2xl" /></div>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-center"><p className="font-semibold">Não foi possível carregar sua alimentação</p><p className="mt-2 text-sm text-red-100/80">{message}</p><Button className="mt-5 h-11" onClick={onRetry}><RefreshCw aria-hidden /> Tentar de novo</Button></div>; }
