import { apiRoute, created } from "@/lib/api/handler";
import { toMedicationRow } from "@/lib/api/mappers-health";
import * as repository from "@/lib/modules/medicacao/repository";
import { createMedicationSchema } from "@/lib/modules/medicacao/schema";
import { getMedicationsOverview } from "@/lib/modules/medicacao/service";

const HELP = [
  "route.medicacao",
  "medications.dose_amount",
  "medication_logs.injection_site",
  "medication_logs.side_effects",
] as const;

/** GET /api/medications → `MedicationsResponse` (inclui aviso médico obrigatório). */
export const GET = apiRoute({ guard: "access", help: [...HELP] }, async ({ userId }) => getMedicationsOverview(userId));

/** POST /api/medications — `MedicationUpsert` → `MedicationRow` (201). */
export const POST = apiRoute({ guard: "access" }, async ({ userId, body }) =>
  created(toMedicationRow(await repository.createMedication(userId, await body(createMedicationSchema)))),
);
