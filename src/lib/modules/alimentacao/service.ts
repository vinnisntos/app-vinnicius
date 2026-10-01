import { toMealLogRow, toNutritionProfileRow, toWaterLogRow, toWeightLogRow } from "@/lib/api/mappers";
import { toMealLogItemRow } from "@/lib/api/mappers-health";
import { itemsForMeals } from "@/lib/modules/alimentos/repository";
import { getTodayIsoDate } from "@/lib/date";
import { nowInTimezone } from "@/lib/integrations/google/recurrence";
import { getProfile as getAccountProfile, getUserTimezone } from "@/lib/modules/conta/repository";
import { listMedications } from "@/lib/modules/medicacao/repository";
import { MEAL_SLOTS, type NutritionDay, type NutritionMetrics } from "@/types/database";
import * as repository from "./api-repository";
import {
  calculateBMR,
  calculateMacroTargets,
  calculateRecommendedCalories,
  calculateTDEE,
  getIntakeGuidance,
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
  const [profile, latestWeight, meals, water, account, medications] = await Promise.all([
    repository.getProfile(userId),
    repository.getLatestWeight(userId),
    repository.getMealsForDay(userId, date),
    repository.getWaterLogsForDay(userId, date),
    getAccountProfile(userId),
    listMedications(userId),
  ]);
  // "Usa medicação" = marcou no cadastro OU tem medicação ativa cadastrada.
  const usesMedication = account?.medicationStatus === "usa" || medications.some((m) => m.isActive);
  const now = nowInTimezone(account?.timezone ?? "America/Sao_Paulo");

  const mealRows = meals.map(toMealLogRow);
  const itemRows = (await itemsForMeals(userId, mealRows.map((m) => m.id))).map(toMealLogItemRow);
  const bySlot = new Map(mealRows.map((m) => [m.meal_slot, m]));
  const waterRows = water.map(toWaterLogRow);
  const waterTotal = waterRows.reduce((sum, w) => sum + w.amount_ml, 0);
  const completed = mealRows.filter((m) => m.is_completed);
  const sumOf = (key: "calories" | "protein_g" | "carbs_g" | "fat_g") =>
    completed.reduce((sum, m) => sum + (m[key] ?? 0), 0);
  const consumed = sumOf("calories");

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
    const goal = profile.goal as NutritionGoal;
    const recommended = calculateRecommendedCalories({ tdee, goal, sex });
    const macros = calculateMacroTargets({
      kcal: recommended,
      weightKg: Number(latestWeight.weightKg),
      goal,
    });

    metrics = {
      bmr_kcal: Math.round(bmr),
      tdee_kcal: Math.round(tdee),
      recommended_kcal: recommended,
      consumed_kcal: Math.round(consumed),
      // Negativo = passou da meta (o front mostra como excedente).
      remaining_kcal: Math.round(recommended - consumed),
      ...getIntakeGuidance({
        usesMedication,
        sex,
        consumedKcal: consumed,
        completedMeals: completed.length,
        isToday: date === now.date,
        nowTime: now.time,
      }),
      protein_target_g: macros.protein_g,
      carbs_target_g: macros.carbs_g,
      fat_target_g: macros.fat_g,
      protein_g: Math.round(sumOf("protein_g")),
      carbs_g: Math.round(sumOf("carbs_g")),
      fat_g: Math.round(sumOf("fat_g")),
      water_total_ml: waterTotal,
      water_goal_ml: profile.waterGoalMl,
    };
  }

  return {
    date,
    profile: profile ? toNutritionProfileRow(profile) : null,
    latest_weight: latestWeight ? toWeightLogRow(latestWeight) : null,
    meals: MEAL_SLOTS.map((slot) => {
      const meal = bySlot.get(slot) ?? null;
      return { meal_slot: slot, meal, items: meal ? itemRows.filter((i) => i.meal_log_id === meal.id) : [] };
    }),
    water_logs: waterRows,
    metrics,
  };
}
