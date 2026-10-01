import { z } from "zod";
import { apiRoute, created, notFound } from "@/lib/api/handler";
import { toMedicationLogRow } from "@/lib/api/mappers-health";
import { track } from "@/lib/modules/analytics/track";
import * as repository from "@/lib/modules/medicacao/repository";
import { medicationLogSchema } from "@/lib/modules/medicacao/schema";

/**
 * POST /api/medications/:id/logs — `MedicationLogInsert` → `MedicationLogRow`.
 * 201 na 1ª vez, 200 em retry do mesmo id. Sem dose no corpo = usa a
 * prescrita cadastrada.
 */
export const POST = apiRoute<"access", { id: string }>({ guard: "access" }, async ({ userId, params, body }) => {
  const result = await repository.insertLog(userId, z.uuid().parse(params.id), await body(medicationLogSchema));
  if (!result) throw notFound("Medicamento");
  const row = toMedicationLogRow(result.row);
  if (result.created) await track(userId, "medication_logged");
  return result.created ? created(row) : row;
});
