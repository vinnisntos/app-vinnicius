import { z } from "zod";
import { apiRoute, notFound } from "@/lib/api/handler";
import { toMealLogRow } from "@/lib/api/mappers";
import { toMealLogItemRow } from "@/lib/api/mappers-health";
import * as repository from "@/lib/modules/alimentos/repository";

/** DELETE — remove o item e devolve a refeição com os totais recalculados. */
export const DELETE = apiRoute<"access", { id: string }>({ guard: "access" }, async ({ userId, params }) => {
  const result = await repository.deleteMealItem(userId, z.uuid().parse(params.id));
  if (!result) throw notFound("Item");
  return { meal: toMealLogRow(result.meal), items: result.items.map(toMealLogItemRow) };
});
