import { z } from "zod";
import { apiRoute, notFound } from "@/lib/api/handler";
import { deleteTip, updateTip, updateTipSchema } from "@/lib/modules/dicas/service";

/** PATCH — master edita/despublica uma dica. */
export const PATCH = apiRoute<"master", { id: string }>({ guard: "master" }, async ({ params, body }) => {
  const row = await updateTip(z.uuid().parse(params.id), await body(updateTipSchema));
  if (!row) throw notFound("Dica");
  return row;
});

export const DELETE = apiRoute<"master", { id: string }>({ guard: "master" }, async ({ params }) => {
  if (!(await deleteTip(z.uuid().parse(params.id)))) throw notFound("Dica");
  return { deleted: true };
});
