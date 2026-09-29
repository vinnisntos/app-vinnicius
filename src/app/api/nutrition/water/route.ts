import { apiRoute, ApiHttpError, created } from "@/lib/api/handler";
import { toWaterLogRow } from "@/lib/api/mappers";
import * as repository from "@/lib/modules/alimentacao/api-repository";
import { waterInsertSchema } from "@/lib/modules/alimentacao/api-schema";

/** POST /api/nutrition/water — 201 na 1ª vez, 200 em retry do mesmo id. */
export const POST = apiRoute({ guard: "access" }, async ({ userId, body }) => {
  const result = await repository.insertWater(userId, await body(waterInsertSchema));
  if (!result) throw new ApiHttpError(409, "conflict", "Identificador já utilizado.");
  const row = toWaterLogRow(result.row);
  return result.created ? created(row) : row;
});
