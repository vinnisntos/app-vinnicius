import { apiRoute } from "@/lib/api/handler";
import { toMealLogRow } from "@/lib/api/mappers";
import * as repository from "@/lib/modules/alimentacao/api-repository";
import { mealUpsertBodySchema } from "@/lib/modules/alimentacao/api-schema";

/**
 * PUT /api/nutrition/meals — `MealLogUpsert` ou lote de até 20.
 * Idempotente: o front aplica o estado otimista, envia, e em falha de rede
 * reenvia o mesmo payload depois sem risco de duplicar.
 */
export const PUT = apiRoute({ guard: "access" }, async ({ userId, body }) => {
  const items = await body(mealUpsertBodySchema);
  return (await repository.upsertMeals(userId, items)).map(toMealLogRow);
});
