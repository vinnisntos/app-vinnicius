import type { Metadata } from "next";
import Link from "next/link";
import { Beef, CircleHelp, Droplets, Dumbbell, FileDown, MessageCircle, Scale, ShieldCheck, Stethoscope, Syringe, Users } from "lucide-react";
import { APP_CONFIG } from "@/lib/app-config";
import { formatBRL } from "@/lib/format";
import { monthlyEquivalent, PLAN_IDS, PLANS } from "@/lib/modules/billing/plans";
import { listPlans } from "@/lib/modules/billing/service";
import { getAppSettings, getPublishedFaq } from "@/lib/modules/conta/repository";
import { toPublicSettings } from "@/lib/api/mappers";
import { AppPreviews } from "@/components/site/app-previews";
import { SiteStickyCta } from "@/components/site/site-sticky-cta";
import { UtmCapture } from "@/components/site/utm-capture";
import type { BillingPlan, PlansResponse } from "@/types/database";

const title = "Começou a caneta? Não perca músculo junto com o peso";
const description = "Registre aplicações, proteína, água e peso em um só lugar e leve tudo organizado para a consulta. Para quem faz tratamento para emagrecer com prescrição médica.";
export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: APP_CONFIG.url },
  openGraph: { title: `${APP_CONFIG.name} | ${title}`, description, url: `${APP_CONFIG.url}/site`, siteName: APP_CONFIG.name, locale: "pt_BR", type: "website" },
};

const modules = [
  { icon: Syringe, title: "Aplicações da caneta", body: "Anote data, hora e local de cada aplicação da medicação prescrita pelo seu médico." },
  { icon: Beef, title: "Meta de proteína", body: "Com menos apetite, o risco é comer de menos. Veja quanto falta de proteína e receba um aviso quando comer pouco." },
  { icon: Droplets, title: "Água", body: "Anote cada copo e acompanhe sua meta diária." },
  { icon: Scale, title: "Peso e medidas", body: "Acompanhe sua evolução semana a semana, com tudo pronto para mostrar na consulta." },
  { icon: Dumbbell, title: "Força para não perder músculo", body: "Treinos prontos de força, em casa ou na academia, para preservar massa magra enquanto emagrece." },
  { icon: Users, title: "Comunidade", body: "Troque experiências de rotina com quem está na mesma jornada." },
];

/** Vitrine sem banco (build/instabilidade): preços do catálogo, sem contagem de vagas. */
const fallbackPlans: PlansResponse = {
  trial_days: 7,
  plans: PLAN_IDS.map((id) => ({
    id,
    name: PLANS[id].name,
    price: PLANS[id].price,
    months: PLANS[id].months,
    recurring: PLANS[id].recurring,
    pix_only: PLANS[id].pixOnly,
    monthly_equivalent: monthlyEquivalent(PLANS[id]),
    seats_left: null,
  })),
};

function PlanCard({ plan, featured }: { plan: BillingPlan; featured: boolean }) {
  const soldOut = plan.seats_left === 0;
  const priceLine = plan.id === "fundador" ? "à vista no Pix" : plan.id === "anual" ? "por ano" : "por mês";
  const detail = plan.id === "fundador"
    ? "12 meses de acesso. Pagamento único, não renova."
    : plan.id === "anual"
      ? `Equivale a ${formatBRL(plan.monthly_equivalent)} por mês.`
      : "Pix, boleto ou cartão. Cancele quando quiser.";
  return (
    <article className={`site-card flex flex-col text-center ${featured ? "border-brand-strong ring-2 ring-brand-strong/40" : ""} ${soldOut ? "opacity-60" : ""}`}>
      <p className="site-eyebrow">{plan.name}{featured ? " · vagas limitadas" : ""}</p>
      <p className="mt-4"><span className="text-4xl font-bold">{formatBRL(plan.price)}</span></p>
      <p className="text-sm text-text-secondary">{priceLine}</p>
      <p className="mt-4 flex-1 text-sm leading-6 text-text-secondary">{detail}</p>
      {plan.id === "fundador" && plan.seats_left !== null ? (
        <p className={`mt-3 text-sm font-semibold ${soldOut ? "text-text-secondary" : "text-warning"}`}>{soldOut ? "Esgotado" : plan.seats_left === 1 ? "Resta 1 vaga" : `Restam ${plan.seats_left} vagas`}</p>
      ) : null}
    </article>
  );
}

