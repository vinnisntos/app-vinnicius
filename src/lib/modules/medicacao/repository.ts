import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { medicationLogs, medications } from "@/lib/db/schema";
import type { CreateMedicationInput, MedicationLogInput, UpdateMedicationInput } from "./schema";

const numStr = (v: number | null | undefined) => (v === undefined ? undefined : v === null ? null : v.toString());

export async function listMedications(userId: string) {
  return db
    .select()
    .from(medications)
    .where(eq(medications.userId, userId))
    .orderBy(desc(medications.isActive), asc(medications.createdAt));
}

export async function getMedication(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(medications)
    .where(and(eq(medications.id, id), eq(medications.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function createMedication(userId: string, input: CreateMedicationInput) {
  const [row] = await db
    .insert(medications)
    .values({
      userId,
      name: input.name,
      category: input.category,
      route: input.route,
      doseAmount: numStr(input.dose_amount),
      doseUnit: input.dose_unit,
      frequency: input.frequency,
      daysOfWeek: input.days_of_week,
      startedOn: input.started_on,
      isActive: input.is_active,
      prescribedBy: input.prescribed_by,
      notes: input.notes,
    })
    .returning();
  return row;
}

export async function updateMedication(userId: string, id: string, input: UpdateMedicationInput) {
  const set = Object.fromEntries(
    Object.entries({
      name: input.name,
      category: input.category,
      route: input.route,
      doseAmount: numStr(input.dose_amount),
      doseUnit: input.dose_unit,
      frequency: input.frequency,
      daysOfWeek: input.days_of_week,
      startedOn: input.started_on,
      isActive: input.is_active,
      prescribedBy: input.prescribed_by,
      notes: input.notes,
    }).filter(([, v]) => v !== undefined),
  );
  if (Object.keys(set).length === 0) return getMedication(userId, id);
  const [row] = await db
    .update(medications)
    .set(set)
    .where(and(eq(medications.id, id), eq(medications.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteMedication(userId: string, id: string) {
  const rows = await db
    .delete(medications)
    .where(and(eq(medications.id, id), eq(medications.userId, userId)))
    .returning({ id: medications.id });
  return rows.length > 0;
}

export async function logsSince(userId: string, sinceDate: string) {
  return db
    .select()
    .from(medicationLogs)
    .where(and(eq(medicationLogs.userId, userId), gte(medicationLogs.logDate, sinceDate)))
    .orderBy(desc(medicationLogs.logDate), desc(medicationLogs.takenAt));
}

/** Últimos N logs de cada medicamento (para rodízio/última aplicação). */
export async function lastLogsFor(userId: string, medicationId: string, limit = 3) {
  return db
    .select()
    .from(medicationLogs)
    .where(and(eq(medicationLogs.userId, userId), eq(medicationLogs.medicationId, medicationId)))
    .orderBy(desc(medicationLogs.logDate), desc(medicationLogs.takenAt))
    .limit(limit);
}

/**
 * Registra uma aplicação. Idempotente pelo `id`. A dose do log é a que o
 * usuário informa (padrão: a prescrita cadastrada) — nunca derivada.
 * null = medicamento não é do usuário, ou id já usado por outro usuário.
 */
export async function insertLog(userId: string, medicationId: string, input: MedicationLogInput) {
  const med = await getMedication(userId, medicationId);
  if (!med) return null;

  const [inserted] = await db
    .insert(medicationLogs)
    .values({
      id: input.id,
      userId,
      medicationId,
      logDate: input.log_date,
      doseAmount: numStr(input.dose_amount ?? (med.doseAmount ? Number(med.doseAmount) : null)),
      doseUnit: input.dose_unit ?? med.doseUnit,
      injectionSite: input.injection_site ?? null,
      sideEffects: input.side_effects,
      severity: input.severity,
      notes: input.notes ?? null,
    })
    .onConflictDoNothing({ target: medicationLogs.id })
    .returning();
  if (inserted) return { row: inserted, created: true };

  const [existing] = await db
    .select()
    .from(medicationLogs)
    .where(and(eq(medicationLogs.id, input.id), eq(medicationLogs.userId, userId)))
    .limit(1);
  return existing ? { row: existing, created: false } : null;
}

export async function deleteLog(userId: string, logId: string) {
  const rows = await db
    .delete(medicationLogs)
    .where(and(eq(medicationLogs.id, logId), eq(medicationLogs.userId, userId)))
    .returning({ id: medicationLogs.id });
  return rows.length > 0;
}
