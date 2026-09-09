import {
  getNutritionProfile,
  getTodayMeals,
  getTodayWaterTotalMl,
  type MealSlotState,
} from "@/lib/modules/alimentacao/repository";
import { computeMonthBalance, getYearMonth } from "@/lib/modules/financeiro/calculations";
import { getTransactionsForMonth } from "@/lib/modules/financeiro/repository";
import {
  getOverdueAndTodayCards,
  type BoardCard,
} from "@/lib/modules/estudos-trabalhos/repository";
import { getNextDayLabel, type DayLabel } from "@/lib/modules/treinos/calculations";
import {
  getActivePlan,
  getLastSessionDayLabel,
  getSessionByDate,
} from "@/lib/modules/treinos/repository";

export type DailyOverview = {
  pendingCards: BoardCard[];
  workout: { hasPlan: boolean; dayLabel: DayLabel; done: boolean };
  meals: MealSlotState[];
  water: { totalMl: number; goalMl: number };
  monthBalancePreview: number;
};

/**
 * Composição só-leitura para o Dashboard: cada campo vem da função pública
 * do módulo dono do dado (ver docs/04-api-contratos.md#dashboard) — nunca
 * um select direto em tabela de outro módulo.
 */
export async function getDailyOverview(
  userId: string,
  todayIso: string,
): Promise<DailyOverview> {
  const [
    pendingCards,
    activePlan,
    lastSessionDayLabel,
    todaySession,
    meals,
    waterTotalMl,
    nutritionProfile,
    transactions,
  ] = await Promise.all([
    getOverdueAndTodayCards(userId, todayIso),
    getActivePlan(userId),
    getLastSessionDayLabel(userId),
    getSessionByDate(userId, todayIso),
    getTodayMeals(userId, todayIso),
    getTodayWaterTotalMl(userId, todayIso),
    getNutritionProfile(userId),
    getTransactionsForMonth(userId, getYearMonth(todayIso)),
  ]);

  return {
    pendingCards,
    workout: {
      hasPlan: Boolean(activePlan),
      dayLabel: todaySession
        ? (todaySession.dayLabel as DayLabel)
        : getNextDayLabel(lastSessionDayLabel),
      done: Boolean(todaySession),
    },
    meals,
    water: {
      totalMl: waterTotalMl,
      goalMl: nutritionProfile?.waterGoalMl ?? 3000,
    },
    monthBalancePreview: computeMonthBalance(transactions).balance,
  };
}
