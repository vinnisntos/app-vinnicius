import type { InjectionSite, MedicationFrequency, MedicationRoute } from "@/types/database";

/**
 * Agenda e rodízio de medicação — regra pura, testada em schedule.test.ts.
 *
 * IMPORTANTE (docs/escopo-produto.md): este módulo só responde "é dia de
 * aplicar a dose que o médico prescreveu?" e "qual LOCAL usar agora?".
 * Nada aqui calcula, sugere ou ajusta DOSE.
 */

const INJECTABLE: MedicationRoute[] = ["subcutanea", "intramuscular"];

/** Ordem de rodízio: alterna lado e região para espaçar o mesmo ponto. */
export const SITE_ROTATION: InjectionSite[] = [
  "abdomen_esq",
  "abdomen_dir",
  "coxa_esq",
  "coxa_dir",
  "braco_esq",
  "braco_dir",
];

const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export interface ScheduleInput {
  frequency: MedicationFrequency;
  daysOfWeek: number[] | null;
  startedOn: string | null;
  isActive: boolean;
}

/**
 * É dia previsto de aplicação? Considera só a frequência cadastrada.
 * - diaria: todo dia
 * - semanal/personalizada: dias da semana marcados
 * - quinzenal: dia da semana marcado e ≥ 13 dias desde a última aplicação
 */
export function isScheduledOn(med: ScheduleInput, date: string, lastLogDate: string | null): boolean {
  if (!med.isActive) return false;
  if (med.startedOn && date < med.startedOn) return false;
  if (med.frequency === "diaria") return true;

  const days = med.daysOfWeek ?? [];
  if (days.length === 0 || !days.includes(weekday(date))) return false;
  if (med.frequency === "quinzenal" && lastLogDate) return daysBetween(lastLogDate, date) >= 13;
  return true;
}

/**
 * Próxima data prevista a partir de hoje (inclusive, se ainda não aplicou
 * hoje). null quando não há agenda (sem dias marcados) ou está inativo.
 */
export function nextDueDate(
  med: ScheduleInput,
  today: string,
  lastLogDate: string | null,
): string | null {
  const takenToday = lastLogDate === today;
  for (let offset = takenToday ? 1 : 0; offset <= 28; offset++) {
    const date = addDays(today, offset);
    // Para a quinzenal, a "última" aplicação de referência passa a ser hoje
    // se já aplicou hoje.
    const reference = takenToday ? today : lastLogDate;
    if (isScheduledOn(med, date, reference)) return date;
  }
  return null;
}

/**
 * Sugere o próximo LOCAL no rodízio: o seguinte ao último usado, pulando
 * os 2 mais recentes. Só para vias injetáveis.
 */
export function suggestInjectionSite(
  route: MedicationRoute,
  recentSites: (InjectionSite | null)[], // mais recente primeiro
): InjectionSite | null {
  if (!INJECTABLE.includes(route)) return null;
  const used = recentSites.filter((s): s is InjectionSite => s !== null);
  if (used.length === 0) return SITE_ROTATION[0];

  const avoid = new Set(used.slice(0, 2));
  const lastIndex = SITE_ROTATION.indexOf(used[0]);
  for (let step = 1; step <= SITE_ROTATION.length; step++) {
    const candidate = SITE_ROTATION[(Math.max(lastIndex, -1) + step) % SITE_ROTATION.length];
    if (!avoid.has(candidate)) return candidate;
  }
  return SITE_ROTATION[0];
}
