import { toMealLogRow, toNutritionProfileRow, toWaterLogRow, toWeightLogRow } from "@/lib/api/mappers";
import { getTodayIsoDate } from "@/lib/date";
import { getUserTimezone } from "@/lib/modules/conta/repository";
import { MEAL_SLOTS, type NutritionDay, type NutritionMetrics } from "@/types/database";
import * as repository from "./api-repository";
import {
  calculateBMR,
  calculateRecommendedCalories,
  calculateTDEE,
  type ActivityLevel,
  type NutritionGoal,
  type Sex,
} from "./calculations";

/** "Hoje" no fuso do usuário — nunca UTC (vira o dia errado à noite no Brasil). */
export async function resolveDate(userId: string, date: string | undefined) {
  return date ?? getTodayIsoDate(await getUserTimezone(userId));
}

/**
 * Tela diária de alimentação num request só: perfil, 5 slots, água e as
 * métricas derivadas (BMR/TDEE/recomendado/consumido/restante). Métricas só
 * existem com perfil + ao menos uma pesagem.
 */
export async function getNutritionDay(userId: string, date: string): Promise<NutritionDay> {
  const [profile, latestWeight, meals, water] = await Promise.all([
    repository.getProfile(userId),
    repository.getLatestWeight(userId),
    repository.getMealsForDay(userId, date),
    repository.getWaterLogsForDay(userId, date),
  ]);

  const mealRows = meals.map(toMealLogRow);
  const bySlot = new Map(mealRows.map((m) => [m.meal_slot, m]));
  const waterRows = water.map(toWaterLogRow);
  const waterTotal = waterRows.reduce((sum, w) => sum + w.amount_ml, 0);
  const consumed = mealRows
    .filter((m) => m.is_completed && m.calories != null)
    .reduce((sum, m) => sum + (m.calories ?? 0), 0);

  let metrics: NutritionMetrics | null = null;
  if (profile && latestWeight) {
    const sex = profile.sex as Sex;
    const bmr = calculateBMR({
      sex,
      weightKg: Number(latestWeight.weightKg),
      heightCm: Number(profile.heightCm),
      birthDate: profile.birthDate,
      today: date,
    });
    const tdee = calculateTDEE(bmr, profile.activityLevel as ActivityLevel);
    const recommended = calculateRecommendedCalories({ tdee, goal: profile.goal as NutritionGoal, sex });

    metrics = {
      bmr_kcal: Math.round(bmr),
      tdee_kcal: Math.round(tdee),
      recommended_kcal: recommended,
      consumed_kcal: Math.round(consumed),
      // Negativo = passou da meta (o front mostra como excedente).
      remaining_kcal: Math.round(recommended - consumed),
      water_total_ml: waterTotal,
      water_goal_ml: profile.waterGoalMl,
    };
  }

  return {
    date,
    profile: profile ? toNutritionProfileRow(profile) : null,
    latest_weight: latestWeight ? toWeightLogRow(latestWeight) : null,
    meals: MEAL_SLOTS.map((slot) => ({ meal_slot: slot, meal: bySlot.get(slot) ?? null })),
    water_logs: waterRows,
    metrics,
  };
}
