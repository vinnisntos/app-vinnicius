import { sql } from "drizzle-orm";
import { boolean, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./auth";
import { mealLogs } from "./nutrition";

/** Catálogo de alimentos (TACO aproximado) — leitura para assinantes. */
export const foods = pgTable("foods", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  portionLabel: text("portion_label").notNull(),
  portionG: numeric("portion_g", { precision: 6, scale: 1 }).notNull(),
  kcal: numeric("kcal", { precision: 6, scale: 1 }).notNull(),
  proteinG: numeric("protein_g", { precision: 5, scale: 1 }).notNull(),
  carbsG: numeric("carbs_g", { precision: 5, scale: 1 }).notNull(),
  fatG: numeric("fat_g", { precision: 5, scale: 1 }).notNull(),
  source: text("source").notNull(),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

/**
 * Item de uma refeição. Os totais de `meal_logs` são recalculados por
 * trigger (0005) — nunca somar no app.
 */
export const mealLogItems = pgTable("meal_log_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  mealLogId: uuid("meal_log_id")
    .notNull()
    .references(() => mealLogs.id, { onDelete: "cascade" }),
  foodId: uuid("food_id").references(() => foods.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  servings: numeric("servings", { precision: 5, scale: 2 }).notNull(),
  kcal: numeric("kcal", { precision: 7, scale: 1 }).notNull(),
  proteinG: numeric("protein_g", { precision: 6, scale: 1 }).notNull(),
  carbsG: numeric("carbs_g", { precision: 6, scale: 1 }).notNull(),
  fatG: numeric("fat_g", { precision: 6, scale: 1 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type Food = typeof foods.$inferSelect;
export type MealLogItem = typeof mealLogItems.$inferSelect;
