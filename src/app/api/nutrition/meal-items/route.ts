import { apiRoute, ApiHttpError } from "@/lib/api/handler";
import { toMealLogRow } from "@/lib/api/mappers";
import { toMealLogItemRow } from "@/lib/api/mappers-health";
import * as repository from "@/lib/modules/alimentos/repository";
import { mealItemAddSchema } from "@/lib/modules/alimentos/schema";

/**
 * POST /api/nutrition/meal-items — `MealItemAdd` → `{ meal, items }`.
 * Cria a refeição do slot se preciso e a marca como concluída; totais
 * recalculados no banco. Idempotente pelo `id` do item.
 */
export const POST = apiRoute({ guard: "access" }, async ({ userId, body }) => {
  const result = await repository.addMealItem(userId, await body(mealItemAddSchema));
  if (!result) throw new ApiHttpError(422, "validation", "Alimento não encontrado.", { food_id: ["Alimento não encontrado."] });
  return { meal: toMealLogRow(result.meal), items: result.items.map(toMealLogItemRow) };
});
