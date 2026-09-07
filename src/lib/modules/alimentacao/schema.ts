import { z } from "zod";
import { MEAL_SLOTS } from "./calculations";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const updateNutritionProfileSchema = z.object({
  sex: z.enum(["M", "F"], { message: "Selecione o sexo biológico." }),
  birthDate: isoDate,
  heightCm: z.coerce
    .number()
    .positive("Altura deve ser maior que zero.")
    .max(280, "Altura inválida."),
  activityLevel: z.enum(
    ["sedentario", "leve", "moderado", "ativo", "muito_ativo"],
    { message: "Selecione o nível de atividade." },
  ),
  calorieGoal: z.coerce
    .number()
    .positive("Meta calórica deve ser maior que zero."),
  waterGoalMl: z.coerce
    .number()
    .int()
    .positive("Meta de água deve ser maior que zero."),
});
export type UpdateNutritionProfileInput = z.infer<
  typeof updateNutritionProfileSchema
>;

export const logWeightSchema = z.object({
  loggedAt: isoDate,
  weightKg: z.coerce
    .number()
    .positive("Peso deve ser maior que zero.")
    .max(400, "Peso inválido."),
});
export type LogWeightInput = z.infer<typeof logWeightSchema>;

export const toggleMealSchema = z.object({
  logDate: isoDate,
  mealSlot: z.enum(MEAL_SLOTS),
  isCompleted: z.boolean(),
  description: z.string().trim().max(280).optional(),
  calories: z.coerce.number().nonnegative().max(20000).optional(),
});
export type ToggleMealInput = z.infer<typeof toggleMealSchema>;

export const logWaterSchema = z.object({
  logDate: isoDate,
  amountMl: z.coerce
    .number()
    .int()
    .positive("Quantidade deve ser maior que zero.")
    .max(10000, "Quantidade inválida."),
});
export type LogWaterInput = z.infer<typeof logWaterSchema>;
