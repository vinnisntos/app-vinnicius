import { z } from "zod";
import { apiRoute, notFound } from "@/lib/api/handler";
import * as repository from "@/lib/modules/medicacao/repository";

/** DELETE — desfaz um registro de aplicação. */
export const DELETE = apiRoute<"access", { logId: string }>({ guard: "access" }, async ({ userId, params }) => {
  if (!(await repository.deleteLog(userId, z.uuid().parse(params.logId)))) throw notFound("Registro");
  return { deleted: true };
});
