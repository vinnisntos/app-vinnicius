import { sql } from "drizzle-orm";
import {
  boolean,
  jsonb,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth";

/** Log idempotente de webhooks do Asaas — PK é o id do evento ("evt_..."). */
export const asaasWebhookEvents = pgTable("asaas_webhook_events", {
  id: text("id").primaryKey(),
  event: text("event").notNull(),
  paymentId: text("payment_id"),
  asaasSubscriptionId: text("asaas_subscription_id"),
  userId: uuid("user_id").references(() => authUsers.id, { onDelete: "set null" }),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  error: text("error"),
});

/** Refresh token cifrado (AES-256-GCM) — nunca exposto fora do server. */
export const googleCalendarConnections = pgTable("google_calendar_connections", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  googleEmail: text("google_email"),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
  scope: text("scope").notNull(),
  calendarId: text("calendar_id").notNull().default("primary"),
  connectedAt: timestamp("connected_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const calendarReminders = pgTable(
  "calendar_reminders",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // treino|refeicoes|agua|pesagem
    title: text("title").notNull(),
    daysOfWeek: smallint("days_of_week").array().notNull(), // 0=dom … 6=sáb
    localTime: time("local_time").notNull(), // "HH:MM:SS"
    durationMinutes: smallint("duration_minutes").notNull().default(30),
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),
    googleEventId: text("google_event_id"),
    isActive: boolean("is_active").notNull().default(true),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    lastSyncError: text("last_sync_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [unique("calendar_reminders_user_id_kind_key").on(table.userId, table.kind)],
);

export type CalendarReminder = typeof calendarReminders.$inferSelect;
export type GoogleCalendarConnection = typeof googleCalendarConnections.$inferSelect;
