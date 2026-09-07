import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  numeric,
  pgTable,
  smallint,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth";

export const workoutPlans = pgTable("workout_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const workoutExercises = pgTable("workout_exercises", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: uuid("plan_id")
    .notNull()
    .references(() => workoutPlans.id, { onDelete: "cascade" }),
  dayLabel: text("day_label").notNull(), // 'A' | 'B'
  name: text("name").notNull(),
  targetSets: smallint("target_sets").notNull(),
  targetReps: text("target_reps").notNull(),
  orderIndex: smallint("order_index").notNull().default(0),
});

export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  planId: uuid("plan_id")
    .notNull()
    .references(() => workoutPlans.id, { onDelete: "cascade" }),
  dayLabel: text("day_label").notNull(),
  performedAt: date("performed_at").notNull(),
  notes: text("notes"),
});

export const workoutSetLogs = pgTable("workout_set_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => workoutExercises.id, { onDelete: "cascade" }),
  setNumber: smallint("set_number").notNull(),
  repsDone: smallint("reps_done").notNull(),
  weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
});

export type WorkoutPlan = typeof workoutPlans.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type NewWorkoutSession = typeof workoutSessions.$inferInsert;
export type WorkoutSetLog = typeof workoutSetLogs.$inferSelect;
export type NewWorkoutSetLog = typeof workoutSetLogs.$inferInsert;
