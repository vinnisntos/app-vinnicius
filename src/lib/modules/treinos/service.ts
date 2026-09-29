import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { toProgramExerciseRow, toProgramWorkoutLogRow } from "@/lib/api/mappers-health";
import { db } from "@/lib/db/client";
import {
  programEnrollments,
  programExercises,
  programWorkoutLogs,
  programWorkouts,
  workoutPrograms,
  type WorkoutProgram,
} from "@/lib/db/schema";
import { getTodayIsoDate } from "@/lib/date";
import { isoDate } from "@/lib/modules/alimentacao/api-schema";
import { getUserTimezone } from "@/lib/modules/conta/repository";
import {
  WORKOUT_GOALS,
  WORKOUT_LEVELS,
  WORKOUT_LOCATIONS,
  type ProgramDetail,
  type ProgramWorkoutRow,
  type TrainingToday,
  type WorkoutGoal,
  type WorkoutKind,
  type WorkoutLevel,
  type WorkoutLocation,
  type WorkoutProgramRow,
} from "@/types/database";
import { getNextWorkout } from "./sequence";

export const programsQuery = z.object({
  goal: z.enum(WORKOUT_GOALS).optional(),
  level: z.enum(WORKOUT_LEVELS).optional(),
  location: z.enum(WORKOUT_LOCATIONS).optional(),
});

export const enrollSchema = z.object({ program_id: z.uuid() }).strict();

export const workoutLogSchema = z
  .object({
    id: z.uuid(),
    program_workout_id: z.uuid(),
    performed_on: isoDate,
    duration_minutes: z.number().int().min(1).max(600).nullable().optional(),
    effort: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    exercise_results: z
      .array(
        z.object({
          exercise_id: z.uuid(),
          sets_done: z.number().int().min(0).max(50).optional(),
          reps: z.string().max(40).optional(),
          weight_kg: z.number().min(0).max(1000).optional(),
        }),
      )
      .max(50)
      .nullable()
      .optional(),
  })
  .strict();

function toProgramRow(p: WorkoutProgram, workoutCount: number): WorkoutProgramRow {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    goal: p.goal as WorkoutGoal,
    level: p.level as WorkoutLevel,
    location: p.location as WorkoutLocation,
    days_per_week: p.daysPerWeek,
    duration_weeks: p.durationWeeks,
    session_minutes: p.sessionMinutes,
    summary: p.summary,
    description: p.description,
    workout_count: workoutCount,
  };
}

async function workoutCounts(programIds: string[]) {
  if (programIds.length === 0) return new Map<string, number>();
  const rows = await db
    .select({ programId: programWorkouts.programId, n: sql<number>`count(*)::int` })
    .from(programWorkouts)
    .where(inArray(programWorkouts.programId, programIds))
    .groupBy(programWorkouts.programId);
  return new Map(rows.map((r) => [r.programId, r.n]));
}

export async function listPrograms(filter: z.infer<typeof programsQuery>): Promise<WorkoutProgramRow[]> {
  const programs = await db
    .select()
    .from(workoutPrograms)
    .where(
      and(
        eq(workoutPrograms.isPublished, true),
        filter.goal ? eq(workoutPrograms.goal, filter.goal) : undefined,
        filter.level ? eq(workoutPrograms.level, filter.level) : undefined,
        filter.location ? eq(workoutPrograms.location, filter.location) : undefined,
      ),
    )
    .orderBy(asc(workoutPrograms.orderIndex));
  const counts = await workoutCounts(programs.map((p) => p.id));
  return programs.map((p) => toProgramRow(p, counts.get(p.id) ?? 0));
}

async function loadWorkouts(programId: string): Promise<ProgramWorkoutRow[]> {
  const workouts = await db
    .select()
    .from(programWorkouts)
    .where(eq(programWorkouts.programId, programId))
    .orderBy(asc(programWorkouts.sequence));
  const exercises = workouts.length
    ? await db
        .select()
        .from(programExercises)
        .where(inArray(programExercises.workoutId, workouts.map((w) => w.id)))
        .orderBy(asc(programExercises.orderIndex))
    : [];
  return workouts.map((w) => ({
    id: w.id,
    sequence: w.sequence,
    week: w.week,
    title: w.title,
    focus: w.focus,
    kind: w.kind as WorkoutKind,
    estimated_minutes: w.estimatedMinutes,
    exercises: exercises.filter((e) => e.workoutId === w.id).map(toProgramExerciseRow),
  }));
}

export async function getProgramDetail(slug: string): Promise<ProgramDetail | null> {
  const [program] = await db
    .select()
    .from(workoutPrograms)
    .where(and(eq(workoutPrograms.slug, slug), eq(workoutPrograms.isPublished, true)))
    .limit(1);
  if (!program) return null;
  const workouts = await loadWorkouts(program.id);
  return { program: toProgramRow(program, workouts.length), workouts };
}

