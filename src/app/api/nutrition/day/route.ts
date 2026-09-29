import { apiRoute } from "@/lib/api/handler";
import { dayQuerySchema } from "@/lib/modules/alimentacao/api-schema";
import { getNutritionDay, resolveDate } from "@/lib/modules/alimentacao/service";

/** GET /api/nutrition/day?date=YYYY-MM-DD (default: hoje no fuso do usuário) */
export const GET = apiRoute(
  {
    guard: "access",
    help: ["metric.tdee", "metric.bmr", "meal_logs.calories", "water_logs.amount_ml"],
  },
  async ({ userId, query }) => {
    const { date } = query(dayQuerySchema);
    return getNutritionDay(userId, await resolveDate(userId, date));
  },
);
