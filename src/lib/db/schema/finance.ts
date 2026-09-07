import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth";

export const financeCategories = pgTable("finance_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // 'receita' | 'despesa'
  color: text("color").notNull().default("#a855f7"),
});

export const financeTransactions = pgTable("finance_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => financeCategories.id, {
    onDelete: "set null",
  }),
  type: text("type").notNull(), // receita_fixa | receita_variavel | despesa
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  occurredOn: date("occurred_on").notNull(),
  isRecurring: boolean("is_recurring").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type FinanceCategory = typeof financeCategories.$inferSelect;
export type FinanceTransaction = typeof financeTransactions.$inferSelect;
export type NewFinanceTransaction = typeof financeTransactions.$inferInsert;
