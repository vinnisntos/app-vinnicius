import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth";

/** Configurações do usuário para o cálculo de TDEE — uma linha por usuário. */
export const nutritionProfile = pgTable("nutrition_profile", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  sex: text("sex").notNull(), // 'M' | 'F' — check constraint na migration
  birthDate: date("birth_date").notNull(),
  heightCm: numeric("height_cm", { precision: 5, scale: 1 }).notNull(),
  activityLevel: text("activity_level").notNull(), // sedentario|leve|moderado|ativo|muito_ativo
  formula: text("formula").notNull().default("mifflin_st_jeor"),
  calorieGoal: numeric("calorie_goal", { precision: 6, scale: 1 })
    .notNull()
    .default("2500"),
  waterGoalMl: integer("water_goal_ml").notNull().default(3000),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const weightLogs = pgTable(
  "weight_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    loggedAt: date("logged_at").notNull(),
    weightKg: numeric("weight_kg", { precision: 5, scale: 2 }).notNull(),
  },
  (table) => [
    uniqueIndex("weight_logs_user_date_key").on(table.userId, table.loggedAt),
  ],
);

export const mealLogs = pgTable(
  "meal_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    mealSlot: text("meal_slot").notNull(), // cafe_da_manha|almoco|lanche|jantar|ceia
    description: text("description"),
    calories: numeric("calories", { precision: 6, scale: 1 }),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("meal_logs_user_date_slot_key").on(
      table.userId,
      table.logDate,
      table.mealSlot,
    ),
  ],
);

export const waterLogs = pgTable("water_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  logDate: date("log_date").notNull(),
  amountMl: integer("amount_ml").notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type NutritionProfile = typeof nutritionProfile.$inferSelect;
export type WeightLog = typeof weightLogs.$inferSelect;
export type MealLog = typeof mealLogs.$inferSelect;
export type NewMealLog = typeof mealLogs.$inferInsert;
export type WaterLog = typeof waterLogs.$inferSelect;
