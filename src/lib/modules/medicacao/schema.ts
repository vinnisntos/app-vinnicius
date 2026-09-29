import { z } from "zod";
import {
  DOSE_UNITS,
  INJECTION_SITES,
  MEDICATION_CATEGORIES,
  MEDICATION_FREQUENCIES,
  MEDICATION_ROUTES,
  SIDE_EFFECTS,
} from "@/types/database";
import { isoDate } from "@/lib/modules/alimentacao/api-schema";

const daysOfWeek = z
  .array(z.number().int().min(0).max(6))
  .max(7)
  .transform((d) => [...new Set(d)].sort((a, b) => a - b));

/** Espelha `MedicationUpsert`. A dose é a PRESCRITA — só registramos. */
const medicationFields = {
  name: z.string().trim().min(1, "Informe o nome.").max(80),
  category: z.enum(MEDICATION_CATEGORIES),
  route: z.enum(MEDICATION_ROUTES),
  dose_unit: z.enum(DOSE_UNITS),
  frequency: z.enum(MEDICATION_FREQUENCIES),
  dose_amount: z.number().positive("Dose inválida.").max(10000).nullable(),
  days_of_week: daysOfWeek.nullable(),
  started_on: isoDate.nullable(),
  is_active: z.boolean(),
  prescribed_by: z.string().trim().max(120).nullable(),
  notes: z.string().trim().max(1000).nullable(),
};

const requireDaysForWeekly = (v: { frequency?: string; days_of_week?: number[] | null }) =>
  !(v.frequency === "semanal" || v.frequency === "quinzenal") || (v.days_of_week?.length ?? 0) > 0;
const daysMessage = { message: "Escolha o dia da semana da aplicação.", path: ["days_of_week"] };

export const createMedicationSchema = z
  .object({
    ...medicationFields,
    dose_amount: medicationFields.dose_amount.default(null),
    days_of_week: medicationFields.days_of_week.default(null),
    started_on: medicationFields.started_on.default(null),
    is_active: medicationFields.is_active.default(true),
    prescribed_by: medicationFields.prescribed_by.default(null),
    notes: medicationFields.notes.default(null),
  })
  .strict()
  .refine(requireDaysForWeekly, daysMessage);
export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;

export const updateMedicationSchema = z.object(medicationFields).partial().strict();
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;

/** Espelha `MedicationLogInsert`. */
export const medicationLogSchema = z
  .object({
    id: z.uuid(),
    log_date: isoDate,
    dose_amount: z.number().positive().max(10000).nullable().optional(),
    dose_unit: z.enum(DOSE_UNITS).nullable().optional(),
    injection_site: z.enum(INJECTION_SITES).nullable().optional(),
    side_effects: z
      .array(z.enum(SIDE_EFFECTS))
      .max(SIDE_EFFECTS.length)
      .transform((e) => [...new Set(e)])
      .default([]),
    severity: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).default(0),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();
export type MedicationLogInput = z.infer<typeof medicationLogSchema>;
