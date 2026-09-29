import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth";

/**
 * Medicação/peptídeos — o app REGISTRA a prescrição do médico; nenhum
 * código deste projeto calcula ou sugere dose (docs/escopo-produto.md).
 */
export const medications = pgTable("medications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull().default("glp1"), // glp1|peptideo|hormonal|outro
  route: text("route").notNull().default("subcutanea"),
  doseAmount: numeric("dose_amount", { precision: 8, scale: 3 }),
  doseUnit: text("dose_unit").notNull().default("mg"),
  frequency: text("frequency").notNull().default("semanal"), // diaria|semanal|quinzenal|personalizada
  daysOfWeek: smallint("days_of_week").array(),
  startedOn: date("started_on"),
  isActive: boolean("is_active").notNull().default(true),
  prescribedBy: text("prescribed_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const medicationLogs = pgTable("medication_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  medicationId: uuid("medication_id")
    .notNull()
    .references(() => medications.id, { onDelete: "cascade" }),
  logDate: date("log_date").notNull(),
  takenAt: timestamp("taken_at", { withTimezone: true }).notNull().default(sql`now()`),
  doseAmount: numeric("dose_amount", { precision: 8, scale: 3 }),
  doseUnit: text("dose_unit"),
  injectionSite: text("injection_site"),
  sideEffects: text("side_effects").array().notNull().default(sql`'{}'::text[]`),
  severity: smallint("severity").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export const bodyMeasurements = pgTable(
  "body_measurements",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    loggedAt: date("logged_at").notNull(),
    waistCm: numeric("waist_cm", { precision: 5, scale: 1 }),
    hipCm: numeric("hip_cm", { precision: 5, scale: 1 }),
    chestCm: numeric("chest_cm", { precision: 5, scale: 1 }),
    armCm: numeric("arm_cm", { precision: 5, scale: 1 }),
    thighCm: numeric("thigh_cm", { precision: 5, scale: 1 }),
    neckCm: numeric("neck_cm", { precision: 5, scale: 1 }),
    bodyFatPct: numeric("body_fat_pct", { precision: 4, scale: 1 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [unique("body_measurements_user_id_logged_at_key").on(table.userId, table.loggedAt)],
);

export type Medication = typeof medications.$inferSelect;
export type MedicationLog = typeof medicationLogs.$inferSelect;
export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
