import { sql } from "drizzle-orm";
import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./auth";

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  role: text("role").notNull().default("user"), // 'master' | 'user' — só master altera (trigger)
  email: text("email"), // cópia de auth.users.email, sincronizada por trigger
  phone: text("phone"), // só dígitos, catálogo
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  medicationStatus: text("medication_status"), // usa|nao_usa|vai_comecar
  healthConsentAt: timestamp("health_consent_at", { withTimezone: true }),
  healthConsentVersion: text("health_consent_version"),
  signupUtm: jsonb("signup_utm"),
  soundEnabled: boolean("sound_enabled").notNull().default(true),
  hapticsEnabled: boolean("haptics_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
