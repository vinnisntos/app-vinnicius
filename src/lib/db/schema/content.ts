import { sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const faqItems = pgTable("faq_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category"),
  orderIndex: smallint("order_index").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

/**
 * Catálogo de tooltips por chave hierárquica: '<tabela>.<coluna>',
 * 'route.<rota>' ou 'metric.<nome>' (ex. 'meal_logs.calories').
 */
export const helpTooltips = pgTable("help_tooltips", {
  key: text("key").primaryKey(),
  title: text("title"),
  body: text("body").notNull(),
  faqItemId: uuid("faq_item_id").references(() => faqItems.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type FaqItem = typeof faqItems.$inferSelect;
export type HelpTooltip = typeof helpTooltips.$inferSelect;

/** Dicas / mentoria — conteúdo curado pelo master. */
export const tips = pgTable("tips", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull(), // alimentacao|treino|medicacao|mentalidade|comunidade|app
  readMinutes: smallint("read_minutes").notNull().default(2),
  isPublished: boolean("is_published").notNull().default(true),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().default(sql`now()`),
  authorId: uuid("author_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type Tip = typeof tips.$inferSelect;
