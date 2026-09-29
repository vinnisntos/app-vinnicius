import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth";

/** Programas de treino prontos (catálogo do master). */
export const workoutPrograms = pgTable("workout_programs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  goal: text("goal").notNull(),
  level: text("level").notNull(),
  location: text("location").notNull(),
  daysPerWeek: smallint("days_per_week").notNull(),
  durationWeeks: smallint("duration_weeks"), // null = rotina que se repete
  sessionMinutes: smallint("session_minutes"),
  summary: text("summary").notNull(),
  description: text("description"),
  isPublished: boolean("is_published").notNull().default(true),
  orderIndex: smallint("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const programWorkouts = pgTable("program_workouts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: uuid("program_id")
    .notNull()
    .references(() => workoutPrograms.id, { onDelete: "cascade" }),
  sequence: smallint("sequence").notNull(),
  week: smallint("week"),
  title: text("title").notNull(),
  focus: text("focus"),
  kind: text("kind").notNull(), // forca|cardio|corrida|hiit|mobilidade
  estimatedMinutes: smallint("estimated_minutes"),
});

export const programExercises = pgTable("program_exercises", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  workoutId: uuid("workout_id")
    .notNull()
    .references(() => programWorkouts.id, { onDelete: "cascade" }),
  orderIndex: smallint("order_index").notNull().default(0),
  name: text("name").notNull(),
  sets: smallint("sets"),
  reps: text("reps"),
  restSeconds: smallint("rest_seconds"),
  durationSeconds: integer("duration_seconds"),
  distanceM: integer("distance_m"),
  intensity: text("intensity"),
  notes: text("notes"),
});

export const programEnrollments = pgTable("program_enrollments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  programId: uuid("program_id")
    .notNull()
    .references(() => workoutPrograms.id, { onDelete: "cascade" }),
  startedOn: date("started_on").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const programWorkoutLogs = pgTable("program_workout_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  enrollmentId: uuid("enrollment_id")
    .notNull()
    .references(() => programEnrollments.id, { onDelete: "cascade" }),
  programWorkoutId: uuid("program_workout_id")
    .notNull()
    .references(() => programWorkouts.id, { onDelete: "cascade" }),
  performedOn: date("performed_on").notNull(),
  durationMinutes: smallint("duration_minutes"),
  effort: smallint("effort"),
  notes: text("notes"),
  exerciseResults: jsonb("exercise_results"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type WorkoutProgram = typeof workoutPrograms.$inferSelect;
export type ProgramWorkout = typeof programWorkouts.$inferSelect;
export type ProgramExercise = typeof programExercises.$inferSelect;
export type ProgramEnrollment = typeof programEnrollments.$inferSelect;
export type ProgramWorkoutLog = typeof programWorkoutLogs.$inferSelect;
