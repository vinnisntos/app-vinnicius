import type { MealSlot, NextAction, NextReminder, ReminderKind } from "@/types/database";
import { nextOccurrence } from "@/lib/integrations/google/recurrence";

/**
 * "Qual é a minha próxima ação?" — regra pura (sem I/O), testada em
 * next-action.test.ts. A tela só exibe o resultado; a prioridade mora aqui.
 *
 * Ordem:
 *   1. sem perfil nutricional        → configurar perfil
 *   2. refeição da janela atual       → registrar essa refeição
 *   3. refeição de janela já passada  → registrar a atrasada (exceto ceia)
 *   4. água atrás do ritmo do dia     → beber (quantidade sugerida)
 *   5. última pesagem há 7+ dias       → registrar peso
 *   6. senão                          → tudo em dia
 */

/** Janelas "HH:MM" (início inclusivo, fim exclusivo) no fuso do usuário. */
export const MEAL_WINDOWS: Record<MealSlot, [string, string]> = {
  cafe_da_manha: ["05:00", "10:30"],
  almoco: ["11:00", "14:30"],
  lanche: ["15:00", "17:30"],
  jantar: ["18:00", "21:00"],
  ceia: ["21:00", "23:59"],
};

const SLOT_ORDER: MealSlot[] = ["cafe_da_manha", "almoco", "lanche", "jantar", "ceia"];

/** Ritmo de água distribuído entre 07:00 e 22:00. */
const WATER_DAY_START = 7 * 60;
const WATER_DAY_END = 22 * 60;
const WATER_STEP_ML = 250;

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

export interface NextActionInput {
  today: string; // YYYY-MM-DD no fuso do usuário
  nowTime: string; // HH:MM no fuso do usuário
  hasProfile: boolean;
  completedSlots: MealSlot[];
  waterTotalMl: number;
  waterGoalMl: number | null;
  latestWeightDate: string | null;
}

export function getNextAction(input: NextActionInput): NextAction {
  if (!input.hasProfile) return { kind: "setup_profile" };

  const now = toMinutes(input.nowTime);
  const done = new Set(input.completedSlots);

  const current = SLOT_ORDER.find((slot) => {
    const [start, end] = MEAL_WINDOWS[slot];
    return now >= toMinutes(start) && now < toMinutes(end);
  });
  if (current && !done.has(current)) return { kind: "log_meal", meal_slot: current, overdue: false };

  const missed = SLOT_ORDER.filter(
    (slot) => slot !== "ceia" && now >= toMinutes(MEAL_WINDOWS[slot][1]) && !done.has(slot),
  ).at(-1);
  if (missed) return { kind: "log_meal", meal_slot: missed, overdue: true };

  if (input.waterGoalMl && input.waterGoalMl > 0) {
    const progress = Math.min(1, Math.max(0, (now - WATER_DAY_START) / (WATER_DAY_END - WATER_DAY_START)));
    const behind = Math.round(input.waterGoalMl * progress - input.waterTotalMl);
    if (behind >= WATER_STEP_ML) {
      const suggested = Math.min(500, Math.ceil(behind / WATER_STEP_ML) * WATER_STEP_ML);
      return { kind: "drink_water", suggested_ml: suggested, behind_ml: behind };
    }
  }

  if (!input.latestWeightDate || daysBetween(input.latestWeightDate, input.today) >= 7) {
    return { kind: "log_weight" };
  }

  return { kind: "all_done" };
}

/** Próximo lembrete ativo (qualquer tipo), a partir de agora. */
export function getNextReminder(
  reminders: {
    kind: ReminderKind;
    title: string;
    daysOfWeek: number[];
    localTime: string; // "HH:MM"
    isActive: boolean;
  }[],
  now: { today: string; nowTime: string },
): NextReminder | null {
  const upcoming = reminders
    .filter((r) => r.isActive && r.daysOfWeek.length > 0)
    .map((r) => ({
      kind: r.kind,
      title: r.title,
      date: nextOccurrence({
        today: now.today,
        nowTime: now.nowTime,
        daysOfWeek: r.daysOfWeek,
        localTime: r.localTime,
      }),
      time: r.localTime,
    }))
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  return upcoming[0] ?? null;
}
