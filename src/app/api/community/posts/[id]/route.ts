import { z } from "zod";
import { apiRoute } from "@/lib/api/handler";
import { removePost } from "@/lib/modules/comunidade/service";

/** DELETE — autor apaga o próprio post (master apaga qualquer um). */
export const DELETE = apiRoute<"access", { id: string }>({ guard: "access" }, async ({ userId, access, params }) => {
  await removePost(userId, access, z.uuid().parse(params.id));
  return { deleted: true };
});
