import { apiRoute } from "@/lib/api/handler";
import { toMealLogRow } from "@/lib/api/mappers";
import { track } from "@/lib/modules/analytics/track";
import * as repository from "@/lib/modules/alimentacao/api-repository";
import { mealUpsertBodySchema } from "@/lib/modules/alimentacao/api-schema";

/**
 * PUT /api/nutrition/meals — `MealLogUpsert` ou lote de até 20.
 * Idempotente: o front aplica o estado otimista, envia, e em falha de rede
 * reenvia o mesmo payload depois sem risco de duplicar.
 */
export const PUT = apiRoute({ guard: "access" }, async ({ userId, body }) => {
  const items = await body(mealUpsertBodySchema);
  const rows = (await repository.upsertMeals(userId, items)).map(toMealLogRow);
  if (rows.some((row) => row.is_completed)) await track(userId, "meal_logged");
  return rows;
});
