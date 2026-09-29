import { z } from "zod";
import { apiRoute, notFound } from "@/lib/api/handler";
import { toPostRow } from "@/lib/api/mappers";
import * as repository from "@/lib/modules/admin/repository";
import { moderatePostSchema } from "@/lib/modules/admin/schema";

/** Moderação: ocultar/reexibir post (com motivo) ou forçar privado. */
export const PATCH = apiRoute<"master", { id: string }>({ guard: "master" }, async ({ params, body }) => {
  const row = await repository.moderatePost(z.uuid().parse(params.id), await body(moderatePostSchema));
  if (!row) throw notFound("Post");
  return toPostRow(row);
});
