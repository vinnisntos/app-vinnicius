import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronLeft, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { getAccessStatus } from "@/lib/access/status";
import { signOut } from "@/lib/auth/actions";
import { requireUserId } from "@/lib/auth/session";
import { getAppSettings } from "@/lib/modules/conta/repository";

export const metadata: Metadata = { title: "Assinatura" };

function trialLabel(end: string | null, serverNow: string) {
  if (!end) return "pouco tempo";
  const minutes = Math.max(0, Math.floor((Date.parse(end) - Date.parse(serverNow)) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return days ? `${days}d ${hours}h` : `${hours}h ${minutes % 60}min`;
}

export default async function SubscribePage() {
  const userId = await requireUserId();
  const [access, settings] = await Promise.all([getAccessStatus(userId), getAppSettings()]);
  const active = access.access_state === "active" || access.access_state === "master";
  const trial = access.access_state === "trial";
  const revoked = access.access_state === "revoked";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(147,51,234,0.24),transparent_38%)] px-4 py-8 [padding-top:max(2rem,env(safe-area-inset-top))] [padding-bottom:max(2rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 flex items-center justify-between"><Logo /><form action={signOut}><Button variant="ghost" className="h-11 text-zinc-400"><LogOut aria-hidden /> Sair</Button></form></div>
        <section className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">{active ? <ShieldCheck aria-hidden /> : <Sparkles aria-hidden />}</div>
          {active ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Tudo certo</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Sua assinatura está ativa</h1>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">Você tem acesso completo ao Life OS e pode continuar cuidando da sua rotina.</p>
              <Button asChild className="mt-8 h-12 w-full"><Link href="/"><ChevronLeft aria-hidden /> Voltar ao app</Link></Button>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">{revoked ? "Acesso suspenso" : trial ? `Faltam ${trialLabel(access.trial_ends_at, access.server_now)}` : `Seu teste de ${settings?.trialDays ?? 3} dias terminou`}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">{revoked ? "Seu acesso foi suspenso pela administração" : "Sua evolução não precisa parar aqui."}</h1>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">{revoked ? "Fale com o suporte para entender o motivo e regularizar sua conta." : trial ? "Garanta seu acesso antes do fim do período gratuito." : "Assine para retomar seus registros e acompanhar sua evolução sem perder o ritmo."}</p>
              <ul className="my-7 space-y-3 text-sm text-zinc-200">
                {["Metas calóricas e de hidratação personalizadas", "Histórico de refeições, peso e hábitos", "Acesso a treinos, comunidade e próximos recursos"].map((benefit) => <li key={benefit} className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"><Check className="size-4" aria-hidden /></span>{benefit}</li>)}
              </ul>
              <CheckoutButton revoked={revoked} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
