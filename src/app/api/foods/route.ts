import { apiRoute } from "@/lib/api/handler";
import { toFoodRow } from "@/lib/api/mappers-health";
import * as repository from "@/lib/modules/alimentos/repository";
import { foodSearchQuery } from "@/lib/modules/alimentos/schema";
import type { FoodSearchResponse } from "@/types/database";

/** GET /api/foods?q=frango&category=proteina — catálogo publicado (até 40). */
export const GET = apiRoute(
  { guard: "access", help: ["meal_log_items.servings", "metric.macros"] },
  async ({ query }): Promise<FoodSearchResponse> => ({
    items: (await repository.searchFoods(query(foodSearchQuery))).map(toFoodRow),
  }),
);
