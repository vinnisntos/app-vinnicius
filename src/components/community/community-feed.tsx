"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dumbbell, HandHeart, Lightbulb, LoaderCircle, Lock, MessageSquarePlus, MoreHorizontal, RefreshCw, Send, Share2, Users } from "lucide-react";
import { useAccess } from "@/components/access/access-provider";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { QuickChips } from "@/components/ui/quick-chips";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiData, apiFetch, newClientId } from "@/lib/api/client";
import { getTodayIsoDate } from "@/lib/date";
import type { FeedPage, FeedPost, HelpTooltipMap, MealLogRow, MealSlot, NutritionDay, PostInsert, PostVisibility, ReactionKind } from "@/types/database";

type Scope = "community" | "mine";
const MEAL_LABELS: Record<MealSlot, string> = { cafe_da_manha: "Café da manhã", almoco: "Almoço", lanche: "Lanche", jantar: "Jantar", ceia: "Ceia" };
const REACTIONS: { kind: ReactionKind; label: string; icon: typeof HandHeart }[] = [
  { kind: "apoio", label: "Apoio", icon: HandHeart },
  { kind: "forca", label: "Força", icon: Dumbbell },
  { kind: "inspirador", label: "Inspirador", icon: Lightbulb },
];

export function CommunityFeed({ userId, initialMealId, initialDate }: { userId: string; initialMealId?: string; initialDate?: string }) {
  const { role } = useAccess();
  const [scope, setScope] = useState<Scope>("community");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [help, setHelp] = useState<Partial<HelpTooltipMap>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const [error, setError] = useState<string>();
  const [composerOpen, setComposerOpen] = useState(!!initialMealId);
  const [toast, setToast] = useState<string>();

  const loadFirst = useCallback(async () => {
    setLoading(true); setError(undefined);
    try {
      const envelope = await apiFetch<FeedPage>(`/api/community/feed?scope=${scope}`);
      setPosts(envelope.data.items); setCursor(envelope.data.next_cursor); setHelp(envelope.help ?? {});
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar a comunidade."); }
    finally { setLoading(false); }
  }, [scope]);

  useEffect(() => { const id = setTimeout(() => void loadFirst(), 0); return () => clearTimeout(id); }, [loadFirst]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(undefined), 3500); return () => clearTimeout(id); }, [toast]);

  async function loadMore() {
    if (!cursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true; setLoadingMore(true);
    try {
      const next = await apiData<FeedPage>(`/api/community/feed?scope=${scope}&cursor=${encodeURIComponent(cursor)}`);
      setPosts((current) => [...current, ...next.items.filter((item) => !current.some((existing) => existing.post.id === item.post.id))]);
      setCursor(next.next_cursor);
    } catch (cause) { setToast(cause instanceof Error ? cause.message : "Não foi possível carregar mais posts."); }
    finally { loadingMoreRef.current = false; setLoadingMore(false); }
  }

  async function reactTo(item: FeedPost, kind: ReactionKind) {
    const removing = item.my_reaction === kind;
    const previous = item;
    const optimistic = optimisticReaction(item, removing ? null : kind);
    setPosts((current) => current.map((post) => post.post.id === item.post.id ? optimistic : post));
    try {
      const saved = await apiData<FeedPost>(`/api/community/posts/${item.post.id}/reaction`, { method: removing ? "DELETE" : "PUT", ...(removing ? {} : { json: { kind } }) });
      setPosts((current) => current.map((post) => post.post.id === item.post.id ? saved : post));
    } catch (cause) {
      setPosts((current) => current.map((post) => post.post.id === item.post.id ? previous : post));
      setToast(cause instanceof Error ? cause.message : "Não foi possível reagir.");
    }
  }

  async function removePost(item: FeedPost) {
    try {
      await apiData<{ deleted: boolean }>(`/api/community/posts/${item.post.id}`, { method: "DELETE" });
      setPosts((current) => current.filter((post) => post.post.id !== item.post.id));
      setToast("Publicação apagada.");
    } catch (cause) { setToast(cause instanceof Error ? cause.message : "Não foi possível apagar."); }
  }

  async function moderate(item: FeedPost, reason: string) {
    const hiding = !item.post.is_hidden;
    try {
      const post = await apiData<FeedPost["post"]>(`/api/admin/posts/${item.post.id}`, { method: "PATCH", json: { is_hidden: hiding, hidden_reason: hiding ? (reason || null) : null } });
      setPosts((current) => current.map((currentItem) => currentItem.post.id === item.post.id ? { ...currentItem, post } : currentItem));
      setToast(hiding ? "Publicação ocultada." : "Publicação reexibida.");
    } catch (cause) { setToast(cause instanceof Error ? cause.message : "Não foi possível moderar."); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Impulso coletivo</p><h1 className="mt-1 text-3xl font-black tracking-tight">Comunidade</h1><p className="mt-2 text-sm text-zinc-300">Compartilhe vitórias reais e fortaleça quem está no mesmo caminho.</p></header>
      <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-md" role="tablist" aria-label="Filtro do feed">
        <button type="button" role="tab" aria-selected={scope === "community"} onClick={() => setScope("community")} className={`min-h-11 rounded-xl text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${scope === "community" ? "bg-brand-500/20 text-brand-200" : "text-zinc-400"}`}>Comunidade</button>
        <button type="button" role="tab" aria-selected={scope === "mine"} onClick={() => setScope("mine")} className={`min-h-11 rounded-xl text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${scope === "mine" ? "bg-brand-500/20 text-brand-200" : "text-zinc-400"}`}>Meus posts</button>
      </div>

      {loading ? <FeedLoading /> : error ? <FeedError message={error} retry={() => void loadFirst()} /> : posts.length ? <div className="space-y-4">{posts.map((item) => <PostCard key={item.post.id} item={item} canDelete={item.author.id === userId || role === "master"} master={role === "master"} onReact={reactTo} onDelete={removePost} onModerate={moderate} />)}{cursor ? <LoadMore onVisible={() => void loadMore()} loading={loadingMore} /> : <p className="py-4 text-center text-xs text-zinc-500">Você chegou ao começo dessa história.</p>}</div> : <EmptyFeed mine={scope === "mine"} onCreate={() => setComposerOpen(true)} />}

      <PostComposer open={composerOpen} onOpenChange={setComposerOpen} initialMealId={initialMealId} initialDate={initialDate} help={help} onCreated={(post) => { setPosts((current) => [post, ...current]); setScope("mine"); setToast("Publicação compartilhada."); }} />
      <Button data-primary-action="new-post" size="icon-lg" aria-label="Criar publicação" className="fixed right-5 z-30 h-14 w-14 rounded-full bg-success-500 text-zinc-950 shadow-xl hover:bg-success-500/85 [bottom:calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-6" onClick={() => setComposerOpen(true)}><MessageSquarePlus aria-hidden /></Button>
      {toast ? <div role="status" className="fixed bottom-24 left-1/2 z-[90] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-900/95 p-4 text-center text-sm shadow-2xl backdrop-blur-xl md:bottom-6">{toast}</div> : null}
    </div>
  );
}

function PostCard({ item, canDelete, master, onReact, onDelete, onModerate }: { item: FeedPost; canDelete: boolean; master: boolean; onReact: (item: FeedPost, kind: ReactionKind) => Promise<void>; onDelete: (item: FeedPost) => Promise<void>; onModerate: (item: FeedPost, reason: string) => Promise<void> }) {
  const [menu,setMenu]=useState(false); const [confirm,setConfirm]=useState<"delete"|"moderate">(); const [reason,setReason]=useState(item.post.hidden_reason??"");
  const name = item.author.full_name || "Pessoa da comunidade";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <article className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl backdrop-blur-md">
    <header className="flex items-start gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-900 text-sm font-bold">{initials}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold">{name}</h2>{item.post.visibility === "private" ? <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs text-zinc-300"><Lock className="mr-1 inline size-3" aria-hidden />Só você</span> : null}</div><p className="text-xs text-zinc-300">{relativeTime(item.post.created_at)}</p></div>{canDelete||master?<div className="relative"><Button variant="ghost" size="icon-lg" aria-label="Ações da publicação" aria-expanded={menu} onClick={()=>setMenu(!menu)}><MoreHorizontal aria-hidden /></Button>{menu?<div className="absolute right-0 top-11 z-10 min-w-40 rounded-xl border border-white/15 bg-zinc-900 p-1 shadow-xl">{canDelete?<button className="min-h-11 w-full rounded-lg px-3 text-left text-sm text-rose-200" onClick={()=>{setConfirm("delete");setMenu(false);}}>Apagar</button>:null}{master?<button className="min-h-11 w-full rounded-lg px-3 text-left text-sm text-zinc-200" onClick={()=>{setConfirm("moderate");setMenu(false);}}>{item.post.is_hidden?"Reexibir":"Ocultar"}</button>:null}</div>:null}</div>:null}</header>
    {item.post.is_hidden ? <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100"><strong>Oculto pela moderação</strong>{item.post.hidden_reason ? <p className="mt-1 text-xs text-amber-100/75">{item.post.hidden_reason}</p> : null}</div> : null}
    {item.post.body ? <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{item.post.body}</p> : null}
    {item.meal ? <MealPreview meal={item.meal} /> : null}
    <div className="mt-5 grid grid-cols-3 gap-1 border-t border-white/10 pt-3">{REACTIONS.map(({ kind, label, icon: Icon }) => <button key={kind} type="button" aria-pressed={item.my_reaction === kind} onClick={() => void onReact(item, kind)} className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500 ${item.my_reaction === kind ? "bg-brand-500/20 text-brand-200" : "text-zinc-300 hover:bg-white/5"}`}><Icon className="size-4" aria-hidden /><span>{label}</span><span className="text-xs text-zinc-300">{item.reaction_counts[kind] ?? 0}</span></button>)}</div>
    <Sheet open={!!confirm} onOpenChange={v=>{if(!v)setConfirm(undefined);}}><SheetContent side="bottom" className="rounded-t-3xl border-white/10 bg-zinc-950 p-5"><SheetHeader className="px-0"><SheetTitle>{confirm==="delete"?"Apagar publicação?":item.post.is_hidden?"Reexibir publicação?":"Ocultar publicação?"}</SheetTitle><SheetDescription>{confirm==="delete"?"Esta ação não pode ser desfeita.":"Confirme a ação de moderação."}</SheetDescription></SheetHeader>{confirm==="moderate"&&!item.post.is_hidden?<Textarea aria-label="Motivo opcional" placeholder="Motivo da ocultação (opcional)" value={reason} onChange={e=>setReason(e.target.value)}/>:null}<SheetFooter className="px-0"><Button variant="outline" onClick={()=>setConfirm(undefined)}>Cancelar</Button><Button variant={confirm==="delete"?"destructive":"default"} onClick={()=>{if(confirm==="delete")void onDelete(item);else void onModerate(item,reason);setConfirm(undefined);}}>Confirmar</Button></SheetFooter></SheetContent></Sheet>
  </article>;
}

function MealPreview({ meal }: { meal: FeedPost["meal"] & {} }) {
  return <div className="mt-4 rounded-xl border border-brand-400/15 bg-brand-500/10 p-3"><div className="flex items-center gap-2 text-sm font-medium text-brand-200"><Share2 className="size-4" aria-hidden />{MEAL_LABELS[meal.meal_slot]}</div><p className="mt-1 text-sm text-zinc-300">{meal.description || "Refeição registrada"}</p><div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-300"><span>{meal.calories ?? 0} kcal</span><span>P {meal.protein_g ?? 0}g</span><span>C {meal.carbs_g ?? 0}g</span><span>G {meal.fat_g ?? 0}g</span></div></div>;
}

function PostComposer({ open, onOpenChange, initialMealId, initialDate, help, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; initialMealId?: string; initialDate?: string; help: Partial<HelpTooltipMap>; onCreated: (post: FeedPost) => void }) {
  const [body, setBody] = useState(""); const [visibility, setVisibility] = useState<PostVisibility>("public"); const [meals, setMeals] = useState<MealLogRow[]>([]); const [mealId, setMealId] = useState<string | null>(initialMealId ?? null); const [pending, setPending] = useState(false); const [error, setError] = useState<string>(); const [fields, setFields] = useState<Record<string, string[]>>({});
  useEffect(() => { if (!open) return; const id = setTimeout(() => { void apiData<NutritionDay>(`/api/nutrition/day?date=${initialDate ?? getTodayIsoDate()}`).then((day) => { const available = day.meals.flatMap((entry) => entry.meal ? [entry.meal] : []); setMeals(available); if (initialMealId && available.some((meal) => meal.id === initialMealId)) setMealId(initialMealId); }).catch(() => setMeals([])); }, 0); return () => clearTimeout(id); }, [open, initialMealId, initialDate]);
  async function submit(event: React.FormEvent) { event.preventDefault(); setPending(true); setError(undefined); setFields({}); const payload: PostInsert = { id: newClientId(), body: body.trim() || null, meal_log_id: mealId, visibility }; try { const created = await apiData<FeedPost>("/api/community/posts", { method: "POST", json: payload }); onCreated(created); setBody(""); setMealId(null); onOpenChange(false); } catch (cause) { if (cause instanceof ApiClientError) { setFields(cause.fields ?? {}); if (cause.status === 429 || cause.code === "rate_limited") setError("Você atingiu o limite diário de publicações. Tente novamente amanhã."); else setError(cause.message); } else setError("Sem conexão. Tente novamente."); } finally { setPending(false); } }
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl border-white/10 bg-zinc-950/95 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2"><SheetHeader className="px-0"><SheetTitle>Compartilhar evolução</SheetTitle><SheetDescription>Uma vitória simples pode ser o impulso de alguém.</SheetDescription></SheetHeader><QuickChips tone="success" options={["Bati a meta de água", "Treino feito", "Dia no plano", "Aplicação feita e me sentindo bem"].map((value) => ({ value, label: value }))} onPick={setBody} /><form onSubmit={submit} className="space-y-5"><div className="space-y-2"><Label htmlFor="post-body">O que você quer compartilhar?</Label><Textarea id="post-body" value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={2000} placeholder="Conte como foi seu dia…" aria-invalid={!!fields.body} />{fields.body?.map((message) => <p key={message} className="text-xs text-red-300">{message}</p>)}</div>{meals.length ? <div className="space-y-2"><Label>Refeição de hoje</Label><div className="space-y-2"><button type="button" onClick={() => setMealId(null)} className={`min-h-11 w-full rounded-xl border px-3 text-left text-sm ${mealId === null ? "border-brand-400/40 bg-brand-500/15" : "border-white/10 bg-white/5"}`}>Sem refeição anexada</button>{meals.map((meal) => <button key={meal.id} type="button" onClick={() => setMealId(meal.id)} className={`min-h-11 w-full rounded-xl border px-3 text-left text-sm ${mealId === meal.id ? "border-brand-400/40 bg-brand-500/15" : "border-white/10 bg-white/5"}`}>{MEAL_LABELS[meal.meal_slot]} · {meal.description || `${meal.calories ?? 0} kcal`}</button>)}</div></div> : null}<div className="space-y-2"><div className="flex min-h-8 items-center"><Label>Visibilidade</Label><HelpHint help={help["posts.visibility"]} className="size-8" /></div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setVisibility("public")} className={`min-h-11 rounded-xl border text-sm ${visibility === "public" ? "border-brand-400/40 bg-brand-500/15" : "border-white/10 bg-white/5"}`}><Users className="mr-2 inline size-4" aria-hidden />Público</button><button type="button" onClick={() => setVisibility("private")} className={`min-h-11 rounded-xl border text-sm ${visibility === "private" ? "border-brand-400/40 bg-brand-500/15" : "border-white/10 bg-white/5"}`}><Lock className="mr-2 inline size-4" aria-hidden />Só eu</button></div></div>{error ? <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}<SheetFooter className="px-0"><Button className="h-12 w-full bg-success-500 text-zinc-950 hover:bg-success-500/85" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Send aria-hidden />}{pending ? "Publicando…" : "Publicar"}</Button></SheetFooter></form></SheetContent></Sheet>;
}

function LoadMore({ onVisible, loading }: { onVisible: () => void; loading: boolean }) { const ref = useRef<HTMLDivElement>(null); useEffect(() => { const node = ref.current; if (!node) return; const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) onVisible(); }, { rootMargin: "300px" }); observer.observe(node); return () => observer.disconnect(); }, [onVisible]); return <div ref={ref} className="flex h-16 items-center justify-center">{loading ? <LoaderCircle className="animate-spin text-brand-300" aria-label="Carregando mais publicações" /> : null}</div>; }
function FeedLoading() { return <div className="space-y-4" aria-label="Carregando comunidade">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-64 rounded-2xl" />)}</div>; }
function FeedError({ message, retry }: { message: string; retry: () => void }) { return <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-8 text-center"><p className="font-semibold">Comunidade indisponível</p><p className="mt-2 text-sm text-red-100/80">{message}</p><Button className="mt-5 h-11" onClick={retry}><RefreshCw aria-hidden /> Tentar de novo</Button></div>; }
function EmptyFeed({ mine, onCreate }: { mine: boolean; onCreate: () => void }) { return <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center"><Users className="mx-auto size-9 text-zinc-500" aria-hidden /><p className="mt-4 font-semibold">{mine ? "Você ainda não publicou" : "A comunidade está começando"}</p><p className="mt-1 text-sm text-zinc-500">Compartilhe uma refeição ou uma pequena vitória.</p><Button className="mt-5 h-11" onClick={onCreate}><MessageSquarePlus aria-hidden /> Criar publicação</Button></div>; }
function optimisticReaction(item: FeedPost, next: ReactionKind | null): FeedPost { const counts = { ...item.reaction_counts }; if (item.my_reaction) counts[item.my_reaction] = Math.max(0, (counts[item.my_reaction] ?? 0) - 1); if (next) counts[next] = (counts[next] ?? 0) + 1; return { ...item, reaction_counts: counts, my_reaction: next }; }
function relativeTime(value: string) { const diff = Date.parse(value) - Date.now(); const abs = Math.abs(diff); const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" }); if (abs < 60_000) return formatter.format(Math.round(diff / 1000), "second"); if (abs < 3_600_000) return formatter.format(Math.round(diff / 60_000), "minute"); if (abs < 86_400_000) return formatter.format(Math.round(diff / 3_600_000), "hour"); if (abs < 604_800_000) return formatter.format(Math.round(diff / 86_400_000), "day"); return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value)); }
