"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, LoaderCircle, RefreshCw, Search, Settings, ShieldAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { FaqAdmin } from "@/components/admin/faq-admin";
import { TipsAdmin } from "@/components/admin/tips-admin";
import { ApiClientError, apiData } from "@/lib/api/client";
import { ACCESS_STATES, type AccessState, type AdminSubscriptionAction, type AdminSubscriptionItem, type AppSettingsRow, type SubscriptionRow } from "@/types/database";

type ListResponse = { items: AdminSubscriptionItem[]; total: number; page: number; page_size: number };
const LABELS: Record<AccessState, string> = { master: "Master", active: "Ativos", trial: "Em teste", expired: "Expirados", revoked: "Revogados" };
const COLORS: Record<AccessState, string> = { master: "text-brand-strong bg-brand-soft", active: "text-success bg-success-soft", trial: "text-warning bg-warning-soft", expired: "text-text-secondary bg-surface-muted", revoked: "text-danger bg-danger-soft" };

export function AdminPanel() {
  const [overview, setOverview] = useState<Record<AccessState, number>>();
  const [list, setList] = useState<ListResponse>();
  const [settings, setSettings] = useState<AppSettingsRow>();
  const [state, setState] = useState<AccessState | "">("");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selected, setSelected] = useState<AdminSubscriptionItem>();

  useEffect(() => { const id = setTimeout(() => { setDebounced(query); setPage(1); }, 350); return () => clearTimeout(id); }, [query]);
  const loadList = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), page_size: "20" });
    if (state) params.set("state", state); if (debounced) params.set("q", debounced);
    setList(await apiData<ListResponse>(`/api/admin/subscriptions?${params}`));
  }, [state, debounced, page]);
  const loadAll = useCallback(async () => {
    setLoading(true); setError(undefined);
    try {
      const [nextOverview, nextSettings] = await Promise.all([apiData<Record<AccessState, number>>("/api/admin/overview"), apiData<AppSettingsRow>("/api/admin/settings"), loadList()]);
      setOverview(nextOverview); setSettings(nextSettings);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar o painel."); }
    finally { setLoading(false); }
  }, [loadList]);
  useEffect(() => { const id = setTimeout(() => void loadAll(), 0); return () => clearTimeout(id); }, [loadAll]);

  if (loading && !list) return <AdminLoading />;
  if (error && !list) return <AdminError message={error} retry={() => void loadAll()} />;

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-strong">Área restrita</p><h1 className="mt-1 text-3xl font-black tracking-tight">Painel master</h1><p className="mt-2 text-sm text-text-tertiary">Assinaturas, testes e configurações comerciais.</p></header>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{ACCESS_STATES.map((key) => <button key={key} type="button" onClick={() => { setState(state === key ? "" : key); setPage(1); }} className={`min-h-24 rounded-2xl border p-4 text-left backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${state === key ? "border-brand-400/40 bg-brand-soft" : "border-glass-border bg-glass"}`}><span className="block text-2xl font-black">{overview?.[key] ?? 0}</span><span className="text-xs text-text-tertiary">{LABELS[key]}</span></button>)}</div>

    <section className="rounded-2xl border border-glass-border bg-glass p-4 shadow-xl backdrop-blur-md">
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden /><Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-12 pl-10" placeholder="Buscar por nome, e-mail ou telefone" aria-label="Buscar assinaturas" /></div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1"><FilterChip active={!state} onClick={() => { setState(""); setPage(1); }}>Todos</FilterChip>{ACCESS_STATES.map((key) => <FilterChip key={key} active={state === key} onClick={() => { setState(key); setPage(1); }}>{LABELS[key]}</FilterChip>)}</div>
    </section>

    <SubscriptionList data={list} onSelect={setSelected} />
    {list ? <div className="flex items-center justify-between text-sm text-text-tertiary"><span>{list.total} resultado(s)</span><div className="flex items-center gap-2"><Button variant="outline" size="icon-lg" aria-label="Página anterior" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft aria-hidden /></Button><span>Página {page}</span><Button variant="outline" size="icon-lg" aria-label="Próxima página" disabled={page * list.page_size >= list.total} onClick={() => setPage((p) => p + 1)}><ChevronRight aria-hidden /></Button></div></div> : null}
    <TipsAdmin />
    <FaqAdmin />
    {settings ? <SettingsForm initial={settings} onSaved={setSettings} /> : null}
    <SubscriptionActions key={selected?.profile.id ?? "none"} item={selected} onClose={() => setSelected(undefined)} onSaved={async () => { setSelected(undefined); await loadAll(); }} />
  </div>;
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${active ? "border-brand-400/40 bg-brand-soft text-brand-strong" : "border-glass-border bg-surface-muted text-text-tertiary"}`}>{children}</button>; }

function StateBadge({ state }: { state: AccessState }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${COLORS[state]}`}>{LABELS[state]}</span>; }

