import { sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth";
import { mealLogs } from "./nutrition";

/**
 * Feed da comunidade. `userId` é o autor. Via Drizzle a RLS não se aplica:
 * o repository do feed precisa filtrar `visibility = 'public' and not
 * is_hidden` explicitamente para posts de terceiros.
 */
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  mealLogId: uuid("meal_log_id").references(() => mealLogs.id, {
    onDelete: "set null",
  }),
  body: text("body"),
  visibility: text("visibility").notNull().default("public"), // public|private
  isHidden: boolean("is_hidden").notNull().default(false), // moderação (master)
  hiddenReason: text("hidden_reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const postReactions = pgTable(
  "post_reactions",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("apoio"), // apoio|forca|inspirador
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })],
);

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostReaction = typeof postReactions.$inferSelect;