export default async function SitePage() {
  const [faqResult, settingsResult, plansResult] = await Promise.allSettled([getPublishedFaq(), getAppSettings(), listPlans()]);
  const faqs = faqResult.status === "fulfilled" ? faqResult.value.slice(0, 6) : [];
  const support = settingsResult.status === "fulfilled" && settingsResult.value ? toPublicSettings(settingsResult.value).support_whatsapp_url : null;
  const { plans, trial_days: trialDays } = plansResult.status === "fulfilled" ? plansResult.value : fallbackPlans;
  const order = { fundador: 0, anual: 1, mensal: 2 } as const;
  const sortedPlans = [...plans].sort((a, b) => order[a.id] - order[b.id]);
  const cta = `Começar grátis — ${trialDays} dias`;

  return <main className="overflow-hidden pb-24 md:pb-0">
    <UtmCapture />
    <section className="site-hero relative px-4 py-20 text-center sm:py-28 md:px-8">
      <div className="mx-auto max-w-4xl"><span className="inline-flex items-center gap-2 rounded-full border border-brand-strong/25 bg-brand-soft px-4 py-2 text-xs font-semibold text-brand-strong">Para quem faz tratamento com prescrição médica</span>
        <h1 className="mt-7 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-7xl">Começou a caneta? <span className="text-brand-strong">Não perca músculo junto com o peso.</span></h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">Registre aplicações, proteína, água e peso em um só lugar — e leve tudo organizado para a consulta.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/cadastro" className="site-cta">{cta}</Link><Link href="/login" className="site-cta-outline">Já tenho conta</Link></div>
        <p className="mt-4 text-sm text-text-secondary">Sem cartão para testar.</p>
      </div>
    </section>
    <section id="por-dentro" className="mx-auto max-w-7xl px-4 py-16 md:px-8"><div className="mx-auto max-w-2xl text-center"><p className="site-eyebrow">Veja o app por dentro</p><h2 className="site-heading">O que importa, na primeira tela</h2><p className="mt-3 text-text-secondary">Sem planilha e sem bloco de notas: alguns toques por dia.</p></div><div className="mt-10"><AppPreviews /></div></section>
    <section id="recursos" className="bg-surface-muted px-4 py-16 md:px-8"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="site-eyebrow">Tudo em um lugar</p><h2 className="site-heading">Feito para a rotina do tratamento</h2><p className="mt-3 text-text-secondary">Registre o que importa e entenda como seu corpo está respondendo.</p></div><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{modules.map(({ icon: Icon, title: moduleTitle, body }) => <article key={moduleTitle} className="site-card"><div className="mb-5 inline-flex rounded-2xl bg-brand-soft p-3 text-brand-strong"><Icon aria-hidden className="size-6" /></div><h3 className="text-lg font-semibold">{moduleTitle}</h3><p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p></article>)}</div></div></section>
    <section className="px-4 py-16 md:px-8"><div className="mx-auto max-w-7xl"><p className="site-eyebrow">Confiança</p><h2 className="site-heading">Registramos, não receitamos</h2><div className="mt-9 grid gap-4 md:grid-cols-3">{[
      { icon: Stethoscope, heading: "Seu médico decide o tratamento", body: "O app nunca sugere dose, troca de dose ou intervalo. Siga sempre a orientação do seu médico." },
      { icon: ShieldCheck, heading: "Seus dados de saúde são seus", body: "Só usamos com a sua autorização e não enviamos dados de saúde para ferramentas de terceiros." },
      { icon: FileDown, heading: "Exporte ou exclua quando quiser", body: "Baixe tudo o que registrou ou apague sua conta direto no app, sem pedir a ninguém." },
    ].map(({ icon: Icon, heading, body }) => <div key={heading} className="site-card"><div className="mb-5 inline-flex rounded-2xl bg-brand-soft p-3 text-brand-strong"><Icon aria-hidden className="size-6" /></div><h3 className="text-lg font-semibold">{heading}</h3><p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p></div>)}</div></div></section>
    <section id="preco" className="bg-surface-muted px-4 py-20 md:px-8"><div className="mx-auto max-w-5xl"><div className="mx-auto max-w-2xl text-center"><p className="site-eyebrow">Preço</p><h2 className="site-heading">O tratamento é um investimento alto. Cuidar do resultado custa pouco.</h2><p className="mt-3 text-text-secondary">Você já investe todo mês no tratamento. Por uma fração disso, acompanhe se está comendo proteína suficiente e preservando seus músculos.</p></div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">{sortedPlans.map((plan) => <PlanCard key={plan.id} plan={plan} featured={plan.id === "fundador" && plan.seats_left !== 0} />)}</div>
      <div className="mt-8 text-center"><p className="text-text-secondary">{trialDays} dias grátis em qualquer plano, sem cartão.</p><Link href="/cadastro" className="site-cta mt-6">{cta}</Link></div>
    </div></section>
    <section id="perguntas" className="px-4 py-16 md:px-8"><div className="mx-auto max-w-3xl"><div className="flex items-center gap-3"><CircleHelp className="size-7 text-brand-strong" aria-hidden /><h2 className="site-heading">Perguntas frequentes</h2></div><div className="mt-8 space-y-3">{faqs.map((faq) => <details key={faq.id} className="site-card group py-4"><summary className="cursor-pointer font-semibold">{faq.question}</summary><p className="mt-3 text-sm leading-6 text-text-secondary">{faq.answer}</p></details>)}</div><Link href="/faq" className="mt-6 inline-block font-semibold text-brand-strong underline underline-offset-4">Ver toda a ajuda</Link></div></section>
    <footer className="border-t border-border px-4 py-12 md:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-center justify-between gap-5"><p className="font-bold">{APP_CONFIG.name}</p><nav aria-label="Links institucionais" className="flex flex-wrap gap-5 text-sm text-text-secondary"><Link href="/termos">Termos</Link><Link href="/privacidade">Privacidade</Link><Link href="/faq">Ajuda</Link>{support && <a href={support} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1"><MessageCircle className="size-4" aria-hidden />WhatsApp de suporte</a>}</nav></div><p className="mt-8 border-t border-border pt-6 text-sm text-text-secondary">Siga sempre a orientação do seu médico. Este app é uma ferramenta de registro e não substitui acompanhamento médico.</p><p className="mt-3 text-xs text-text-tertiary">© {new Date().getFullYear()} {APP_CONFIG.name}</p></div></footer>
    <SiteStickyCta label={cta} />
  </main>;
}
