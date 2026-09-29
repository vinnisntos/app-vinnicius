import { apiRoute } from "@/lib/api/handler";
import { getTrainingToday } from "@/lib/modules/treinos/service";

/** GET /api/training/today → `TrainingToday` (próximo treino pela sequência). */
export const GET = apiRoute(
  { guard: "access", help: ["route.treinos", "program_workout_logs.effort"] },
  async ({ userId }) => getTrainingToday(userId),
);