function SubscriptionList({ data, onSelect }: { data?: ListResponse; onSelect: (item: AdminSubscriptionItem) => void }) {
  if (!data) return <Skeleton className="h-72 rounded-2xl" />;
  if (!data.items.length) return <div className="rounded-2xl border border-dashed border-glass-border p-10 text-center"><Users className="mx-auto size-8 text-text-tertiary" aria-hidden /><p className="mt-3 font-medium">Nenhuma assinatura encontrada</p><p className="mt-1 text-sm text-text-tertiary">Ajuste os filtros ou a busca.</p></div>;
  return <>
    <div className="space-y-3 md:hidden">{data.items.map((item) => <button key={item.profile.id} type="button" onClick={() => onSelect(item)} className="w-full rounded-2xl border border-glass-border bg-glass p-4 text-left backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{item.profile.full_name || "Sem nome"}</p><p className="truncate text-xs text-text-tertiary">{item.profile.email}</p></div><StateBadge state={item.access_state} /></div><p className="mt-3 text-xs text-text-tertiary">Criado em {formatDate(item.profile.created_at)}</p></button>)}</div>
    <div className="hidden overflow-hidden rounded-2xl border border-glass-border bg-glass md:block"><table className="w-full text-left text-sm"><thead className="bg-glass text-xs uppercase tracking-wide text-text-tertiary"><tr><th className="p-4">Usuário</th><th className="p-4">Estado</th><th className="p-4">Fim do trial</th><th className="p-4 text-right">Ação</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.profile.id} className="border-t border-glass-border"><td className="p-4"><p className="font-medium">{item.profile.full_name || "Sem nome"}</p><p className="text-xs text-text-tertiary">{item.profile.email}</p></td><td className="p-4"><StateBadge state={item.access_state} /></td><td className="p-4 text-text-tertiary">{item.subscription?.trial_ends_at ? formatDate(item.subscription.trial_ends_at) : "—"}</td><td className="p-4 text-right"><Button variant="outline" className="h-10" onClick={() => onSelect(item)}>Gerenciar</Button></td></tr>)}</tbody></table></div>
  </>;
}

function SubscriptionActions({ item, onClose, onSaved }: { item?: AdminSubscriptionItem; onClose: () => void; onSaved: () => Promise<void> }) {
  const [notes, setNotes] = useState(item?.subscription?.admin_notes ?? ""); const [confirmRevoke, setConfirmRevoke] = useState(false); const [days, setDays] = useState(3); const [pending, setPending] = useState(false); const [error, setError] = useState<string>(); const [fields, setFields] = useState<Record<string, string[]>>({});
  if (!item) return null;
  async function apply(action: AdminSubscriptionAction) { if (action.action === "revoke" && !confirmRevoke) { setConfirmRevoke(true); return; } setPending(true); setError(undefined); setFields({}); try { await apiData<SubscriptionRow>(`/api/admin/subscriptions/${item!.profile.id}`, { method: "PATCH", json: action }); await onSaved(); } catch (cause) { if (cause instanceof ApiClientError) setFields(cause.fields ?? {}); setError(cause instanceof Error ? cause.message : "Não foi possível atualizar."); } finally { setPending(false); } }
  return <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}><SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl border-glass-border bg-surface-solid p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[28rem] sm:rounded-none">
    <SheetHeader className="px-0"><SheetTitle>{item.profile.full_name || "Assinatura"}</SheetTitle><SheetDescription>{item.profile.email} · {LABELS[item.access_state]}</SheetDescription></SheetHeader>
    <div className="space-y-5">{confirmRevoke ? <p role="alert" className="rounded-xl bg-danger-500/15 p-3 text-sm text-danger">Confirme a revogação do acesso deste usuário.</p> : null}<div className="grid grid-cols-2 gap-2"><Button className="h-11" disabled={pending} onClick={() => void apply({ action: "approve", admin_notes: notes })}><CheckCircle2 aria-hidden /> Aprovar</Button><Button variant="destructive" className="h-11" disabled={pending} onClick={() => void apply({ action: "revoke", admin_notes: notes })}><ShieldAlert aria-hidden /> {confirmRevoke ? "Confirmar revogação" : "Revogar"}</Button></div><div className="space-y-2"><Label htmlFor="trial-days">Estender trial (dias)</Label><div className="flex gap-2"><Input id="trial-days" type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-11" aria-invalid={!!fields.days} /><Button variant="secondary" className="h-11" disabled={pending} onClick={() => void apply({ action: "extend_trial", days, admin_notes: notes })}><Clock3 aria-hidden /> Estender</Button></div>{fields.days?.map((message) => <p key={message} className="text-xs text-danger">{message}</p>)}</div><div className="space-y-2"><Label htmlFor="admin-notes">Notas internas</Label><Textarea id="admin-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} /><Button variant="outline" className="h-11 w-full" disabled={pending} onClick={() => void apply({ action: "set_notes", admin_notes: notes })}>Salvar notas</Button></div>{error ? <p role="alert" className="rounded-xl border border-danger bg-danger-soft p-3 text-sm text-danger">{error}</p> : null}</div>
    <SheetFooter className="px-0">{pending ? <span className="flex items-center gap-2 text-sm text-text-tertiary"><LoaderCircle className="size-4 animate-spin" /> Atualizando…</span> : null}</SheetFooter>
  </SheetContent></Sheet>;
}

