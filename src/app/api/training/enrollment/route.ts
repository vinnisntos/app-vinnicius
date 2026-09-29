import { apiRoute, notFound } from "@/lib/api/handler";
import { enroll, enrollSchema, getTrainingToday, unenroll } from "@/lib/modules/treinos/service";

/** POST { program_id } — entra no programa (encerra o ativo). → `TrainingToday` */
export const POST = apiRoute({ guard: "access" }, async ({ userId, body }) => {
  const { program_id } = await body(enrollSchema);
  if (!(await enroll(userId, program_id))) throw notFound("Programa");
  return getTrainingToday(userId);
});

/** DELETE — sai do programa ativo (histórico preservado). */
export const DELETE = apiRoute({ guard: "access" }, async ({ userId }) => {
  if (!(await unenroll(userId))) throw notFound("Programa ativo");
  return getTrainingToday(userId);
});
