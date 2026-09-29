import { z } from "zod";
import {
  ACTIVITY_LEVELS,
  MEAL_SLOTS,
  NUTRITION_GOALS,
  SEXES,
} from "@/types/database";

/**
 * Schemas das rotas `/api/nutrition/*` — snake_case, espelhando os tipos de
 * src/types/database.ts. (schema.ts ao lado é o dos Server Actions legados.)
 */

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD).")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Data inválida.");

const kcal = z.number().nonnegative().max(20000);
const grams = z.number().nonnegative().max(2000);

export const dayQuerySchema = z.object({ date: isoDate.optional() });

export const nutritionProfileSchema = z.object({
  sex: z.enum(SEXES, { message: "Selecione o sexo biológico." }),
  birth_date: isoDate,
  height_cm: z.number().min(80, "Altura inválida.").max(260, "Altura inválida."),
  activity_level: z.enum(ACTIVITY_LEVELS),
  goal: z.enum(NUTRITION_GOALS).default("emagrecer"),
  target_weight_kg: z.number().min(25).max(400).nullable().default(null),
  calorie_goal: kcal.positive().default(2000),
  water_goal_ml: z.number().int().min(500).max(10000).default(3000),
});
export type NutritionProfileInput = z.infer<typeof nutritionProfileSchema>;

/** `MealLogUpsert` — id gerado no cliente; upsert por (dia, slot). */
export const mealUpsertSchema = z.object({
  id: z.uuid(),
  log_date: isoDate,
  meal_slot: z.enum(MEAL_SLOTS),
  description: z.string().trim().max(500).nullable().optional(),
  calories: kcal.nullable().optional(),
  protein_g: grams.nullable().optional(),
  carbs_g: grams.nullable().optional(),
  fat_g: grams.nullable().optional(),
  is_completed: z.boolean().optional(),
});
export type MealUpsertInput = z.infer<typeof mealUpsertSchema>;

/** Aceita um item ou lote (fila offline reenviada de uma vez). */
export const mealUpsertBodySchema = z
  .union([mealUpsertSchema, z.array(mealUpsertSchema).min(1).max(20)])
  .transform((v) => (Array.isArray(v) ? v : [v]));

export const waterInsertSchema = z.object({
  id: z.uuid(),
  log_date: isoDate,
  amount_ml: z.number().int().positive("Quantidade inválida.").max(5000, "Máximo 5 L por registro."),
});
export type WaterInsertInput = z.infer<typeof waterInsertSchema>;

export const weightInsertSchema = z.object({
  logged_at: isoDate,
  weight_kg: z.number().min(25, "Peso inválido.").max(400, "Peso inválido."),
});
export type WeightInsertInput = z.infer<typeof weightInsertSchema>;
