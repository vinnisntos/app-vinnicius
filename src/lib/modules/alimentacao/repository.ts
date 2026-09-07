import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  mealLogs,
  nutritionProfile,
  waterLogs,
  weightLogs,
} from "@/lib/db/schema";
import {
  MEAL_SLOTS,
  type ActivityLevel,
  type MealSlot,
  type Sex,
} from "./calculations";
import type {
  LogWaterInput,
  LogWeightInput,
  ToggleMealInput,
  UpdateNutritionProfileInput,
} from "./schema";

export async function getNutritionProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(nutritionProfile)
    .where(eq(nutritionProfile.userId, userId))
    .limit(1);
  return profile ?? null;
}

export async function getLatestWeight(userId: string) {
  const [latest] = await db
    .select()
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.loggedAt))
    .limit(1);
  return latest ?? null;
}

export async function getWeightHistory(userId: string, limit = 10) {
  return db
    .select()
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.loggedAt))
    .limit(limit);
}

export type MealSlotState = {
  mealSlot: MealSlot;
  description: string | null;
  calories: number | null;
  isCompleted: boolean;
};

export async function getTodayMeals(
  userId: string,
  logDate: string,
): Promise<MealSlotState[]> {
  const rows = await db
    .select()
    .from(mealLogs)
    .where(and(eq(mealLogs.userId, userId), eq(mealLogs.logDate, logDate)));

  const byRealSlot = new Map(rows.map((row) => [row.mealSlot as MealSlot, row]));

  return MEAL_SLOTS.map((mealSlot) => {
    const row = byRealSlot.get(mealSlot);
    return {
      mealSlot,
      description: row?.description ?? null,
      calories: row?.calories != null ? Number(row.calories) : null,
      isCompleted: row?.isCompleted ?? false,
    };
  });
}

export async function getTodayWaterTotalMl(
  userId: string,
  logDate: string,
): Promise<number> {
  const rows = await db
    .select({ amountMl: waterLogs.amountMl })
    .from(waterLogs)
    .where(and(eq(waterLogs.userId, userId), eq(waterLogs.logDate, logDate)));
  return rows.reduce((sum, row) => sum + row.amountMl, 0);
}

export async function upsertNutritionProfile(
  userId: string,
  input: UpdateNutritionProfileInput,
) {
  await db
    .insert(nutritionProfile)
    .values({
      userId,
      sex: input.sex,
      birthDate: input.birthDate,
      heightCm: input.heightCm.toString(),
      activityLevel: input.activityLevel,
      calorieGoal: input.calorieGoal.toString(),
      waterGoalMl: input.waterGoalMl,
    })
    .onConflictDoUpdate({
      target: nutritionProfile.userId,
      set: {
        sex: input.sex,
        birthDate: input.birthDate,
        heightCm: input.heightCm.toString(),
        activityLevel: input.activityLevel,
        calorieGoal: input.calorieGoal.toString(),
        waterGoalMl: input.waterGoalMl,
        updatedAt: new Date(),
      },
    });
}

export async function logWeight(userId: string, input: LogWeightInput) {
  await db
    .insert(weightLogs)
    .values({
      userId,
      loggedAt: input.loggedAt,
      weightKg: input.weightKg.toString(),
    })
    .onConflictDoUpdate({
      target: [weightLogs.userId, weightLogs.loggedAt],
      set: { weightKg: input.weightKg.toString() },
    });
}

export async function toggleMeal(userId: string, input: ToggleMealInput) {
  await db
    .insert(mealLogs)
    .values({
      userId,
      logDate: input.logDate,
      mealSlot: input.mealSlot,
      description: input.description ?? null,
      calories: input.calories != null ? input.calories.toString() : null,
      isCompleted: input.isCompleted,
      completedAt: input.isCompleted ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [mealLogs.userId, mealLogs.logDate, mealLogs.mealSlot],
      set: {
        description: input.description ?? null,
        calories: input.calories != null ? input.calories.toString() : null,
        isCompleted: input.isCompleted,
        completedAt: input.isCompleted ? new Date() : null,
      },
    });
}

export async function logWater(userId: string, input: LogWaterInput) {
  await db.insert(waterLogs).values({
    userId,
    logDate: input.logDate,
    amountMl: input.amountMl,
  });
}

export type { ActivityLevel, Sex };
