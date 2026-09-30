import { apiRoute, created } from "@/lib/api/handler";
import { createTip, listAllTips, tipSchema } from "@/lib/modules/dicas/service";

export const GET = apiRoute({ guard: "master" }, async () => listAllTips());

/** POST — master publica uma dica (mentoria). */
export const POST = apiRoute({ guard: "master" }, async ({ userId, body }) =>
  created(await createTip(userId, await body(tipSchema))),
);
