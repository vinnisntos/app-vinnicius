import { z } from "zod";
import { apiRoute, notFound } from "@/lib/api/handler";
import { toMedicationRow } from "@/lib/api/mappers-health";
import * as repository from "@/lib/modules/medicacao/repository";
import { updateMedicationSchema } from "@/lib/modules/medicacao/schema";

/** PATCH — atualiza (ex.: nova dose prescrita, pausar com is_active=false). */
export const PATCH = apiRoute<"access", { id: string }>({ guard: "access" }, async ({ userId, params, body }) => {
  const row = await repository.updateMedication(userId, z.uuid().parse(params.id), await body(updateMedicationSchema));
  if (!row) throw notFound("Medicamento");
  return toMedicationRow(row);
});

/** DELETE — remove o medicamento e todo o histórico de aplicações dele. */
export const DELETE = apiRoute<"access", { id: string }>({ guard: "access" }, async ({ userId, params }) => {
  if (!(await repository.deleteMedication(userId, z.uuid().parse(params.id)))) throw notFound("Medicamento");
  return { deleted: true };
});
