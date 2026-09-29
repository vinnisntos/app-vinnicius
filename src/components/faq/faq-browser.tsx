"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, MessageCircle, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiData } from "@/lib/api/client";
import type { FaqItemRow } from "@/types/database";

type FaqResponse = { items: FaqItemRow[]; support_whatsapp_url: string | null };

export function FaqBrowser({ backHref }: { backHref: string }) {
  const [data, setData] = useState<FaqResponse>();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const load = useCallback(async () => { setLoading(true); setError(undefined); try { setData(await apiData<FaqResponse>("/api/faq")); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar a ajuda."); } finally { setLoading(false); } }, []);
  useEffect(() => { const id = setTimeout(() => void load(), 0); return () => clearTimeout(id); }, [load]);

  const groups = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    const filtered = (data?.items ?? []).filter((item) => !normalized || `${item.question} ${item.answer} ${item.category ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalized));
    const grouped = filtered.reduce<Record<string, FaqItemRow[]>>((result, item) => {
      const category = item.category || "Geral";
      result[category] = [...(result[category] ?? []), item];
      return result;
    }, {});
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [data, query]);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(147,51,234,0.18),transparent_38%)] px-4 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))]">
    <div className="mx-auto max-w-3xl">
      <header className="flex items-start gap-3"><Button asChild variant="ghost" size="icon-lg" className="h-11 w-11 shrink-0"><Link href={backHref} aria-label="Voltar"><ArrowLeft aria-hidden /></Link></Button><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Central de ajuda</p><h1 className="mt-1 text-3xl font-black tracking-tight">Como podemos ajudar?</h1><p className="mt-2 text-sm text-zinc-400">Respostas diretas para aproveitar melhor o Life OS.</p></div></header>
      <div className="relative mt-7"><Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-zinc-500" aria-hidden /><Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-12 rounded-2xl border-white/10 bg-white/10 pl-11 backdrop-blur-md" placeholder="Buscar uma dúvida" aria-label="Buscar na ajuda" /></div>
      {loading ? <div className="mt-6 space-y-3" aria-label="Carregando ajuda">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-16 rounded-2xl" />)}</div> : error ? <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-8 text-center"><p className="font-semibold">Ajuda indisponível</p><p className="mt-2 text-sm text-red-100/80">{error}</p><Button className="mt-5 h-11" onClick={() => void load()}><RefreshCw aria-hidden /> Tentar de novo</Button></div> : groups.length ? <div className="mt-8 space-y-8">{groups.map(([category, items]) => <section key={category}><h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-400">{category}</h2><div className="space-y-2">{items?.map((item) => { const expanded = open === item.id; return <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md"><button type="button" aria-expanded={expanded} aria-controls={`faq-${item.id}`} onClick={() => setOpen(expanded ? undefined : item.id)} className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500">{item.question}<ChevronDown className={`size-4 shrink-0 transition ${expanded ? "rotate-180" : ""}`} aria-hidden /></button>{expanded ? <div id={`faq-${item.id}`} className="border-t border-white/10 px-4 py-4 text-sm leading-relaxed whitespace-pre-wrap text-zinc-300">{item.answer}</div> : null}</article>; })}</div></section>)}</div> : <div className="mt-10 rounded-2xl border border-dashed border-white/15 p-10 text-center"><p className="font-semibold">Nenhuma resposta encontrada</p><p className="mt-2 text-sm text-zinc-500">Tente buscar com outras palavras.</p></div>}
    </div>
    {data?.support_whatsapp_url ? <footer className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/85 p-3 shadow-2xl backdrop-blur-xl" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}><div className="min-w-0"><p className="text-sm font-semibold">Não achou?</p><p className="truncate text-xs text-zinc-400">Fale com a gente</p></div><Button asChild className="h-11"><a href={data.support_whatsapp_url} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden /> WhatsApp</a></Button></footer> : null}
  </main>;
}
