import { sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth";

/**
 * Estado de acesso do assinante (1:1 com auth.users). Escrita só por master
 * (painel admin) ou pelo webhook Asaas. A decisão de acesso NÃO deve ser
 * reimplementada no app — use `get_access_status(user_id)` (0003).
 */
export const subscriptions = pgTable("subscriptions", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("trialing"), // trialing|active|past_due|canceled|revoked
  // Coluna gerada no banco (status = 'active') — nunca escrever nela.
  isActiveSubscription: boolean("is_active_subscription").generatedAlwaysAs(
    sql`(status = 'active')`,
  ),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  asaasCustomerId: text("asaas_customer_id").unique(),
  asaasSubscriptionId: text("asaas_subscription_id").unique(),
  approvedBy: uuid("approved_by").references(() => authUsers.id, {
    onDelete: "set null",
  }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

/** Configuração global do SaaS — linha única (id = true). */
export const appSettings = pgTable("app_settings", {
  id: boolean("id").primaryKey().default(true),
  trialDays: smallint("trial_days").notNull().default(3),
  supportWhatsapp: text("support_whatsapp"),
  supportWhatsappMessage: text("support_whatsapp_message"),
  asaasCheckoutUrl: text("asaas_checkout_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
