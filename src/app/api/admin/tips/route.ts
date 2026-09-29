import { apiRoute, created } from "@/lib/api/handler";
import { createTip, tipSchema } from "@/lib/modules/dicas/service";

/** POST — master publica uma dica (mentoria). */
export const POST = apiRoute({ guard: "master" }, async ({ userId, body }) =>
  created(await createTip(userId, await body(tipSchema))),
);
