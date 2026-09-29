import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mealLogs, nutritionProfile, waterLogs, weightLogs } from "@/lib/db/schema";
import type {
  MealUpsertInput,
  NutritionProfileInput,
  WaterInsertInput,
  WeightInsertInput,
} from "./api-schema";

/**
 * Repository das rotas `/api/nutrition/*`. Mesmo contrato do repository.ts
 * legado: `userId` sempre primeiro parâmetro, vindo da sessão.
 */

export async function getMealsForDay(userId: string, logDate: string) {
  return db
    .select()
    .from(mealLogs)
    .where(and(eq(mealLogs.userId, userId), eq(mealLogs.logDate, logDate)));
}

export async function getWaterLogsForDay(userId: string, logDate: string) {
  return db
    .select()
    .from(waterLogs)
    .where(and(eq(waterLogs.userId, userId), eq(waterLogs.logDate, logDate)))
    .orderBy(asc(waterLogs.loggedAt));
}

export async function getLatestWeight(userId: string) {
  const [row] = await db
    .select()
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.loggedAt))
    .limit(1);
  return row ?? null;
}

export async function getProfile(userId: string) {
  const [row] = await db
    .select()
    .from(nutritionProfile)
    .where(eq(nutritionProfile.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function upsertProfile(userId: string, input: NutritionProfileInput) {
  const values = {
    sex: input.sex,
    birthDate: input.birth_date,
    heightCm: input.height_cm.toString(),
    activityLevel: input.activity_level,
    goal: input.goal,
    targetWeightKg: input.target_weight_kg?.toString() ?? null,
    calorieGoal: input.calorie_goal.toString(),
    waterGoalMl: input.water_goal_ml,
  };
  const [row] = await db
    .insert(nutritionProfile)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: nutritionProfile.userId, set: { ...values, updatedAt: new Date() } })
    .returning();
  return row;
}

const numOrUndefined = (v: number | null | undefined) =>
  v === undefined ? undefined : v === null ? null : v.toString();

/**
 * Upsert idempotente por (user, dia, slot). O `id` do cliente só vale na
 * primeira gravação — retries e edições posteriores caem no mesmo registro.
 * Campo ausente no payload = não mexe (PATCH semântico dentro do upsert).
 */
export async function upsertMeals(userId: string, items: MealUpsertInput[]) {
  return db.transaction(async (tx) => {
    const rows = [];
    for (const item of items) {
      const common = Object.fromEntries(
        Object.entries({
          description: item.description,
          calories: numOrUndefined(item.calories),
          proteinG: numOrUndefined(item.protein_g),
          carbsG: numOrUndefined(item.carbs_g),
          fatG: numOrUndefined(item.fat_g),
          isCompleted: item.is_completed,
        }).filter(([, v]) => v !== undefined),
      );

      const insertValues = {
        id: item.id,
        userId,
        logDate: item.log_date,
        mealSlot: item.meal_slot,
        ...common,
        completedAt: item.is_completed ? new Date() : null,
      };

      const updateSet = {
        ...common,
        ...(item.is_completed !== undefined && {
          // Reenvio de "concluída" mantém o horário original.
          completedAt: item.is_completed ? sql`coalesce(${mealLogs.completedAt}, now())` : null,
        }),
      };

      const [row] = await tx
        .insert(mealLogs)
        .values(insertValues)
        .onConflictDoUpdate({
          target: [mealLogs.userId, mealLogs.logDate, mealLogs.mealSlot],
          set: updateSet,
        })
        .returning();
      rows.push(row);
    }
    return rows;
  });
}

/**
 * Insert idempotente pelo id do cliente. Retry do mesmo id devolve a linha
 * existente; id colidindo com registro de OUTRO usuário não vaza nada
 * (retorna null → 409).
 */
export async function insertWater(userId: string, input: WaterInsertInput) {
  const [inserted] = await db
    .insert(waterLogs)
    .values({ id: input.id, userId, logDate: input.log_date, amountMl: input.amount_ml })
    .onConflictDoNothing({ target: waterLogs.id })
    .returning();
  if (inserted) return { row: inserted, created: true };

  const [existing] = await db
    .select()
    .from(waterLogs)
    .where(and(eq(waterLogs.id, input.id), eq(waterLogs.userId, userId)))
    .limit(1);
  return existing ? { row: existing, created: false } : null;
}

export async function deleteWater(userId: string, id: string) {
  const rows = await db
    .delete(waterLogs)
    .where(and(eq(waterLogs.id, id), eq(waterLogs.userId, userId)))
    .returning({ id: waterLogs.id });
  return rows.length > 0;
}

export async function upsertWeight(userId: string, input: WeightInsertInput) {
  const [row] = await db
    .insert(weightLogs)
    .values({ userId, loggedAt: input.logged_at, weightKg: input.weight_kg.toString() })
    .onConflictDoUpdate({
      target: [weightLogs.userId, weightLogs.loggedAt],
      set: { weightKg: input.weight_kg.toString() },
    })
    .returning();
  return row;
}
