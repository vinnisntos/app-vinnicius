import { apiRoute } from "@/lib/api/handler";
import { toWeightLogRow } from "@/lib/api/mappers";
import * as repository from "@/lib/modules/alimentacao/api-repository";
import { weightInsertSchema } from "@/lib/modules/alimentacao/api-schema";

/** Uma pesagem por dia — reenviar no mesmo dia substitui. */
export const POST = apiRoute({ guard: "access" }, async ({ userId, body }) =>
  toWeightLogRow(await repository.upsertWeight(userId, await body(weightInsertSchema))),
);
