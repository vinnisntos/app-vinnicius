import type { Metadata } from "next";
import Link from "next/link";
import { Apple, CalendarDays, CircleHelp, Droplets, Dumbbell, HeartPulse, Lightbulb, MessageCircle, Scale, Smartphone, Users } from "lucide-react";
import { APP_CONFIG } from "@/lib/app-config";
import { getAppSettings, getPublishedFaq } from "@/lib/modules/conta/repository";
import { toPublicSettings } from "@/lib/api/mappers";
import { SiteStickyCta } from "@/components/site/site-sticky-cta";

const description = "Impulso coletivo para emagrecer com constância: alimentação, água, treinos, progresso, lembretes e comunidade em um só lugar.";
export const metadata: Metadata = {
  title: "Impulso coletivo para emagrecer com constância",
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: APP_CONFIG.url },
  openGraph: { title: `${APP_CONFIG.name} | Impulso coletivo para emagrecer com constância`, description, url: `${APP_CONFIG.url}/site`, siteName: APP_CONFIG.name, locale: "pt_BR", type: "website" },
};

const modules = [
  { icon: Apple, title: "Alimentação e metas", body: "Registre refeições e acompanhe kcal, proteínas, carboidratos e gorduras." },
  { icon: Droplets, title: "Água", body: "Anote cada copo e acompanhe sua meta diária." },
  { icon: HeartPulse, title: "Saúde", body: "Acompanhe medicação prescrita pelo seu médico (ex.: da classe GLP-1): aplicações, rodízio de local e efeitos." },
  { icon: Scale, title: "Progresso", body: "Veja sua evolução de peso e medidas ao longo do tempo." },
  { icon: Dumbbell, title: "Treinos prontos", body: "Encontre programas para casa, academia, corrida, ganho de massa e emagrecimento." },
  { icon: Users, title: "Comunidade", body: "Compartilhe conquistas e siga em frente com outras pessoas." },
  { icon: CalendarDays, title: "Google Agenda", body: "Organize lembretes para treinos e sua rotina." },
  { icon: Lightbulb, title: "Dicas e mentoria", body: "Leia orientações práticas selecionadas para sua jornada." },
  { icon: Smartphone, title: "App no celular", body: "Adicione à tela inicial e acesse com praticidade." },
];

export default async function SitePage() {
  const [faqResult, settingsResult] = await Promise.allSettled([getPublishedFaq(), getAppSettings()]);
  const faqs = faqResult.status === "fulfilled" ? faqResult.value.slice(0, 6) : [];
  const support = settingsResult.status === "fulfilled" && settingsResult.value ? toPublicSettings(settingsResult.value).support_whatsapp_url : null;
  return <main className="overflow-hidden pb-24 md:pb-0">
    <section className="site-hero relative px-4 py-20 text-center sm:py-28 md:px-8">
      <div className="mx-auto max-w-4xl"><span className="inline-flex items-center gap-2 rounded-full border border-brand-strong/25 bg-brand-soft px-4 py-2 text-xs font-semibold text-brand-strong">Uma jornada mais leve, juntos</span>
        <h1 className="mt-7 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-7xl">Impulso coletivo para <span className="text-brand-strong">emagrecer com constância</span></h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">Alimentação, água, treinos, acompanhamento de medicação prescrita pelo seu médico e comunidade em um só lugar. Cuide da sua rotina, um dia de cada vez.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/cadastro" className="site-cta">Começar grátis — 3 dias</Link><Link href="/login" className="site-cta-outline">Já tenho conta</Link></div>
      </div>
    </section>
    <section id="recursos" className="mx-auto max-w-7xl px-4 py-16 md:px-8"><div className="max-w-2xl"><p className="site-eyebrow">Tudo em um lugar</p><h2 className="site-heading">Ferramentas para o seu dia a dia</h2><p className="mt-3 text-text-secondary">Registre o que importa, entenda seu progresso e conte com apoio.</p></div><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{modules.map(({ icon: Icon, title, body }) => <article key={title} className="site-card"><div className="mb-5 inline-flex rounded-2xl bg-brand-soft p-3 text-brand-strong"><Icon aria-hidden className="size-6" /></div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p></article>)}</div></section>
    <section className="bg-surface-muted px-4 py-16 md:px-8"><div className="mx-auto max-w-7xl"><p className="site-eyebrow">Como funciona</p><h2 className="site-heading">Comece no seu ritmo</h2><div className="mt-9 grid gap-4 md:grid-cols-3">{[["01", "Crie sua conta", "Ative seus 3 dias grátis e conheça o espaço."], ["02", "Organize sua rotina", "Defina metas e registre alimentação, água, saúde e treinos."], ["03", "Siga acompanhado", "Veja seu progresso e compartilhe conquistas na comunidade."]].map(([number, title, body]) => <div key={number} className="site-card"><span className="text-3xl font-bold text-brand-strong">{number}</span><h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p></div>)}</div></div></section>
    <section id="preco" className="px-4 py-20 md:px-8"><div className="site-card mx-auto max-w-2xl text-center"><p className="site-eyebrow">Preço simples</p><h2 className="mt-3 text-3xl font-bold">Um plano para seguir em frente</h2><p className="mt-7"><span className="text-5xl font-bold">R$ 19,90</span><span className="text-text-secondary">/mês</span></p><p className="mt-4 text-text-secondary">3 dias grátis. Cancele quando quiser.</p><p className="mt-2 text-sm text-text-secondary">Pague por Pix, boleto ou cartão.</p><Link href="/cadastro" className="site-cta mt-8">Começar grátis — 3 dias</Link></div></section>
    <section id="perguntas" className="bg-surface-muted px-4 py-16 md:px-8"><div className="mx-auto max-w-3xl"><div className="flex items-center gap-3"><CircleHelp className="size-7 text-brand-strong" aria-hidden /><h2 className="site-heading">Perguntas frequentes</h2></div><div className="mt-8 space-y-3">{faqs.map((faq) => <details key={faq.id} className="site-card group py-4"><summary className="cursor-pointer font-semibold">{faq.question}</summary><p className="mt-3 text-sm leading-6 text-text-secondary">{faq.answer}</p></details>)}</div><Link href="/faq" className="mt-6 inline-block font-semibold text-brand-strong underline underline-offset-4">Ver toda a ajuda</Link></div></section>
    <footer className="border-t border-border px-4 py-12 md:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-center justify-between gap-5"><p className="font-bold">{APP_CONFIG.name}</p><nav aria-label="Links institucionais" className="flex flex-wrap gap-5 text-sm text-text-secondary"><Link href="/termos">Termos</Link><Link href="/privacidade">Privacidade</Link><Link href="/faq">Ajuda</Link>{support && <a href={support} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1"><MessageCircle className="size-4" aria-hidden />WhatsApp de suporte</a>}</nav></div><p className="mt-8 border-t border-border pt-6 text-sm text-text-secondary">Este app não substitui acompanhamento médico. Siga a prescrição do seu médico.</p><p className="mt-3 text-xs text-text-tertiary">© {new Date().getFullYear()} {APP_CONFIG.name}</p></div></footer>
    <SiteStickyCta />
  </main>;
}
