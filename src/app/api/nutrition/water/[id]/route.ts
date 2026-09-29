import { z } from "zod";
import { apiRoute, notFound } from "@/lib/api/handler";
import * as repository from "@/lib/modules/alimentacao/api-repository";

/** Desfazer um copo. Só apaga registro do próprio usuário. */
export const DELETE = apiRoute<"access", { id: string }>({ guard: "access" }, async ({ userId, params }) => {
  if (!(await repository.deleteWater(userId, z.uuid().parse(params.id)))) throw notFound("Registro");
  return { deleted: true };
});