function SettingsForm({ initial, onSaved }: { initial: AppSettingsRow; onSaved: (settings: AppSettingsRow) => void }) {
  const [values, setValues] = useState(initial); const [pending, setPending] = useState(false); const [message, setMessage] = useState<string>(); const [fields, setFields] = useState<Record<string, string[]>>({});
  async function submit(event: React.FormEvent) { event.preventDefault(); setPending(true); setMessage(undefined); setFields({}); try { const saved = await apiData<AppSettingsRow>("/api/admin/settings", { method: "PATCH", json: { trial_days: values.trial_days, support_whatsapp: values.support_whatsapp || null, support_whatsapp_message: values.support_whatsapp_message || null, asaas_checkout_url: values.asaas_checkout_url || null } }); onSaved(saved); setValues(saved); setMessage("Configurações salvas."); } catch (cause) { if (cause instanceof ApiClientError) setFields(cause.fields ?? {}); setMessage(cause instanceof Error ? cause.message : "Não foi possível salvar."); } finally { setPending(false); } }
  return <form onSubmit={submit} className="rounded-2xl border border-glass-border bg-glass p-5 shadow-xl backdrop-blur-md"><div className="mb-5 flex items-center gap-2"><Settings className="size-5 text-brand-strong" aria-hidden /><h2 className="font-semibold">Configurações</h2></div><div className="grid gap-4 sm:grid-cols-2"><AdminField label="Dias de teste" errors={fields.trial_days}><Input className="h-11" type="number" min={0} max={30} value={values.trial_days} onChange={(e) => setValues((v) => ({ ...v, trial_days: Number(e.target.value) }))} /></AdminField><AdminField label="WhatsApp com DDI" errors={fields.support_whatsapp}><Input className="h-11" inputMode="tel" value={values.support_whatsapp ?? ""} onChange={(e) => setValues((v) => ({ ...v, support_whatsapp: e.target.value }))} /></AdminField><AdminField label="Mensagem do WhatsApp" errors={fields.support_whatsapp_message}><Input className="h-11" value={values.support_whatsapp_message ?? ""} onChange={(e) => setValues((v) => ({ ...v, support_whatsapp_message: e.target.value }))} /></AdminField><AdminField label="URL do checkout Asaas" errors={fields.asaas_checkout_url}><Input className="h-11" type="url" value={values.asaas_checkout_url ?? ""} onChange={(e) => setValues((v) => ({ ...v, asaas_checkout_url: e.target.value }))} /></AdminField></div>{message ? <p role="status" className="mt-4 text-sm text-text-secondary">{message}</p> : null}<Button className="mt-5 h-11" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}{pending ? "Salvando…" : "Salvar configurações"}</Button></form>;
}

function AdminField({ label, errors, children }: { label: string; errors?: string[]; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}{errors?.map((message) => <p key={message} className="text-xs text-danger">{message}</p>)}</div>; }
function AdminLoading() { return <div className="space-y-5"><Skeleton className="h-20 rounded-2xl" /><div className="grid grid-cols-2 gap-3 md:grid-cols-5">{ACCESS_STATES.map((state) => <Skeleton key={state} className="h-24 rounded-2xl" />)}</div><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>; }
function AdminError({ message, retry }: { message: string; retry: () => void }) { return <div className="rounded-2xl border border-danger bg-danger-soft p-8 text-center"><p className="font-semibold">Painel indisponível</p><p className="mt-2 text-sm text-danger">{message}</p><Button className="mt-5 h-11" onClick={retry}><RefreshCw aria-hidden /> Tentar de novo</Button></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value)); }
