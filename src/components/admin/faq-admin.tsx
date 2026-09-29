"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, LoaderCircle, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiData } from "@/lib/api/client";
import type { FaqItemRow } from "@/types/database";

export function FaqAdmin() {
  const [items, setItems] = useState<FaqItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<FaqItemRow | null | undefined>();
  const load = useCallback(async () => { setLoading(true); setError(undefined); try { setItems(await apiData<FaqItemRow[]>("/api/admin/faq")); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar o FAQ."); } finally { setLoading(false); } }, []);
  useEffect(() => { const id = setTimeout(() => void load(), 0); return () => clearTimeout(id); }, [load]);

  async function toggle(item: FaqItemRow) {
    const previous = item;
    setItems((current) => current.map((row) => row.id === item.id ? { ...row, is_published: !row.is_published } : row));
    try {
      const saved = await apiData<FaqItemRow>(`/api/admin/faq/${item.id}`, { method: "PATCH", json: { is_published: !item.is_published } });
      setItems((current) => current.map((row) => row.id === item.id ? saved : row));
    } catch (cause) { setItems((current) => current.map((row) => row.id === item.id ? previous : row)); setError(cause instanceof Error ? cause.message : "Não foi possível alterar a publicação."); }
  }

  async function remove(item: FaqItemRow) {
    if (!window.confirm(`Apagar a pergunta “${item.question}”?`)) return;
    try { await apiData<{ deleted: boolean }>(`/api/admin/faq/${item.id}`, { method: "DELETE" }); setItems((current) => current.filter((row) => row.id !== item.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível apagar."); }
  }

  return <section className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl backdrop-blur-md">
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">FAQ</h2><p className="mt-1 text-sm text-zinc-400">Perguntas públicas e rascunhos da central de ajuda.</p></div><Button className="h-11" onClick={() => setEditing(null)}><Plus aria-hidden /> Nova</Button></div>
    {loading ? <div className="mt-5 space-y-2">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 rounded-xl" />)}</div> : error && !items.length ? <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-5 text-center"><p className="text-sm text-red-100">{error}</p><Button variant="outline" className="mt-3 h-11" onClick={() => void load()}><RefreshCw aria-hidden /> Tentar de novo</Button></div> : items.length ? <div className="mt-5 space-y-2">{items.map((item) => <article key={item.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/15 p-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{item.question}</p><span className={`rounded-full px-2 py-0.5 text-[10px] ${item.is_published ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-400"}`}>{item.is_published ? "Publicado" : "Rascunho"}</span></div><p className="mt-1 line-clamp-2 text-xs text-zinc-500">{item.category || "Geral"} · ordem {item.order_index} · {item.answer}</p></div><div className="flex shrink-0"><Button variant="ghost" size="icon-lg" aria-label={item.is_published ? "Despublicar" : "Publicar"} onClick={() => void toggle(item)}>{item.is_published ? <EyeOff aria-hidden /> : <Eye aria-hidden />}</Button><Button variant="ghost" size="icon-lg" aria-label="Editar pergunta" onClick={() => setEditing(item)}><Pencil aria-hidden /></Button><Button variant="ghost" size="icon-lg" aria-label="Apagar pergunta" onClick={() => void remove(item)}><Trash2 aria-hidden /></Button></div></article>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-400">Nenhuma pergunta cadastrada.</div>}
    {error && items.length ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
    {editing !== undefined ? <FaqEditor key={editing?.id ?? "new"} item={editing} onClose={() => setEditing(undefined)} onSaved={(saved) => { setItems((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved].sort((a, b) => a.order_index - b.order_index)); setEditing(undefined); }} /> : null}
  </section>;
}

function FaqEditor({ item, onClose, onSaved }: { item: FaqItemRow | null; onClose: () => void; onSaved: (item: FaqItemRow) => void }) {
  const [values, setValues] = useState({ question: item?.question ?? "", answer: item?.answer ?? "", category: item?.category ?? "", order_index: item?.order_index ?? 0, is_published: item?.is_published ?? true });
  const [pending, setPending] = useState(false); const [error, setError] = useState<string>(); const [fields, setFields] = useState<Record<string, string[]>>({});
  async function submit(event: React.FormEvent) { event.preventDefault(); setPending(true); setError(undefined); setFields({}); try { const saved = await apiData<FaqItemRow>(item ? `/api/admin/faq/${item.id}` : "/api/admin/faq", { method: item ? "PATCH" : "POST", json: { ...values, category: values.category.trim() || null } }); onSaved(saved); } catch (cause) { if (cause instanceof ApiClientError) setFields(cause.fields ?? {}); setError(cause instanceof Error ? cause.message : "Não foi possível salvar."); } finally { setPending(false); } }
  return <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}><SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl border-white/10 bg-zinc-950/95 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[32rem] sm:rounded-none"><SheetHeader className="px-0"><SheetTitle>{item ? "Editar pergunta" : "Nova pergunta"}</SheetTitle><SheetDescription>O conteúdo publicado aparece imediatamente em /faq.</SheetDescription></SheetHeader><form onSubmit={submit} className="space-y-4"><FaqField label="Pergunta" errors={fields.question}><Input className="h-11" required value={values.question} onChange={(e) => setValues((current) => ({ ...current, question: e.target.value }))} /></FaqField><FaqField label="Resposta" errors={fields.answer}><Textarea rows={8} required value={values.answer} onChange={(e) => setValues((current) => ({ ...current, answer: e.target.value }))} /></FaqField><div className="grid grid-cols-[1fr_7rem] gap-3"><FaqField label="Categoria" errors={fields.category}><Input className="h-11" value={values.category} onChange={(e) => setValues((current) => ({ ...current, category: e.target.value }))} placeholder="Geral" /></FaqField><FaqField label="Ordem" errors={fields.order_index}><Input className="h-11" type="number" min={0} max={1000} value={values.order_index} onChange={(e) => setValues((current) => ({ ...current, order_index: Number(e.target.value) }))} /></FaqField></div><label className="flex min-h-12 items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 text-sm"><span>Publicar agora</span><input type="checkbox" checked={values.is_published} onChange={(e) => setValues((current) => ({ ...current, is_published: e.target.checked }))} className="size-5 accent-brand-600" /></label>{error ? <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}<SheetFooter className="px-0"><Button className="h-12 w-full" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}{pending ? "Salvando…" : "Salvar pergunta"}</Button></SheetFooter></form></SheetContent></Sheet>;
}

function FaqField({ label, errors, children }: { label: string; errors?: string[]; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}{errors?.map((message) => <p key={message} className="text-xs text-red-300">{message}</p>)}</div>; }
