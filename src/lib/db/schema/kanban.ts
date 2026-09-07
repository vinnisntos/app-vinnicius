import { sql } from "drizzle-orm";
import {
  date,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth";

export const kanbanColumns = pgTable("kanban_columns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  orderIndex: smallint("order_index").notNull().default(0),
});

export const kanbanCards = pgTable("kanban_cards", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  columnId: uuid("column_id")
    .notNull()
    .references(() => kanbanColumns.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // faculdade|estagio|projeto_pessoal
  priority: text("priority").notNull().default("media"), // baixa|media|alta
  dueDate: date("due_date"),
  orderIndex: smallint("order_index").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type KanbanColumn = typeof kanbanColumns.$inferSelect;
export type KanbanCard = typeof kanbanCards.$inferSelect;
export type NewKanbanCard = typeof kanbanCards.$inferInsert;
