import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  workoutExercises,
  workoutPlans,
  workoutSessions,
  workoutSetLogs,
} from "@/lib/db/schema";
import type { DayLabel } from "./calculations";
import type {
  CreatePlanInput,
  FinishSessionInput,
  LogSetInput,
  StartSessionInput,
  UpsertExerciseInput,
} from "./schema";

export async function getActivePlan(userId: string) {
  const [plan] = await db
    .select()
    .from(workoutPlans)
    .where(and(eq(workoutPlans.userId, userId), eq(workoutPlans.isActive, true)))
    .limit(1);
  return plan ?? null;
}

export async function getExercisesByPlan(planId: string) {
  return db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.planId, planId))
    .orderBy(asc(workoutExercises.dayLabel), asc(workoutExercises.orderIndex));
}

export async function getLastSessionDayLabel(
  userId: string,
): Promise<DayLabel | null> {
  const [last] = await db
    .select({ dayLabel: workoutSessions.dayLabel })
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, userId))
    .orderBy(desc(workoutSessions.performedAt))
    .limit(1);
  return (last?.dayLabel as DayLabel) ?? null;
}

export async function getSessionByDate(userId: string, performedAt: string) {
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.performedAt, performedAt),
      ),
    )
    .limit(1);
  return session ?? null;
}

export async function getSessionSets(sessionId: string) {
  return db
    .select()
    .from(workoutSetLogs)
    .where(eq(workoutSetLogs.sessionId, sessionId));
}

export type SessionHistoryEntry = {
  id: string;
  dayLabel: string;
  performedAt: string;
  notes: string | null;
  volume: number;
};

export async function getWorkoutHistory(
  userId: string,
  limit = 8,
): Promise<SessionHistoryEntry[]> {
  const rows = await db
    .select({
      id: workoutSessions.id,
      dayLabel: workoutSessions.dayLabel,
      performedAt: workoutSessions.performedAt,
      notes: workoutSessions.notes,
      volume: sql<number>`coalesce(sum(${workoutSetLogs.repsDone}), 0)`.mapWith(
        Number,
      ),
    })
    .from(workoutSessions)
    .leftJoin(workoutSetLogs, eq(workoutSetLogs.sessionId, workoutSessions.id))
    .where(eq(workoutSessions.userId, userId))
    .groupBy(workoutSessions.id)
    .orderBy(desc(workoutSessions.performedAt))
    .limit(limit);

  return rows;
}

export async function createPlan(userId: string, input: CreatePlanInput) {
  const [plan] = await db
    .insert(workoutPlans)
    .values({ userId, name: input.name, isActive: true })
    .returning();
  return plan;
}

export async function upsertExercise(
  userId: string,
  input: UpsertExerciseInput,
) {
  // Confere posse do plano antes de inserir ou atualizar — planId/id vêm do
  // cliente, nunca confiar sem checar contra o user_id da sessão.
  const [plan] = await db
    .select({ id: workoutPlans.id })
    .from(workoutPlans)
    .where(and(eq(workoutPlans.id, input.planId), eq(workoutPlans.userId, userId)))
    .limit(1);
  if (!plan) return null;

  if (input.id) {
    const [updated] = await db
      .update(workoutExercises)
      .set({
        dayLabel: input.dayLabel,
        name: input.name,
        targetSets: input.targetSets,
        targetReps: input.targetReps,
        orderIndex: input.orderIndex,
      })
      .where(
        and(eq(workoutExercises.id, input.id), eq(workoutExercises.planId, plan.id)),
      )
      .returning();
    return updated ?? null;
  }

  const [created] = await db
    .insert(workoutExercises)
    .values({
      planId: input.planId,
      dayLabel: input.dayLabel,
      name: input.name,
      targetSets: input.targetSets,
      targetReps: input.targetReps,
      orderIndex: input.orderIndex,
    })
    .returning();
  return created;
}

export async function deleteExercise(userId: string, exerciseId: string) {
  const ownedPlans = await db
    .select({ id: workoutPlans.id })
    .from(workoutPlans)
    .where(eq(workoutPlans.userId, userId));
  const ownedPlanIds = ownedPlans.map((p) => p.id);
  if (ownedPlanIds.length === 0) return;

  await db
    .delete(workoutExercises)
    .where(
      and(
        eq(workoutExercises.id, exerciseId),
        inArray(workoutExercises.planId, ownedPlanIds),
      ),
    );
}

export async function startSession(userId: string, input: StartSessionInput) {
  const [session] = await db
    .insert(workoutSessions)
    .values({
      userId,
      planId: input.planId,
      dayLabel: input.dayLabel,
      performedAt: input.performedAt,
    })
    .onConflictDoUpdate({
      target: [workoutSessions.userId, workoutSessions.performedAt],
      set: { dayLabel: input.dayLabel },
    })
    .returning();
  return session;
}

export async function logSet(userId: string, input: LogSetInput) {
  // Confere que a sessão é do usuário antes de gravar a série.
  const [session] = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(
      and(eq(workoutSessions.id, input.sessionId), eq(workoutSessions.userId, userId)),
    )
    .limit(1);
  if (!session) return null;

  const [set] = await db
    .insert(workoutSetLogs)
    .values({
      sessionId: input.sessionId,
      exerciseId: input.exerciseId,
      setNumber: input.setNumber,
      repsDone: input.repsDone,
      weightKg: input.weightKg != null ? input.weightKg.toString() : null,
    })
    .onConflictDoUpdate({
      target: [
        workoutSetLogs.sessionId,
        workoutSetLogs.exerciseId,
        workoutSetLogs.setNumber,
      ],
      set: {
        repsDone: input.repsDone,
        weightKg: input.weightKg != null ? input.weightKg.toString() : null,
      },
    })
    .returning();
  return set;
}

export async function finishSession(userId: string, input: FinishSessionInput) {
  await db
    .update(workoutSessions)
    .set({ notes: input.notes ?? null })
    .where(
      and(eq(workoutSessions.id, input.sessionId), eq(workoutSessions.userId, userId)),
    );
}
