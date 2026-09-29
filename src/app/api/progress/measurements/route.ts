import { apiRoute } from "@/lib/api/handler";
import { measurementSchema, upsertMeasurement } from "@/lib/modules/progresso/service";

/** PUT — `BodyMeasurementUpsert`, um registro por dia (campos ausentes não apagam). */
export const PUT = apiRoute({ guard: "access" }, async ({ userId, body }) =>
  upsertMeasurement(userId, await body(measurementSchema)),
);
