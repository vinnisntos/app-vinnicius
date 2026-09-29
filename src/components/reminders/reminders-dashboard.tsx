"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, CalendarCheck, Link2, Link2Off, LoaderCircle, RefreshCw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError, apiData, apiFetch } from "@/lib/api/client";
import { REMINDER_KINDS, type CalendarReminderRow, type CalendarReminderUpsert, type GoogleCalendarStatus, type HelpTooltipMap, type ReminderKind, type RemindersResponse } from "@/types/database";

const CONFIG: Record<ReminderKind, { title: string; description: string }> = {
  treino: { title: "Hora do treino", description: "Mantenha consistência nos dias escolhidos." },
  refeicoes: { title: "Registrar refeições", description: "Não deixe as refeições passarem sem registro." },
  agua: { title: "Beber água", description: "Uma pausa simples para cuidar da hidratação." },
  pesagem: { title: "Pesagem", description: "Acompanhe a tendência, sem pressão diária." },
};
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function RemindersDashboard({ googleResult, googleReason }: { googleResult?: string; googleReason?: string }) {
  const [data, setData] = useState<RemindersResponse>();
  const [help, setHelp] = useState<Partial<HelpTooltipMap>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [banner, setBanner] = useState<string | undefined>(() => googleResult === "connected" ? "Google Agenda conectado com sucesso." : googleResult === "erro" ? `Não foi possível conectar ao Google${googleReason ? ` (${googleReason})` : ""}.` : undefined);
  const [reconnect, setReconnect] = useState(false);

  const load = useCallback(async () => { setLoading(true); setError(undefined); try { const envelope = await apiFetch<RemindersResponse>("/api/reminders"); setData(envelope.data); setHelp(envelope.help ?? {}); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar os lembretes."); } finally { setLoading(false); } }, []);
  useEffect(() => { const id = setTimeout(() => { void load(); if (googleResult) window.history.replaceState({}, "", "/lembretes"); }, 0); return () => clearTimeout(id); }, [load, googleResult]);

  function updateReminder(saved: CalendarReminderRow) { setData((current) => current ? { ...current, reminders: [...current.reminders.filter((item) => item.kind !== saved.kind), saved] } : current); }
  function removeReminder(kind: ReminderKind) { setData((current) => current ? { ...current, reminders: current.reminders.filter((item) => item.kind !== kind) } : current); }
  async function recoverSaved() { try { setData(await apiData<RemindersResponse>("/api/reminders")); } catch { /* mantém a mensagem local até a próxima tentativa */ } }
  function requireReconnect() { setReconnect(true); setData((current) => current ? { ...current, google: { ...current.google, connected: false, google_email: null } } : current); }
  async function disconnect() { if (!window.confirm("Desconectar o Google Agenda e remover os eventos sincronizados?")) return; try { const google = await apiData<GoogleCalendarStatus>("/api/integrations/google", { method: "DELETE" }); setData((current) => current ? { ...current, google } : current); setBanner("Google Agenda desconectado."); } catch (cause) { setBanner(cause instanceof Error ? cause.message : "Não foi possível desconectar."); } }

  if (loading) return <RemindersLoading />;
  if (error || !data) return <RemindersError message={error ?? "Lembretes indisponíveis."} retry={() => void load()} />;

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Sua rotina no celular</p><h1 className="mt-1 text-3xl font-black tracking-tight">Lembretes</h1><p className="mt-2 max-w-xl text-sm text-zinc-400">Crie eventos recorrentes no Google Agenda e receba notificações sem depender do app aberto.</p></header>
    {banner ? <div role="status" className="flex items-start justify-between gap-3 rounded-2xl border border-brand-400/20 bg-brand-500/10 p-4 text-sm text-brand-100"><span>{banner}</span><button type="button" onClick={() => setBanner(undefined)} aria-label="Fechar aviso" className="min-h-11 min-w-11 -m-3 text-zinc-400">×</button></div> : null}
    <GoogleCard google={data.google} reconnect={reconnect} onDisconnect={() => void disconnect()} />
    <div className="grid gap-4 lg:grid-cols-2">{REMINDER_KINDS.map((kind) => <ReminderCard key={`${kind}-${data.reminders.find((item) => item.kind === kind)?.updated_at ?? "new"}`} kind={kind} reminder={data.reminders.find((item) => item.kind === kind)} google={data.google} help={help} onSaved={updateReminder} onRemoved={removeReminder} onRecover={recoverSaved} onReconnect={requireReconnect} />)}</div>
  </div>;
}

function GoogleCard({ google, reconnect, onDisconnect }: { google: GoogleCalendarStatus; reconnect: boolean; onDisconnect: () => void }) {
  return <section className={`rounded-2xl border p-5 backdrop-blur-md ${google.connected ? "border-emerald-400/20 bg-emerald-500/10" : reconnect ? "border-amber-400/25 bg-amber-500/10" : "border-white/10 bg-white/10"}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">{google.connected ? <CalendarCheck className="text-emerald-300" aria-hidden /> : <Link2 className="text-brand-300" aria-hidden />}</div><div><h2 className="font-semibold">{google.connected ? "Google Agenda conectado" : reconnect ? "Reconecte o Google Agenda" : "Conecte o Google Agenda"}</h2><p className="mt-1 text-sm text-zinc-400">{google.connected ? google.google_email || "Eventos sincronizados na sua agenda." : google.available ? "Receba os lembretes diretamente no celular." : "Integração indisponível no momento."}</p></div></div>{google.connected ? <Button variant="outline" className="h-11" onClick={onDisconnect}><Link2Off aria-hidden /> Desconectar</Button> : google.available ? <Button asChild className="h-11"><a href="/api/integrations/google/connect"><Link2 aria-hidden /> {reconnect ? "Reconectar" : "Conectar Google"}</a></Button> : null}</div></section>;
}

function ReminderCard({ kind, reminder, google, help, onSaved, onRemoved, onRecover, onReconnect }: { kind: ReminderKind; reminder?: CalendarReminderRow; google: GoogleCalendarStatus; help: Partial<HelpTooltipMap>; onSaved: (row: CalendarReminderRow) => void; onRemoved: (kind: ReminderKind) => void; onRecover: () => Promise<void>; onReconnect: () => void }) {
  const [values, setValues] = useState<CalendarReminderUpsert>({ title: reminder?.title ?? CONFIG[kind].title, days_of_week: reminder?.days_of_week ?? [1, 2, 3, 4, 5], local_time: reminder?.local_time.slice(0, 5) ?? "09:00", duration_minutes: reminder?.duration_minutes ?? 30, is_active: reminder?.is_active ?? true });
  const [pending, setPending] = useState(false); const [message, setMessage] = useState<string>(); const [fields, setFields] = useState<Record<string, string[]>>({});
  function toggleDay(day: number) { setValues((current) => ({ ...current, days_of_week: current.days_of_week.includes(day) ? current.days_of_week.filter((value) => value !== day) : [...current.days_of_week, day].sort() })); }
  async function save() { setPending(true); setMessage(undefined); setFields({}); try { const saved = await apiData<CalendarReminderRow>(`/api/reminders/${kind}`, { method: "PUT", json: values }); onSaved(saved); setMessage("Lembrete salvo e sincronizado."); } catch (cause) { if (cause instanceof ApiClientError) { setFields(cause.fields ?? {}); if (cause.status === 502 || cause.code === "upstream") { setMessage("Salvo, mas o Google não respondeu. Tente sincronizar novamente."); await onRecover(); } else if (cause.status === 409 || cause.code === "conflict") { setMessage("A conexão com o Google expirou. Reconecte para sincronizar."); onReconnect(); } else setMessage(cause.message); } else setMessage("Sem conexão. Tente novamente."); } finally { setPending(false); } }
  async function remove() { if (!reminder || !window.confirm(`Remover o lembrete “${values.title}”?`)) return; setPending(true); try { await apiData<{ deleted: boolean }>(`/api/reminders/${kind}`, { method: "DELETE" }); onRemoved(kind); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Não foi possível remover."); } finally { setPending(false); } }
  const status = !google.connected ? "Conecte o Google para receber no celular" : reminder?.last_sync_error ? "Não sincronizado, tente de novo" : reminder?.synced_at ? `Sincronizado em ${formatDate(reminder.synced_at)}` : "Pronto para sincronizar";
  return <article className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl backdrop-blur-md"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-1"><h2 className="font-semibold">{CONFIG[kind].title}</h2><HelpHint help={help["calendar_reminders.kind"]} className="size-8" /></div><p className="text-xs text-zinc-500">{CONFIG[kind].description}</p></div><label className="flex min-h-11 items-center gap-2 text-xs text-zinc-400"><span>Ativo</span><input type="checkbox" checked={values.is_active ?? true} onChange={(e) => setValues((current) => ({ ...current, is_active: e.target.checked }))} className="size-5 accent-brand-600" /></label></div><div className="mt-5 space-y-4"><ReminderField label="Título" errors={fields.title}><Input className="h-11" value={values.title} onChange={(e) => setValues((current) => ({ ...current, title: e.target.value }))} /></ReminderField><div><Label>Dias da semana</Label><div className="mt-2 grid grid-cols-7 gap-1">{DAYS.map((label, day) => <button key={label} type="button" aria-pressed={values.days_of_week.includes(day)} onClick={() => toggleDay(day)} className={`min-h-11 rounded-lg text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${values.days_of_week.includes(day) ? "bg-brand-500/25 text-brand-200" : "bg-black/20 text-zinc-500"}`}>{label}</button>)}</div>{fields.days_of_week?.map((error) => <p key={error} className="mt-1 text-xs text-red-300">{error}</p>)}</div><div className="grid grid-cols-2 gap-3"><ReminderField label="Horário" errors={fields.local_time}><Input className="h-11" type="time" value={values.local_time} onChange={(e) => setValues((current) => ({ ...current, local_time: e.target.value }))} /></ReminderField><ReminderField label="Duração (min)" errors={fields.duration_minutes}><Input className="h-11" type="number" min={5} max={240} value={values.duration_minutes ?? 30} onChange={(e) => setValues((current) => ({ ...current, duration_minutes: Number(e.target.value) }))} /></ReminderField></div><p className={`text-xs ${reminder?.last_sync_error ? "text-amber-300" : "text-zinc-500"}`}>{status}</p>{message ? <p role="status" className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-zinc-300">{message}</p> : null}<div className="flex gap-2"><Button className="h-11 flex-1" disabled={pending} onClick={() => void save()}>{pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />} Salvar</Button>{reminder ? <Button variant="destructive" size="icon-lg" className="h-11 w-11" aria-label="Remover lembrete" disabled={pending} onClick={() => void remove()}><Trash2 aria-hidden /></Button> : null}</div></div></article>;
}

function ReminderField({ label, errors, children }: { label: string; errors?: string[]; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}{errors?.map((message) => <p key={message} className="text-xs text-red-300">{message}</p>)}</div>; }
function RemindersLoading() { return <div className="space-y-5" aria-label="Carregando lembretes"><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><div className="grid gap-4 lg:grid-cols-2">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-96 rounded-2xl" />)}</div></div>; }
function RemindersError({ message, retry }: { message: string; retry: () => void }) { return <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-8 text-center"><BellRing className="mx-auto size-8 text-red-200" aria-hidden /><p className="mt-3 font-semibold">Lembretes indisponíveis</p><p className="mt-2 text-sm text-red-100/80">{message}</p><Button className="mt-5 h-11" onClick={retry}><RefreshCw aria-hidden /> Tentar de novo</Button></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
