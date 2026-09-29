import { apiRoute } from "@/lib/api/handler";
import { toNutritionProfileRow } from "@/lib/api/mappers";
import * as repository from "@/lib/modules/alimentacao/api-repository";
import { nutritionProfileSchema } from "@/lib/modules/alimentacao/api-schema";

const HELP = ["nutrition_profile.activity_level", "metric.tdee"] as const;

export const GET = apiRoute({ guard: "access", help: [...HELP] }, async ({ userId }) => {
  const profile = await repository.getProfile(userId);
  return profile ? toNutritionProfileRow(profile) : null;
});

/** Cria ou substitui o perfil nutricional (base do TDEE). */
export const PUT = apiRoute({ guard: "access" }, async ({ userId, body }) =>
  toNutritionProfileRow(await repository.upsertProfile(userId, await body(nutritionProfileSchema))),
);
