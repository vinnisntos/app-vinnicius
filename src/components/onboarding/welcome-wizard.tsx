"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check, Dumbbell, HeartPulse, LoaderCircle, Smartphone, Sparkles, UserRound } from "lucide-react";
import { MedicationFormSheet } from "@/components/saude/medication-form-sheet";
import { BottomActionBar, BOTTOM_ACTION_BAR_SPACER } from "@/components/ui/bottom-action-bar";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { ApiClientError, apiData } from "@/lib/api/client";
import { getTodayIsoDate } from "@/lib/date";
import { formatDecimal } from "@/lib/format";
import {
  ACTIVITY_LEVELS,
  MEDICATION_DISCLAIMER,
  type ActivityLevel,
  type GoogleCalendarStatus,
  type NutritionGoal,
  type Sex,
  type WorkoutProgramRow,
} from "@/types/database";

/**
 * Assistente de boas-vindas (primeiro acesso). Tudo pulável; o passo atual
 * fica salvo por usuário para retomar (ex.: ao voltar do Google).
 * Concluir ou pular marca `onboarding_completed` no perfil.
 */

const STEPS = ["objetivo", "voce", "medicacao", "treino", "lembretes", "instalar"] as const;
type Step = (typeof STEPS)[number];

const GOALS: { value: NutritionGoal; title: string; text: string }[] = [
  { value: "emagrecer", title: "Emagrecer", text: "Perder gordura com constância, sem dietas radicais." },
  { value: "manter", title: "Manter o peso", text: "Criar hábitos e manter o que já conquistou." },
  { value: "ganhar", title: "Ganhar massa", text: "Ganhar músculo com treino e proteína suficiente." },
];

const ACTIVITY: Record<ActivityLevel, string> = {
  sedentario: "Sedentário — quase não me exercito",
  leve: "Leve — 1 a 3 vezes por semana",
  moderado: "Moderado — 3 a 5 vezes por semana",
  ativo: "Ativo — 6 a 7 vezes por semana",
  muito_ativo: "Muito ativo — 2x por dia ou trabalho físico",
};

/** Programas sugeridos por objetivo (slugs do catálogo semeado). */
const SUGGESTED: Record<NutritionGoal, string[]> = {
  emagrecer: ["emagrecer-em-casa", "queima-academia", "corrida-5k"],
  manter: ["full-body-iniciante", "mobilidade-diaria", "corrida-5k"],
  ganhar: ["hipertrofia-abc", "full-body-iniciante", "mobilidade-diaria"],
};

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

function Card({ selected, onClick, title, text }: { selected: boolean; onClick: () => void; title: string; text?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        selected ? "border-success-500 bg-success-soft" : "border-glass-border bg-glass"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="font-semibold">{title}</span>
        {selected ? <Check className="size-5 text-success" aria-hidden /> : null}
      </span>
      {text ? <span className="mt-1 block text-sm text-text-secondary">{text}</span> : null}
    </button>
  );
}

function StepHeader({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="mb-5">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-500" aria-hidden>{icon}</div>
      <h1 className="text-2xl font-black tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-text-secondary">{text}</p>
    </div>
  );
}

