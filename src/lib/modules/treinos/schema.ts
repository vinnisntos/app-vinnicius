import { z } from "zod";
import { DAY_LABELS } from "./calculations";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const createPlanSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao plano.").max(80),
});
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const upsertExerciseSchema = z.object({
  id: z.uuid().optional(),
  planId: z.uuid(),
  dayLabel: z.enum(DAY_LABELS),
  name: z.string().trim().min(1, "Dê um nome ao exercício.").max(120),
  targetSets: z.coerce.number().int().positive().max(20),
  targetReps: z.string().trim().min(1).max(30),
  orderIndex: z.coerce.number().int().nonnegative(),
});
export type UpsertExerciseInput = z.infer<typeof upsertExerciseSchema>;

export const deleteExerciseSchema = z.object({
  id: z.uuid(),
});
export type DeleteExerciseInput = z.infer<typeof deleteExerciseSchema>;

export const startSessionSchema = z.object({
  planId: z.uuid(),
  dayLabel: z.enum(DAY_LABELS),
  performedAt: isoDate,
});
export type StartSessionInput = z.infer<typeof startSessionSchema>;

export const logSetSchema = z.object({
  sessionId: z.uuid(),
  exerciseId: z.uuid(),
  setNumber: z.coerce.number().int().positive().max(20),
  repsDone: z.coerce.number().int().nonnegative().max(999),
  weightKg: z.coerce.number().nonnegative().max(500).optional(),
});
export type LogSetInput = z.infer<typeof logSetSchema>;

export const finishSessionSchema = z.object({
  sessionId: z.uuid(),
  notes: z.string().trim().max(500).optional(),
});
export type FinishSessionInput = z.infer<typeof finishSessionSchema>;