async function activeEnrollment(userId: string) {
  const [row] = await db
    .select()
    .from(programEnrollments)
    .where(and(eq(programEnrollments.userId, userId), eq(programEnrollments.isActive, true)))
    .limit(1);
  return row ?? null;
}

/** Troca de programa: encerra o ativo e matricula no novo (uma transação). */
export async function enroll(userId: string, programId: string) {
  const today = getTodayIsoDate(await getUserTimezone(userId));
  return db.transaction(async (tx) => {
    const [program] = await tx
      .select({ id: workoutPrograms.id })
      .from(workoutPrograms)
      .where(and(eq(workoutPrograms.id, programId), eq(workoutPrograms.isPublished, true)))
      .limit(1);
    if (!program) return null;
    await tx
      .update(programEnrollments)
      .set({ isActive: false, endedAt: new Date() })
      .where(and(eq(programEnrollments.userId, userId), eq(programEnrollments.isActive, true)));
    const [row] = await tx
      .insert(programEnrollments)
      .values({ userId, programId, startedOn: today })
      .returning();
    return row;
  });
}

export async function unenroll(userId: string) {
  const rows = await db
    .update(programEnrollments)
    .set({ isActive: false, endedAt: new Date() })
    .where(and(eq(programEnrollments.userId, userId), eq(programEnrollments.isActive, true)))
    .returning({ id: programEnrollments.id });
  return rows.length > 0;
}

export async function getTrainingToday(userId: string): Promise<TrainingToday> {
  const today = getTodayIsoDate(await getUserTimezone(userId));
  const enrollment = await activeEnrollment(userId);
  const empty: TrainingToday = {
    enrollment: null,
    program: null,
    next_workout: null,
    done_today: false,
    completed_count: 0,
    total_sessions: null,
    program_completed: false,
    recent_logs: [],
  };
  if (!enrollment) return empty;

  const [program] = await db.select().from(workoutPrograms).where(eq(workoutPrograms.id, enrollment.programId)).limit(1);
  const workouts = await loadWorkouts(enrollment.programId);
  const logs = await db
    .select()
    .from(programWorkoutLogs)
    .where(eq(programWorkoutLogs.enrollmentId, enrollment.id))
    .orderBy(desc(programWorkoutLogs.performedOn), desc(programWorkoutLogs.createdAt));

  const linear = program.durationWeeks != null;
  const sequence = getNextWorkout(
    workouts,
    logs.map((l) => ({ programWorkoutId: l.programWorkoutId, performedOn: l.performedOn, createdAt: l.createdAt.toISOString() })),
    linear,
  );

  return {
    enrollment: { id: enrollment.id, started_on: enrollment.startedOn },
    program: toProgramRow(program, workouts.length),
    next_workout: sequence.next,
    done_today: logs.some((l) => l.performedOn === today),
    completed_count: sequence.completedCount,
    total_sessions: linear ? workouts.length : null,
    program_completed: sequence.programCompleted,
    recent_logs: logs.slice(0, 10).map(toProgramWorkoutLogRow),
  };
}

/**
 * Registra um treino do programa ativo. Idempotente pelo `id` e por
 * (matrícula, treino, dia). null = sem programa ativo ou treino de outro
 * programa.
 */
export async function logWorkout(userId: string, input: z.infer<typeof workoutLogSchema>) {
  const enrollment = await activeEnrollment(userId);
  if (!enrollment) return null;
  const [workout] = await db
    .select({ id: programWorkouts.id })
    .from(programWorkouts)
    .where(and(eq(programWorkouts.id, input.program_workout_id), eq(programWorkouts.programId, enrollment.programId)))
    .limit(1);
  if (!workout) return null;

  const [row] = await db
    .insert(programWorkoutLogs)
    .values({
      id: input.id,
      userId,
      enrollmentId: enrollment.id,
      programWorkoutId: input.program_workout_id,
      performedOn: input.performed_on,
      durationMinutes: input.duration_minutes ?? null,
      effort: input.effort ?? null,
      notes: input.notes ?? null,
      exerciseResults: input.exercise_results ?? null,
    })
    .onConflictDoUpdate({
      target: [programWorkoutLogs.enrollmentId, programWorkoutLogs.programWorkoutId, programWorkoutLogs.performedOn],
      set: {
        durationMinutes: input.duration_minutes ?? null,
        effort: input.effort ?? null,
        notes: input.notes ?? null,
        exerciseResults: input.exercise_results ?? null,
      },
    })
    .returning();
  return row;
}
