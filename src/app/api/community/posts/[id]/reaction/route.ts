import { z } from "zod";
import { apiRoute } from "@/lib/api/handler";
import { reactionSchema } from "@/lib/modules/comunidade/schema";
import { react } from "@/lib/modules/comunidade/service";

/** PUT { kind } define/troca a reação; DELETE remove. Ambos → `FeedPost` atualizado. */
export const PUT = apiRoute<"access", { id: string }>({ guard: "access" }, async ({ userId, access, params, body }) =>
  react(userId, access, z.uuid().parse(params.id), (await body(reactionSchema)).kind),
);

export const DELETE = apiRoute<"access", { id: string }>({ guard: "access" }, async ({ userId, access, params }) =>
  react(userId, access, z.uuid().parse(params.id), null),
);
