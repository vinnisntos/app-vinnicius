import { z } from "zod";
import { FOOD_CATEGORIES, MEAL_SLOTS } from "@/types/database";
import { isoDate } from "@/lib/modules/alimentacao/api-schema";

export const foodSearchQuery = z.object({
  q: z.string().trim().max(60).optional(),
  category: z.enum(FOOD_CATEGORIES).optional(),
});

const servings = z.number().positive("Informe a quantidade.").max(20, "Máximo 20 porções.");

/** Espelha `MealItemAdd` de src/types/database.ts. */
export const mealItemAddSchema = z
  .object({
    id: z.uuid(),
    log_date: isoDate,
    meal_slot: z.enum(MEAL_SLOTS),
    servings,
    food_id: z.uuid().optional(),
    custom: z
      .object({
        name: z.string().trim().min(1, "Dê um nome.").max(120),
        kcal: z.number().min(0).max(5000),
        protein_g: z.number().min(0).max(500).default(0),
        carbs_g: z.number().min(0).max(1000).default(0),
        fat_g: z.number().min(0).max(500).default(0),
      })
      .optional(),
  })
  .strict()
  .refine((v) => Boolean(v.food_id) !== Boolean(v.custom), {
    message: "Escolha um alimento da lista ou informe valores próprios (um dos dois).",
    path: ["food_id"],
  });
export type MealItemAddInput = z.infer<typeof mealItemAddSchema>;
