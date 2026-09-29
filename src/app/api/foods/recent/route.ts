import { apiRoute } from "@/lib/api/handler";
import { toFoodRow } from "@/lib/api/mappers-health";
import * as repository from "@/lib/modules/alimentos/repository";
import type { FoodSearchResponse } from "@/types/database";

/** GET /api/foods/recent — últimos alimentos do usuário (chips de 1 toque). */
export const GET = apiRoute({ guard: "access" }, async ({ userId }): Promise<FoodSearchResponse> => ({
  items: (await repository.recentFoods(userId)).map(toFoodRow),
}));
