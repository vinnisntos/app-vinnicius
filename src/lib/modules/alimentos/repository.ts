import { and, asc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { foods, mealLogItems, mealLogs } from "@/lib/db/schema";
import { scaleNutrients } from "@/lib/modules/treinos/sequence";
import type { FoodCategory } from "@/types/database";
import type { MealItemAddInput } from "./schema";

const escapeLike = (v: string) => v.replace(/[%_\\]/g, (c) => `\\${c}`);

/** Busca no catálogo publicado. Sem termo = lista por categoria/nome. */
export async function searchFoods(input: { q?: string; category?: FoodCategory }) {
  return db
    .select()
    .from(foods)
    .where(
      and(
        eq(foods.isPublished, true),
        input.q ? ilike(foods.name, `%${escapeLike(input.q)}%`) : undefined,
        input.category ? eq(foods.category, input.category) : undefined,
      ),
    )
    .orderBy(asc(foods.name))
    .limit(40);
}

/** Últimos alimentos distintos que o usuário registrou — chips de 1 toque. */
export async function recentFoods(userId: string, limit = 12) {
  const rows = await db.execute<{ food_id: string }>(sql`
    select food_id from (
      select distinct on (food_id) food_id, created_at
      from public.meal_log_items
      where user_id = ${userId} and food_id is not null
      order by food_id, created_at desc
    ) t
    order by created_at desc
    limit ${limit}
  `);
  const ids = rows.map((r) => r.food_id);
  if (ids.length === 0) return [];
  const found = await db.select().from(foods).where(and(inArray(foods.id, ids), eq(foods.isPublished, true)));
  const byId = new Map(found.map((f) => [f.id, f]));
  return ids.map((id) => byId.get(id)).filter((f) => f !== undefined);
}

export async function itemsForMeals(userId: string, mealIds: string[]) {
  if (mealIds.length === 0) return [];
  return db
    .select()
    .from(mealLogItems)
    .where(and(eq(mealLogItems.userId, userId), inArray(mealLogItems.mealLogId, mealIds)))
    .orderBy(asc(mealLogItems.createdAt));
}

/**
 * Adiciona um item à refeição do dia/slot — cria a refeição se não existir
 * e a marca como concluída (registrar o que comeu = comeu). Os totais da
 * refeição são recalculados pelo trigger do banco.
 *
 * Idempotente pelo `id` do item: reenvio devolve o estado atual.
 * Retorna null se o `food_id` não existir/não estiver publicado ou se o id
 * do item já pertencer a outro usuário.
 */
export async function addMealItem(userId: string, input: MealItemAddInput) {
  return db.transaction(async (tx) => {
    let base: { name: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number };
    if (input.food_id) {
      const [food] = await tx
        .select()
        .from(foods)
        .where(and(eq(foods.id, input.food_id), eq(foods.isPublished, true)))
        .limit(1);
      if (!food) return null;
      base = {
        name: `${food.name} · ${food.portionLabel}`,
        kcal: Number(food.kcal),
        protein_g: Number(food.proteinG),
        carbs_g: Number(food.carbsG),
        fat_g: Number(food.fatG),
      };
    } else {
      base = { ...input.custom!, protein_g: input.custom!.protein_g, carbs_g: input.custom!.carbs_g, fat_g: input.custom!.fat_g };
    }
    const totals = scaleNutrients(base, input.servings);

    const [meal] = await tx
      .insert(mealLogs)
      .values({
        userId,
        logDate: input.log_date,
        mealSlot: input.meal_slot,
        isCompleted: true,
        completedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [mealLogs.userId, mealLogs.logDate, mealLogs.mealSlot],
        set: { isCompleted: true, completedAt: sql`coalesce(${mealLogs.completedAt}, now())` },
      })
      .returning();

    const [inserted] = await tx
      .insert(mealLogItems)
      .values({
        id: input.id,
        userId,
        mealLogId: meal.id,
        foodId: input.food_id ?? null,
        name: base.name,
        servings: input.servings.toString(),
        kcal: totals.kcal.toString(),
        proteinG: totals.protein_g.toString(),
        carbsG: totals.carbs_g.toString(),
        fatG: totals.fat_g.toString(),
      })
      .onConflictDoNothing({ target: mealLogItems.id })
      .returning({ id: mealLogItems.id, userId: mealLogItems.userId });

    if (!inserted) {
      const [existing] = await tx
        .select({ userId: mealLogItems.userId })
        .from(mealLogItems)
        .where(eq(mealLogItems.id, input.id))
        .limit(1);
      if (existing?.userId !== userId) return null;
    }

    const [freshMeal] = await tx.select().from(mealLogs).where(eq(mealLogs.id, meal.id)).limit(1);
    const items = await tx
      .select()
      .from(mealLogItems)
      .where(eq(mealLogItems.mealLogId, meal.id))
      .orderBy(asc(mealLogItems.createdAt));
    return { meal: freshMeal, items };
  });
}

export async function deleteMealItem(userId: string, itemId: string) {
  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(mealLogItems)
      .where(and(eq(mealLogItems.id, itemId), eq(mealLogItems.userId, userId)))
      .returning({ mealLogId: mealLogItems.mealLogId });
    if (!deleted) return null;
    const [meal] = await tx.select().from(mealLogs).where(eq(mealLogs.id, deleted.mealLogId)).limit(1);
    const items = await tx
      .select()
      .from(mealLogItems)
      .where(eq(mealLogItems.mealLogId, deleted.mealLogId))
      .orderBy(asc(mealLogItems.createdAt));
    return { meal, items };
  });
}
