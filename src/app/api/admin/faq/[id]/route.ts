import { z } from "zod";
import { apiRoute, notFound } from "@/lib/api/handler";
import { toFaqItemRow } from "@/lib/api/mappers";
import * as repository from "@/lib/modules/admin/repository";
import { updateFaqItemSchema } from "@/lib/modules/admin/schema";

export const PATCH = apiRoute<"master", { id: string }>({ guard: "master" }, async ({ params, body }) => {
  const row = await repository.updateFaqItem(z.uuid().parse(params.id), await body(updateFaqItemSchema));
  if (!row) throw notFound("Pergunta");
  return toFaqItemRow(row);
});

export const DELETE = apiRoute<"master", { id: string }>({ guard: "master" }, async ({ params }) => {
  if (!(await repository.deleteFaqItem(z.uuid().parse(params.id)))) throw notFound("Pergunta");
  return { deleted: true };
});