export function WelcomeWizard({ userId, firstName }: { userId: string; firstName: string | null }) {
  const router = useRouter();
  const storageKey = `lifeos.onboarding.step:${userId}`;
  const [step, setStep] = useState<Step>("objetivo");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  // Dados do perfil
  const [goal, setGoal] = useState<NutritionGoal>("emagrecer");
  const [sex, setSex] = useState<Sex | null>(null);
  const [birth, setBirth] = useState({ day: 1, month: 1, year: new Date().getFullYear() - 30 });
  const [height, setHeight] = useState(165);
  const [weight, setWeight] = useState(75);
  const [activity, setActivity] = useState<ActivityLevel>("leve");

  const [usesMedication, setUsesMedication] = useState<boolean | null>(null);
  const [medSheet, setMedSheet] = useState(false);
  const [medSaved, setMedSaved] = useState(false);

  const [programs, setPrograms] = useState<WorkoutProgramRow[]>([]);
  const [enrolled, setEnrolled] = useState<string | null>(null);
  const [google, setGoogle] = useState<GoogleCalendarStatus | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  const index = STEPS.indexOf(step);
  const isIos = useMemo(() => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent), []);

  // Retoma o passo salvo.
  useEffect(() => {
    // Lido após a hidratação (o servidor não conhece o localStorage).
    const id = setTimeout(() => {
      try {
        const saved = localStorage.getItem(storageKey) as Step | null;
        if (saved && STEPS.includes(saved)) setStep(saved);
      } catch {
        // armazenamento indisponível
      }
    }, 0);
    return () => clearTimeout(id);
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, step);
    } catch {
      // armazenamento indisponível
    }
  }, [step, storageKey]);

  useEffect(() => {
    if (step === "treino" && programs.length === 0) {
      apiData<WorkoutProgramRow[]>("/api/training/programs").then(setPrograms).catch(() => setPrograms([]));
    }
    if (step === "lembretes" && !google) {
      apiData<GoogleCalendarStatus>("/api/integrations/google").then(setGoogle).catch(() => setGoogle(null));
    }
  }, [step, programs.length, google]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const next = () => setStep(STEPS[Math.min(index + 1, STEPS.length - 1)]);
  const back = () => setStep(STEPS[Math.max(index - 1, 0)]);

  async function finish() {
    setPending(true);
    try {
      await apiData("/api/me", { method: "PATCH", json: { onboarding_completed: true } });
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir. Tente de novo.");
      setPending(false);
    }
  }

  async function saveProfile() {
    if (!sex) {
      setError("Escolha o sexo biológico para calcularmos suas calorias.");
      return;
    }
    setPending(true);
    setError(undefined);
    const birthDate = `${birth.year}-${String(birth.month).padStart(2, "0")}-${String(birth.day).padStart(2, "0")}`;
    try {
      await apiData("/api/nutrition/profile", {
        method: "PUT",
        json: { sex, birth_date: birthDate, height_cm: height, activity_level: activity, goal },
      });
      await apiData("/api/nutrition/weight", { method: "POST", json: { logged_at: getTodayIsoDate(), weight_kg: weight } });
      next();
    } catch (e) {
      const fields = e instanceof ApiClientError ? Object.values(e.fields ?? {}).flat()[0] : undefined;
      setError(fields ?? (e instanceof Error ? e.message : "Não foi possível salvar."));
    } finally {
      setPending(false);
    }
  }

  async function enroll(program: WorkoutProgramRow) {
    setPending(true);
    setError(undefined);
    try {
      await apiData("/api/training/enrollment", { method: "POST", json: { program_id: program.id } });
      setEnrolled(program.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível escolher o programa.");
    } finally {
      setPending(false);
    }
  }

  function primaryAction() {
    setError(undefined);
    if (step === "voce") return void saveProfile();
    if (step === "instalar") return void finish();
    next();
  }

  const primaryLabel = step === "instalar" ? "Começar a usar" : step === "voce" ? "Salvar e continuar" : "Continuar";
  const suggested = SUGGESTED[goal].map((slug) => programs.find((p) => p.slug === slug)).filter((p): p is WorkoutProgramRow => Boolean(p));
  const years = Array.from({ length: 83 }, (_, i) => new Date().getFullYear() - 18 - i);

  return (
    <main className={`mx-auto min-h-screen w-full max-w-lg px-4 pt-[max(1.25rem,env(safe-area-inset-top))] ${BOTTOM_ACTION_BAR_SPACER}`}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex flex-1 gap-1.5" aria-label={`Passo ${index + 1} de ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-success-500" : "bg-surface-muted"}`} />
          ))}
        </div>
        <button type="button" className="min-h-11 px-2 text-sm text-text-secondary underline-offset-2 hover:underline" onClick={() => void finish()}>
          Pular introdução
        </button>
      </div>

      {step === "objetivo" ? (
        <>
          <StepHeader icon={<Sparkles className="size-6" />} title={`Boas-vindas${firstName ? `, ${firstName}` : ""}!`} text="Em 2 minutos deixamos o app do seu jeito. Qual é o seu objetivo agora?" />
          <div className="space-y-3">
            {GOALS.map((g) => <Card key={g.value} selected={goal === g.value} onClick={() => setGoal(g.value)} title={g.title} text={g.text} />)}
          </div>
        </>
      ) : null}

      {step === "voce" ? (
        <>
          <StepHeader icon={<UserRound className="size-6" />} title="Sobre você" text="Usamos estes dados só para calcular suas metas de calorias e macros." />
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium">Sexo biológico</p>
              <p className="text-sm text-text-secondary">Usado apenas na fórmula de calorias.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Card selected={sex === "F"} onClick={() => setSex("F")} title="Feminino" />
                <Card selected={sex === "M"} onClick={() => setSex("M")} title="Masculino" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Data de nascimento</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <select aria-label="Dia" className="h-12 rounded-md border border-input bg-transparent px-2" value={birth.day} onChange={(e) => setBirth((b) => ({ ...b, day: Number(e.target.value) }))}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select aria-label="Mês" className="h-12 rounded-md border border-input bg-transparent px-2" value={birth.month} onChange={(e) => setBirth((b) => ({ ...b, month: Number(e.target.value) }))}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select aria-label="Ano" className="h-12 rounded-md border border-input bg-transparent px-2" value={birth.year} onChange={(e) => setBirth((b) => ({ ...b, year: Number(e.target.value) }))}>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <Stepper value={height} onChange={setHeight} step={1} min={120} max={220} unit="cm" label="Altura" />
            <Stepper value={weight} onChange={setWeight} step={0.5} min={35} max={250} unit="kg" label="Peso atual" format={(v) => formatDecimal(v, 1)} />
            <div>
              <p className="text-sm font-medium">Nível de atividade</p>
              <div className="mt-2 space-y-2">
                {ACTIVITY_LEVELS.map((level) => <Card key={level} selected={activity === level} onClick={() => setActivity(level)} title={ACTIVITY[level]} />)}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {step === "medicacao" ? (
        <>
          <StepHeader icon={<HeartPulse className="size-6" />} title="Você usa medicação para emagrecer?" text="Por exemplo, da classe GLP-1, prescrita pelo seu médico. O app ajuda a lembrar as aplicações e registrar como você se sente." />
          <div className="grid grid-cols-2 gap-2">
            <Card selected={usesMedication === true} onClick={() => { setUsesMedication(true); setMedSheet(true); }} title="Sim" />
            <Card selected={usesMedication === false} onClick={() => setUsesMedication(false)} title="Não" />
          </div>
          {medSaved ? <p className="mt-4 rounded-xl bg-success-soft p-3 text-sm text-success">Medicação cadastrada. Você acompanha tudo na aba Saúde.</p> : null}
          <p className="mt-5 rounded-xl border border-glass-border bg-glass p-3 text-sm">{MEDICATION_DISCLAIMER}</p>
          <MedicationFormSheet open={medSheet} onClose={() => setMedSheet(false)} onSaved={() => { setMedSheet(false); setMedSaved(true); }} />
        </>
      ) : null}

      {step === "treino" ? (
        <>
          <StepHeader icon={<Dumbbell className="size-6" />} title="Escolha um treino para começar" text="Sugestões para o seu objetivo. Você pode trocar quando quiser na aba Treinos." />
          {programs.length === 0 ? (
            <div className="flex justify-center py-8 text-text-secondary"><LoaderCircle className="animate-spin" aria-label="Carregando programas" /></div>
          ) : (
            <div className="space-y-3">
              {suggested.map((p) => (
                <div key={p.id} className={`rounded-2xl border p-4 ${enrolled === p.id ? "border-success-500 bg-success-soft" : "border-glass-border bg-glass"}`}>
                  <p className="font-semibold">{p.title}</p>
                  <p className="mt-1 text-sm text-text-secondary">{p.summary}</p>
                  <p className="mt-1 text-sm text-text-secondary">{p.days_per_week}x por semana · {p.session_minutes ?? "—"} min</p>
                  <Button variant={enrolled === p.id ? "secondary" : "outline"} className="mt-3 h-11 w-full" disabled={pending || enrolled === p.id} onClick={() => void enroll(p)}>
                    {enrolled === p.id ? "Programa escolhido" : "Começar este"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      {step === "lembretes" ? (
        <>
          <StepHeader icon={<CalendarCheck className="size-6" />} title="Lembretes no seu celular" text="Criamos eventos na sua Google Agenda (treino, água, refeições, aplicação) e o próprio Google te avisa — sem instalar nada." />
          {google?.available ? (
            google.connected ? (
              <p className="rounded-xl bg-success-soft p-3 text-sm text-success">Google Agenda conectado ({google.google_email}).</p>
            ) : (
              <a href="/api/integrations/google/connect" className="flex h-12 w-full items-center justify-center rounded-xl border border-glass-border bg-glass font-semibold">
                Conectar Google Agenda
              </a>
            )
          ) : (
            <p className="rounded-xl border border-glass-border bg-glass p-3 text-sm text-text-secondary">A integração com o Google Agenda estará disponível em breve. Você poderá ativá-la em Lembretes.</p>
          )}
        </>
      ) : null}

      {step === "instalar" ? (
        <>
          <StepHeader icon={<Smartphone className="size-6" />} title="Tenha o app na tela inicial" text="Abre em um toque, em tela cheia, como um aplicativo." />
          {installPrompt ? (
            <Button variant="outline" className="h-12 w-full" onClick={() => void installPrompt.prompt().finally(() => setInstallPrompt(null))}>
              Instalar agora
            </Button>
          ) : isIos ? (
            <ol className="list-decimal space-y-2 rounded-2xl border border-glass-border bg-glass p-4 pl-8 text-sm">
              <li>Toque no botão Compartilhar (quadrado com seta) do Safari.</li>
              <li>Escolha &quot;Adicionar à Tela de Início&quot;.</li>
              <li>Toque em &quot;Adicionar&quot;.</li>
            </ol>
          ) : (
            <ol className="list-decimal space-y-2 rounded-2xl border border-glass-border bg-glass p-4 pl-8 text-sm">
              <li>Toque no menu ⋮ do navegador.</li>
              <li>Escolha &quot;Instalar app&quot; ou &quot;Adicionar à tela inicial&quot;.</li>
            </ol>
          )}
        </>
      ) : null}

      {error ? <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p> : null}

      <BottomActionBar>
        <div className="flex w-full gap-2">
          {index > 0 ? (
            <Button variant="ghost" className="h-12 px-4" onClick={back} disabled={pending}>Voltar</Button>
          ) : null}
          <Button
            data-primary-action="onboarding-next"
            className="h-12 flex-1 bg-success-500 font-semibold text-on-bright hover:bg-success-500/85"
            disabled={pending}
            onClick={primaryAction}
          >
            {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null} {primaryLabel}
          </Button>
        </div>
      </BottomActionBar>
    </main>
  );
}
