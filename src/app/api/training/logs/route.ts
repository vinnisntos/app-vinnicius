import { ApiHttpError, apiRoute } from "@/lib/api/handler";
import { getTrainingToday, logWorkout, workoutLogSchema } from "@/lib/modules/treinos/service";

/** POST — `ProgramWorkoutLogInsert` → `TrainingToday` já avançado para o próximo treino. */
export const POST = apiRoute({ guard: "access" }, async ({ userId, body }) => {
  const row = await logWorkout(userId, await body(workoutLogSchema));
  if (!row) {
    throw new ApiHttpError(409, "conflict", "Esse treino não é do seu programa ativo.");
  }
  return getTrainingToday(userId);
});
